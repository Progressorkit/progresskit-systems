'use strict';

// Pure matching rules are shared by the UI and regression tests.
const CatalogFilters = {
  normalize(value) {
    return String(value).toLocaleLowerCase('pl-PL').replace(/ł/g, 'l').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  },
  matches(project, state) {
    const words = this.normalize(state.q || '').trim().split(/\s+/).filter(Boolean);
    return (!state.category || project.category === state.category)
      && (!state.technology || project.technologies.includes(state.technology))
      && (!state.stage || (state.stage === 'unverified' ? !project.stage : project.stage === state.stage))
      && words.every(word => this.normalize(project.search).includes(word));
  },
  read(url) {
    const params = new URL(url).searchParams;
    return { q: (params.get('q') || '').slice(0, 160), category: params.get('kategoria') || '', technology: params.get('technologia') || '', stage: params.get('etap') || '', project: params.get('projekt') || '' };
  },
  url(url, state) {
    const next = new URL(url);
    for (const [key, field] of [['q','q'], ['kategoria','category'], ['technologia','technology'], ['etap','stage'], ['projekt','project']]) {
      if (state[field]) next.searchParams.set(key, state[field]);
      else next.searchParams.delete(key);
    }
    return next;
  },
  setOpenProject(cards, id) {
    cards.forEach(card => { card.details.open = card.id === id && !card.node.hidden; });
  },
  categoryPointerAllowed({ finePointer, pointerType }) {
    return finePointer && pointerType !== 'touch';
  },
  categoryHover({ finePointer, rows, pointerType, focusedOther = false }) {
    return this.categoryPointerAllowed({finePointer,pointerType}) && rows === 1 && !focusedOther;
  },
  categoryClick({ detail, hoverOpened, isOpen }) {
    return detail > 0 && hoverOpened && isOpen ? 'pin' : 'native';
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = CatalogFilters;

if (typeof document !== 'undefined') {
  const menuButton = document.querySelector('.menu-btn');
  const mobileMenu = document.querySelector('#mobile-menu');
  const closeMenu = () => {
    mobileMenu.hidden = true;
    mobileMenu.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  };
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    mobileMenu.hidden = !open;
    mobileMenu.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
  });
  mobileMenu?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
      closeMenu(); menuButton.focus();
    }
  });
  window.matchMedia('(min-width:1101px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

  document.querySelectorAll('[data-js-only]').forEach(node => { node.hidden = false; });
  const categoryBrowser = document.querySelector('.category-browser');
  if (categoryBrowser) {
    const slots = [...categoryBrowser.querySelectorAll('.category-slot')];
    const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)');
    let closeTimer;
    let hoverOpened;
    let pinnedSlot;
    const syncPresentation = () => {
      const open = slots.find(slot => slot.open);
      if (pinnedSlot && !pinnedSlot.open) pinnedSlot = null;
      categoryBrowser.classList.toggle('has-open-category', Boolean(open));
      categoryBrowser.classList.toggle('has-pinned-category', Boolean(open && pinnedSlot === open));
      categoryBrowser.dataset.activeCategory = open?.dataset.category || '';
      categoryBrowser.dataset.worldState = open ? (pinnedSlot === open ? 'pinned' : 'hover') : 'idle';
      const selected = new URL(location.href).searchParams.get('projekt');
      for (const slot of slots) {
        slot.querySelector('summary').setAttribute('aria-expanded', String(slot.open));
        slot.querySelectorAll('.category-project').forEach(project => {
          project.classList.toggle('is-selected', slot.open && project.dataset.id === selected);
        });
      }
    };
    const syncCategoryUrl = () => {
      const open = slots.find(slot => slot.open);
      const url = new URL(location.href);
      if (open) url.searchParams.set('kategoria', open.dataset.category);
      else url.searchParams.delete('kategoria');
      const selected = url.searchParams.get('projekt');
      if (!open || ![...open.querySelectorAll('.category-project')].some(project => project.dataset.id === selected)) url.searchParams.delete('projekt');
      if (url.href !== location.href) history.replaceState(null, '', url);
      syncPresentation();
    };
    const closePanels = (restoreFocus = false) => {
      clearTimeout(closeTimer);
      const open = slots.find(slot => slot.open);
      slots.forEach(slot => { slot.open = false; });
      hoverOpened = null;
      pinnedSlot = null;
      if (restoreFocus) open?.querySelector('summary').focus();
      syncCategoryUrl();
    };
    const openPanel = (slot, pin = false) => {
      clearTimeout(closeTimer);
      const focusedOther = slots.some(other => other !== slot && other.querySelector('.category-panel').contains(document.activeElement));
      if (pinnedSlot !== slot) pinnedSlot = null;
      if (pin) { pinnedSlot = slot; hoverOpened = null; }
      slots.forEach(other => { other.open = other === slot; });
      if (focusedOther) slot.querySelector('summary').focus();
      syncCategoryUrl();
    };
    for (const slot of slots) {
      const summary = slot.querySelector('summary');
      summary.setAttribute('aria-expanded', String(slot.open));
      summary.addEventListener('pointerenter', event => {
        const rows = new Set(slots.map(other => Math.round(other.querySelector('summary').getBoundingClientRect().top))).size;
        const focusedOther = slots.some(other => other !== slot && other.open && other.querySelector('.category-panel').contains(document.activeElement));
        if (CatalogFilters.categoryHover({finePointer:finePointer.matches, rows, pointerType:event.pointerType, focusedOther}) && !slot.open) { hoverOpened = slot; openPanel(slot); }
        clearTimeout(closeTimer);
      });
      summary.addEventListener('click', event => {
        // Pointer activation pins a hover preview. Keyboard activation retains the
        // native summary toggle; a closed category becomes pinned when activated.
        if (CatalogFilters.categoryClick({detail:event.detail, hoverOpened:hoverOpened === slot, isOpen:slot.open}) === 'pin') {
          event.preventDefault(); pinnedSlot = slot;
        } else if (slot.open) {
          if (pinnedSlot === slot) pinnedSlot = null;
        } else {
          pinnedSlot = slot;
        }
        hoverOpened = null;
        syncPresentation();
      });
      summary.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown') {
          event.preventDefault(); openPanel(slot, true); slot.querySelector('.category-project__link')?.focus();
        } else if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const index = slots.indexOf(slot);
          const target = event.key === 'Home' ? slots[0] : event.key === 'End' ? slots[slots.length - 1]
            : slots[(index + (event.key === 'ArrowRight' ? 1 : -1) + slots.length) % slots.length];
          if (slot.open) openPanel(target, true);
          target.querySelector('summary').focus();
        }
      });
      slot.addEventListener('toggle', () => {
        if (slot.open) slots.forEach(other => { if (other !== slot) other.open = false; });
        if (slot.open && hoverOpened !== slot && !pinnedSlot) pinnedSlot = slot;
        if (!slot.open && hoverOpened === slot) hoverOpened = null;
        syncCategoryUrl();
      });
      slot.querySelector('[data-category-close]').addEventListener('click', () => closePanels(true));
    }
    categoryBrowser.addEventListener('pointerenter', () => clearTimeout(closeTimer));
    categoryBrowser.addEventListener('pointerleave', event => {
      if (!CatalogFilters.categoryPointerAllowed({finePointer:finePointer.matches,pointerType:event.pointerType})) return;
      closeTimer = setTimeout(() => {
        const focusedWithin = slots.some(slot => slot.open && slot.contains(document.activeElement));
        if (!pinnedSlot?.open && !focusedWithin) closePanels();
      }, 180);
    });
    categoryBrowser.addEventListener('focusout', () => {
      setTimeout(() => { if (!categoryBrowser.contains(document.activeElement)) closePanels(); }, 0);
    });
    document.addEventListener('pointerdown', event => {
      if (!categoryBrowser.contains(event.target)) {
        const focusedPanel = slots.some(slot => slot.querySelector('.category-panel').contains(document.activeElement));
        const outsideControl = event.target.closest('a,button,input,select,textarea,summary,[contenteditable="true"],[tabindex]:not([tabindex="-1"])');
        closePanels(focusedPanel && !outsideControl);
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && slots.some(slot => slot.open)) { event.preventDefault(); closePanels(true); }
    });
    const restoreCategory = () => {
      const params = new URLSearchParams(location.search);
      const id = params.get('projekt');
      const project = [...categoryBrowser.querySelectorAll('.category-project')].find(node => node.dataset.id === id);
      const selected = project?.closest('.category-slot') || slots.find(slot => slot.dataset.category === params.get('kategoria'));
      if (selected) openPanel(selected, true);
      else { pinnedSlot = null; hoverOpened = null; slots.forEach(slot => { slot.open = false; }); syncPresentation(); }
    };
    restoreCategory();
    window.addEventListener('popstate', restoreCategory);
  }
  // Preserve bookmarked search URLs for both the earlier panels and the showroom.
  if (categoryBrowser || document.querySelector('[data-showroom]')) {
    const params = new URLSearchParams(location.search);
    if (['q','technologia','etap'].some(key => params.get(key))) {
      const target = new URL('projekty/', location.href); target.search = location.search; target.hash = '#projekty';
      location.replace(target.href);
    }
  }

  // Reveal is an enhancement: no class hides content unless an observer exists.
  // Focus, reduced motion and observer errors all expose the content immediately.
  const revealNodes = [...document.querySelectorAll('[data-reveal]')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion:reduce)');
  if (revealNodes.length && typeof window.IntersectionObserver === 'function' && !reducedMotion.matches) {
    let revealObserver;
    const reveal = node => {
      node.classList.remove('reveal-pending'); node.classList.add('is-revealed');
      revealObserver?.unobserve(node);
    };
    const revealAll = () => { revealObserver?.disconnect(); revealNodes.forEach(reveal); };
    try {
      revealObserver = new window.IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); });
      }, { threshold:0.08, rootMargin:'0px 0px -20px 0px' });
      revealNodes.forEach(node => {
        const bounds = node.getBoundingClientRect();
        if (bounds.top < window.innerHeight && bounds.bottom > 0) return;
        node.classList.add('reveal-pending'); revealObserver.observe(node);
        node.addEventListener('focusin', () => reveal(node), {once:true});
      });
      reducedMotion.addEventListener('change', event => { if (event.matches) revealAll(); });
    } catch (error) {
      revealAll(); console.debug('ProgressKit: scroll reveal disabled.', error.name);
    }
  }

  const form = document.querySelector('#catalog-filters');
  if (form) {
    const cards = [...document.querySelectorAll('.catalog-card')].map(node => ({
      node, id: node.dataset.id, category: node.dataset.category,
      stage: node.dataset.stage, technologies: JSON.parse(node.dataset.technologies), search: node.dataset.search,
      details: node.querySelector('details'),
    }));
    const categories = [...document.querySelectorAll('[data-filter-category]')];
    const search = document.querySelector('#project-search');
    const technology = document.querySelector('#technology-filter');
    const stage = document.querySelector('#stage-filter');
    const results = document.querySelector('#catalog-results');
    const empty = document.querySelector('#catalog-empty');
    let state = CatalogFilters.read(location.href);
    let searchTimer;
    const syncUrl = () => history.replaceState(null, '', CatalogFilters.url(location.href, state));

    function applyFilters(updateUrl = true) {
      let visible = 0;
      for (const card of cards) {
        card.node.hidden = !CatalogFilters.matches(card, state);
        if (!card.node.hidden) visible++;
      }
      if (state.project && !cards.some(c => c.id === state.project && !c.node.hidden)) state.project = '';
      CatalogFilters.setOpenProject(cards, state.project);
      categories.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filterCategory === state.category)));
      results.textContent = `Wyniki: ${visible} z ${cards.length}${state.category ? ` · ${categories.find(b => b.dataset.filterCategory === state.category)?.querySelector('.category__label').textContent || ''}` : ''}`;
      empty.hidden = visible !== 0;
      if (updateUrl) syncUrl();
    }
    function restore() {
      state = CatalogFilters.read(location.href);
      if (!cards.some(c => c.category === state.category)) state.category = '';
      if (![...technology.options].some(option => option.value === state.technology)) state.technology = '';
      if (![...stage.options].some(option => option.value === state.stage)) state.stage = '';
      const selected = cards.find(c => c.id === state.project);
      if (!selected) state.project = '';
      // A direct project link always reveals its target, including an outdated filter link.
      if (selected && !CatalogFilters.matches(selected, state)) {
        state.q = ''; state.category = ''; state.technology = ''; state.stage = '';
      }
      search.value = state.q; technology.value = state.technology; stage.value = state.stage;
      applyFilters(false);
      for (const card of cards) {
        const details = card.node.querySelector('details');
        details.open = card.id === state.project;
        details.querySelector('summary').setAttribute('aria-expanded', String(details.open));
      }
      if (selected) requestAnimationFrame(() => selected.node.scrollIntoView({ block: 'start', behavior: 'instant' }));
    }
    document.querySelectorAll('[data-js-only]').forEach(node => { node.hidden = false; });
    restore();
    form.addEventListener('submit', event => { event.preventDefault(); clearTimeout(searchTimer); state.q = search.value; applyFilters(); });
    search.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { state.q = search.value; applyFilters(); }, 120);
    });
    technology.addEventListener('change', () => { state.technology = technology.value; applyFilters(); });
    stage.addEventListener('change', () => { state.stage = stage.value; applyFilters(); });
    categories.forEach(button => button.addEventListener('click', () => {
      state.category = state.category === button.dataset.filterCategory ? '' : button.dataset.filterCategory;
      applyFilters();
    }));
    form.addEventListener('reset', event => {
      event.preventDefault(); clearTimeout(searchTimer);
      state = { q:'',category:'',technology:'',stage:'',project:'' };
      search.value = ''; technology.value = ''; stage.value = '';
      cards.forEach(card => { card.node.querySelector('details').open = false; });
      applyFilters();
    });
    for (const card of cards) {
      const details = card.node.querySelector('details');
      const summary = details.querySelector('summary');
      details.addEventListener('toggle', () => {
        summary.setAttribute('aria-expanded', String(details.open));
        if (details.open && !card.node.hidden) state.project = card.id;
        else if (state.project === card.id) state.project = '';
        const before = details.open ? summary.getBoundingClientRect().top : null;
        CatalogFilters.setOpenProject(cards, state.project);
        if (before !== null) {
          const shift = summary.getBoundingClientRect().top - before;
          if (shift) window.scrollBy({top:shift, behavior:'instant'});
        }
        syncUrl();
      });
      details.addEventListener('keydown', event => {
        if (event.key === 'Escape' && details.open) {
          details.open = false; summary.focus(); event.preventDefault();
        }
      });
    }
    window.addEventListener('popstate', restore);
  }

  const dialog = document.querySelector('#gallery-dialog');
  const pictures = [...document.querySelectorAll('[data-gallery-item]')];
  if (dialog && typeof dialog.showModal === 'function' && pictures.length) {
    let current = 0;
    let returnFocus;
    const show = index => {
      current = (index + pictures.length) % pictures.length;
      const link = pictures[current];
      const source = link.querySelector('img');
      const image = dialog.querySelector('#gallery-image');
      image.src = link.href; image.alt = source.alt;
      dialog.querySelector('#gallery-caption').textContent = link.dataset.caption;
      dialog.querySelector('#gallery-position').textContent = `${current + 1} / ${pictures.length}`;
    };
    pictures.forEach((link, index) => link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); returnFocus = link; show(index); dialog.showModal();
      dialog.querySelector('[data-gallery-close]').focus();
    }));
    dialog.querySelector('[data-gallery-close]').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-gallery-prev]').addEventListener('click', () => show(current - 1));
    dialog.querySelector('[data-gallery-next]').addEventListener('click', () => show(current + 1));
    dialog.querySelectorAll('[data-gallery-prev],[data-gallery-next]').forEach(button => { button.hidden = pictures.length < 2; });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1); }
    });
    dialog.addEventListener('close', () => returnFocus?.focus());
  }

  document.querySelector('[data-print]')?.addEventListener('click', () => window.print());
  document.querySelector('[data-download-brief]')?.addEventListener('click', () => {
    const content = ['ProgressKit Systems: opis projektu', ...[...document.querySelectorAll('.brief label')].map(label => `${label.firstChild.textContent.trim()}\n${label.querySelector('textarea').value}\n`), 'Kontakt: pawel@progresskit.pl'].join('\n\n');
    const url = URL.createObjectURL(new Blob([content], {type:'text/plain;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = 'progresskit-brief.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    document.querySelector('[data-brief-status]').textContent = 'Przygotowano lokalny plik briefu.';
  });

  // Retain first-party analytics only on the existing production origin.
  // Queries, brief fields and search input are never included in the payload.
  if (location.origin === 'https://progresskit.pl' && navigator.doNotTrack !== '1') {
    const params = new URLSearchParams(location.search);
    const safeCampaign = key => /^[A-Za-z0-9._-]{1,64}$/.test(params.get(key) || '') ? params.get(key) : null;
    let referrer = null;
    if (document.referrer) {
      try { referrer = new URL(document.referrer).hostname || null; }
      catch (error) { console.debug('ProgressKit: invalid referrer ignored.', error.name); }
    }
    function track(type) {
      const body = JSON.stringify({ event_type:type,path:location.pathname,referrer_host:referrer,utm_source:safeCampaign('utm_source'),utm_medium:safeCampaign('utm_medium'),utm_campaign:safeCampaign('utm_campaign') });
      const failure = () => console.debug('ProgressKit: analytics unavailable.');
      try {
        if (navigator.sendBeacon && navigator.sendBeacon('/_analytics/event', new Blob([body], {type:'application/json'}))) return;
        fetch('/_analytics/event', {method:'POST',headers:{'Content-Type':'application/json'},body,credentials:'omit',keepalive:true}).then(response => { if (!response.ok) failure(); }, failure);
      } catch (error) { failure(); }
    }
    track('page_view');
    document.addEventListener('click', event => {
      if (event.target.closest('a[href^="mailto:"]')) track('contact_click');
      else if (event.target.closest('a[href^="http://"], a[href^="https://"]')) track('external_click');
      if (event.target.closest('.project-drawer > summary, a[href*="projekty/"]:not([data-showroom-open]), a[href="glikemia-premium/"], a[href="/glikemia-premium/"], a[href="progresskit-mail/"], a[href="/progresskit-mail/"]')) track('project_open');
    });
    document.addEventListener('progresskit:hologram-open', () => track('project_open'));
    document.addEventListener('progresskit:slice-open', () => track('project_open'));
  }
}
