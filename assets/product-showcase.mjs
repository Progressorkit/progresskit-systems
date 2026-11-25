// Local presentation only. Product screenshots never connect to application data.
const root = document.querySelector('[data-showcase]');
if (root) {
  const dialog = root.querySelector('.exhibit-lightbox');
  const preview = dialog?.querySelector('img');
  const caption = dialog?.querySelector('figcaption');
  let opener;
  for (const link of root.querySelectorAll('[data-exhibit-expand]')) {
    link.addEventListener('click', event => {
      if (!dialog?.showModal || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const source = link.querySelector('img');
      event.preventDefault();
      opener = link;
      preview.src = link.href;
      preview.alt = source.alt;
      preview.width = source.width;
      preview.height = source.height;
      caption.textContent = link.closest('figure').querySelector('figcaption')?.textContent || source.alt;
      dialog.showModal();
    });
  }
  dialog?.querySelector('[data-exhibit-close]').addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog?.addEventListener('close', () => { preview.removeAttribute('src'); opener?.focus({preventScroll:true}); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) root.querySelectorAll('video').forEach(video => video.pause());
  });
}

// Historic case-study fragment links remain useful after the visual rewrite.
function revealFragment() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  if (!id) return;
  const target = document.getElementById(id);
  if (!target || !root?.contains(target)) return;
  for (let ancestor = target.parentElement; ancestor && ancestor !== root; ancestor = ancestor.parentElement) {
    if (ancestor.tagName === 'DETAILS') ancestor.open = true;
  }
  if (target.tagName === 'DETAILS') target.open = true;
  if (id === 'wyzwania') root.querySelector('.exhibit-evidence').open = true;
  requestAnimationFrame(() => target.scrollIntoView({block:'start',behavior:'instant'}));
}
revealFragment();
addEventListener('hashchange', revealFragment);
