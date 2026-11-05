/* The product page and its case study read the same aggregate backend counter.
   No local estimate, download increment, visitor identifier or seeded value. */
const endpoint = '/api/glikemia/downloads';
const selector = '[data-download-count]';

export function createDownloadCounter({nodes, fetchJSON, format = value => new Intl.NumberFormat('pl-PL').format(value)}) {
  let pending = null;
  const render = (state, text) => nodes.forEach(node => {
    node.dataset.downloadState = state;
    node.textContent = text;
  });
  function refresh() {
    if (pending) return pending;
    render('loading', 'Licznik pobrań: ładowanie…');
    pending = (async () => {
      try {
        const data = await Promise.resolve().then(() => fetchJSON(endpoint));
        if (!data || !Number.isSafeInteger(data.downloads) || data.downloads < 0) throw new Error('invalid_count');
        render('ready', `${format(data.downloads)} pobrań APK`);
        return data.downloads;
      } catch {
        render('error', 'Licznik pobrań chwilowo niedostępny');
        return null;
      } finally { pending = null; }
    })();
    return pending;
  }
  return {refresh};
}

export function mountDownloadCounters(root = document) {
  const nodes = [...root.querySelectorAll(selector)];
  if (!nodes.length) return null;
  const view = root.defaultView || window;
  const controller = createDownloadCounter({nodes, fetchJSON: async path => {
    const result = await view.fetch(path, {cache:'no-store', credentials:'omit',
      signal: view.AbortSignal.timeout(10000)});
    if (!result.ok) throw new Error('counter_unavailable');
    return result.json();
  }});
  const timers = new Set();
  let lastRefresh = -Infinity;
  const refresh = () => {
    const now = view.performance.now();
    if (now - lastRefresh < 800) return;
    lastRefresh = now;
    controller.refresh();
  };
  const cancel = () => { timers.forEach(timer => view.clearTimeout(timer)); timers.clear(); };
  const onDownload = event => {
    if (!event.target.closest('a[href="/download/glikemia-premium"]')) return;
    // A real transfer finishes asynchronously; only the server increments it.
    cancel();
    [4000,12000,30000].forEach(delay => {
      const timer = view.setTimeout(() => { timers.delete(timer); refresh(); }, delay);
      timers.add(timer);
    });
  };
  const onVisible = () => { if (!root.hidden) refresh(); };
  view.addEventListener('pageshow', refresh);
  view.addEventListener('pagehide', cancel);
  root.addEventListener('visibilitychange', onVisible);
  root.addEventListener('click', onDownload);
  refresh();
  return {refresh, dispose() {
    cancel();
    view.removeEventListener('pageshow', refresh);
    view.removeEventListener('pagehide', cancel);
    root.removeEventListener('visibilitychange', onVisible);
    root.removeEventListener('click', onDownload);
  }};
}

if (typeof document !== 'undefined') mountDownloadCounters();
