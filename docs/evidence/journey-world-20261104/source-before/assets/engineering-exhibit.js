(function () {
  'use strict';

  function initialize(root) {
    const controls = root.querySelector('[data-engineering-controls]');
    const buttons = [...root.querySelectorAll('[data-engineering-select]')];
    const panels = [...root.querySelectorAll('[data-engineering-case]')];
    const byId = new Map(panels.map(panel => [panel.dataset.engineeringCase, panel]));
    const disclosures = new Map(panels.map(panel => [panel, panel.querySelector('[data-engineering-disclosure]')]));
    if (!controls || !buttons.length || buttons.length !== panels.length
      || buttons.some(button => !byId.has(button.dataset.engineeringSelect))
      || [...disclosures.values()].some(disclosure => !disclosure)) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const horizontal = window.matchMedia('(max-width:1000px)');
    let activeId = '';

    function select(id, {focus = false, animate = true} = {}) {
      const selected = byId.get(id);
      if (!selected) return;
      const changed = activeId !== id;
      activeId = id;
      // Close the old native disclosure before opening the new named disclosure.
      panels.forEach(panel => {
        if (panel !== selected) {
          disclosures.get(panel).open = false;
          panel.hidden = true;
        }
        panel.classList.remove('is-entering');
      });
      selected.hidden = false;
      disclosures.get(selected).open = true;
      panels.forEach(panel => panel.setAttribute('tabindex', panel === selected ? '0' : '-1'));
      for (const button of buttons) {
        const active = button.dataset.engineeringSelect === id;
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
      }
      if (changed && animate && !reduced.matches) selected.classList.add('is-entering');
      if (focus) {
        const button = buttons.find(item => item.dataset.engineeringSelect === id);
        button.focus({preventScroll:true});
        button.scrollIntoView?.({block:'nearest', inline:'nearest', behavior:'auto'});
      }
    }

    controls.setAttribute('role', 'tablist');
    const syncOrientation = () => controls.setAttribute('aria-orientation', horizontal.matches ? 'horizontal' : 'vertical');
    syncOrientation();
    horizontal.addEventListener('change', syncOrientation);
    for (const button of buttons) {
      const id = button.dataset.engineeringSelect;
      const panel = byId.get(id);
      button.setAttribute('role', 'tab');
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', button.id);
      button.addEventListener('click', () => {
        button.focus({preventScroll:true});
        select(id);
      });
      button.addEventListener('keydown', event => {
        const arrows = horizontal.matches ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];
        const keys = [...arrows, 'Home', 'End'];
        if (!keys.includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
        event.preventDefault();
        const index = buttons.indexOf(button);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
          : (index + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
        select(buttons[next].dataset.engineeringSelect, {focus:true});
      });
    }
    root.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      const panel = event.target.closest('[data-engineering-case]');
      if (!panel || panel.hidden) return;
      const analysis = panel.querySelector('[data-engineering-analysis]');
      event.preventDefault();
      if (analysis?.open) {
        analysis.open = false;
        analysis.querySelector('summary').focus({preventScroll:true});
      } else buttons.find(button => button.dataset.engineeringSelect === activeId)?.focus({preventScroll:true});
    });
    reduced.addEventListener('change', () => panels.forEach(panel => panel.classList.remove('is-entering')));
    root.classList.add('is-enhanced');
    controls.hidden = false;
    const initiallyOpen = panels.find(panel => disclosures.get(panel).open) || panels[0];
    select(initiallyOpen.dataset.engineeringCase, {animate:false});
  }

  const boot = () => document.querySelectorAll('[data-engineering-exhibit]').forEach(initialize);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
}());
