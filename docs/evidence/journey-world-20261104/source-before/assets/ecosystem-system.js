/* Progressive roadmap selection; all displayed copy comes from the approved HTML. */
(() => {
  'use strict';

  const identifiers = ['tax', 'translator', 'agents', 'voice', 'mail', 'messenger'];

  document.querySelectorAll('[data-ecosystem-system]').forEach(root => {
    const map = root.querySelector('[data-ecosystem-map]');
    const panel = root.querySelector('[data-ecosystem-console]');
    const wires = root.querySelector('[data-ecosystem-wires]');
    if (!map || !panel || !wires || map.dataset.ecosystemReady === 'true') return;

    const records = identifiers.map(identifier => {
      const node = Array.from(map.querySelectorAll('[data-ecosystem-node]')).find(item => item.dataset.ecosystemNode === identifier);
      if (!node) return null;
      const button = node.querySelector('[data-ecosystem-select]');
      const detail = node.querySelector('.ecosystem-node__detail');
      const name = node.querySelector('.ecosystem-node__name');
      const status = node.querySelector('.delivery-state');
      if (!button || !detail || !name || !status || button.dataset.ecosystemSelect !== identifier || button.getAttribute('aria-controls') !== detail.id) return null;
      const stages = new Map([['W rozwoju', 'development'], ['Prototyp', 'prototype'], ['Wersja testowa', 'testing'], ['Planowane', 'planned']]);
      const stage = stages.get(status.textContent.trim()) || 'unconfirmed';
      return { identifier, node, button, detail, name, status, stage, next: detail.nextSibling };
    });
    if (records.some(record => !record)) return;

    const consoleName = document.createElement('p');
    consoleName.className = 'ecosystem-console__name';
    const consoleStatus = document.createElement('p');
    consoleStatus.className = 'ecosystem-console__state';
    const nameText = document.createTextNode('');
    const statusText = document.createTextNode('');
    consoleName.append(nameText); consoleStatus.append(statusText);

    const byIdentifier = new Map(records.map(record => [record.identifier, record]));
    const edges = Array.from(wires.querySelectorAll('[data-ecosystem-edge]')).filter(edge =>
      byIdentifier.has(edge.dataset.from) && byIdentifier.has(edge.dataset.to) && edge.dataset.integrationStatus === 'planned');
    const mobile = window.matchMedia('(max-width:900px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion:reduce)');
    const motionToggle = document.querySelector('[data-showroom-motion-toggle]');
    const readGlobalPause = () => document.documentElement.dataset.interfaceMotion === 'paused' ||
      (motionToggle && motionToggle.getAttribute('aria-pressed') === 'true');
    let globalPaused = Boolean(readGlobalPause());
    let selected = 'tax';
    let previewed = null;
    let inView = typeof IntersectionObserver === 'undefined';
    let geometryDirty = true;
    let geometryFrame = 0;

    function restoreDetail(record) {
      if (record.detail.parentNode === record.node) return;
      const next = record.next && record.next.parentNode === record.node ? record.next : null;
      record.node.insertBefore(record.detail, next);
    }

    function syncMotion() {
      const activeIdentifier = previewed || selected;
      const running = Boolean(activeIdentifier) && inView && !document.hidden && !reducedMotion.matches && !globalPaused;
      map.dataset.motionState = running ? 'running' : 'paused';
      map.classList.toggle('has-preview', Boolean(previewed));
      const related = new Set([activeIdentifier]);
      for (const edge of edges) {
        if (edge.dataset.from === activeIdentifier) related.add(edge.dataset.to);
        if (edge.dataset.to === activeIdentifier) related.add(edge.dataset.from);
      }
      records.forEach(record => {
        record.node.classList.toggle('is-previewed', record.identifier === previewed);
        record.node.classList.toggle('is-related', related.has(record.identifier));
      });
      let animated = 0;
      const flowLimit = mobile.matches || document.documentElement.dataset.interfaceQuality === 'compact' ? 1 : 2;
      edges.forEach(edge => {
        const active = Boolean(activeIdentifier) && (edge.dataset.from === activeIdentifier || edge.dataset.to === activeIdentifier) && animated < flowLimit;
        edge.classList.toggle('is-flowing', active);
        if (active) animated += 1;
      });
    }

    const point = value => Math.round(value * 10) / 10;
    const coordinate = (x, y) => `${point(x)} ${point(y)}`;

    function drawGeometry() {
      if (!map.isConnected) return;
      const bounds = map.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      wires.setAttribute('viewBox', `0 0 ${point(bounds.width)} ${point(bounds.height)}`);
      const rects = new Map(records.map(record => {
        const rect = record.button.getBoundingClientRect();
        return [record.identifier, {
          left: rect.left - bounds.left, right: rect.right - bounds.left,
          top: rect.top - bounds.top, bottom: rect.bottom - bounds.top,
          x: rect.left - bounds.left + rect.width / 2,
          y: rect.top - bounds.top + rect.height / 2,
        }];
      }));
      const panelRect = !panel.hidden ? panel.getBoundingClientRect() : null;
      edges.forEach(edge => {
        const from = rects.get(edge.dataset.from);
        const to = rects.get(edge.dataset.to);
        let path;
        if (mobile.matches) {
          const branch = edge.dataset.ecosystemEdge === 'tax-mail';
          const gutter = branch ? bounds.width - 7 : 7;
          const startX = branch ? from.right : from.left;
          const endX = branch ? to.right : to.left;
          path = `M ${coordinate(startX, from.y)} H ${point(gutter)} V ${point(to.y)} H ${point(endX)}`;
        } else if (edge.dataset.ecosystemEdge === 'tax-mail') {
          path = `M ${coordinate(from.left, from.y)} H 10 V ${point(to.y)} H ${point(to.left)}`;
        } else if (edge.dataset.ecosystemEdge === 'translator-agents') {
          const busY = Math.min(from.bottom + 36, to.top - 30);
          const elbowX = to.right + 22;
          path = `M ${coordinate(from.x, from.bottom)} V ${point(busY)} H ${point(elbowX)} V ${point(to.y)} H ${point(to.right)}`;
        } else if (edge.dataset.ecosystemEdge === 'agents-voice') {
          const panelBottom = panelRect ? panelRect.bottom - bounds.top : 0;
          const busY = Math.max(from.bottom, to.bottom, panelBottom) + 32;
          path = `M ${coordinate(from.right, from.y)} H ${point(from.right + 20)} V ${point(busY)} H ${point(to.left - 20)} V ${point(to.y)} H ${point(to.left)}`;
        } else {
          const midX = (from.right + to.left) / 2;
          path = `M ${coordinate(from.right, from.y)} H ${point(midX)} V ${point(to.y)} H ${point(to.left)}`;
        }
        edge.setAttribute('d', path);
      });
    }

    function scheduleGeometry() {
      geometryDirty = true;
      if (geometryFrame || document.hidden || !inView) return;
      geometryFrame = requestAnimationFrame(() => {
        geometryFrame = 0;
        if (document.hidden || !inView) return;
        geometryDirty = false;
        drawGeometry();
      });
    }

    function renderSelection() {
      const active = byIdentifier.get(selected);
      records.forEach(record => {
        restoreDetail(record);
        const current = record === active;
        record.detail.hidden = !current;
        record.button.setAttribute('aria-expanded', String(current));
        record.button.setAttribute('aria-pressed', String(current));
        record.node.classList.toggle('is-selected', current);
      });
      panel.replaceChildren();
      panel.hidden = !active || mobile.matches;
      panel.dataset.ecosystemStage = active ? active.stage : '';
      if (active && !mobile.matches) {
        nameText.nodeValue = active.name.textContent;
        statusText.nodeValue = active.status.textContent;
        panel.append(consoleName, consoleStatus, active.detail);
      }
      map.dataset.selectedNode = selected || '';
      syncMotion();
      scheduleGeometry();
    }

    records.forEach((record, index) => {
      record.node.dataset.ecosystemStage = record.stage;
      const preview = () => { previewed = record.identifier; syncMotion(); };
      const restore = () => { previewed = null; syncMotion(); };
      record.button.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') preview(); });
      record.button.addEventListener('pointerleave', restore);
      record.button.addEventListener('focus', preview);
      record.button.addEventListener('blur', restore);
      record.button.addEventListener('click', () => {
        selected = record.identifier;
        renderSelection();
      });
      record.button.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + records.length - 1) % records.length;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % records.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = records.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        records[next].button.focus();
      });
    });

    root.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !selected) return;
      const previous = byIdentifier.get(selected);
      selected = null;
      renderSelection();
      event.preventDefault();
      event.stopPropagation();
      previous.button.focus({ preventScroll: true });
    });

    const onMediaChange = (media, callback) => {
      if (typeof media.addEventListener === 'function') media.addEventListener('change', callback);
      else if (typeof media.addListener === 'function') media.addListener(callback);
    };
    onMediaChange(mobile, renderSelection);
    onMediaChange(reducedMotion, syncMotion);
    window.addEventListener('progresskit:motionchange', event => {
      globalPaused = event.detail && typeof event.detail.paused === 'boolean' ? event.detail.paused : Boolean(readGlobalPause());
      syncMotion();
    });
    document.addEventListener('visibilitychange', () => {
      syncMotion();
      if (document.hidden && geometryFrame) {
        cancelAnimationFrame(geometryFrame);
        geometryFrame = 0;
      } else if (!document.hidden && geometryDirty) scheduleGeometry();
    });

    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(entries => {
        const entry = entries.find(item => item.target === map);
        if (!entry) return;
        inView = entry.isIntersecting;
        syncMotion();
        if (!inView && geometryFrame) {
          cancelAnimationFrame(geometryFrame);
          geometryFrame = 0;
        } else if (inView && geometryDirty) scheduleGeometry();
      }, { threshold: 0.01 });
      observer.observe(map);
    }
    if (typeof ResizeObserver !== 'undefined') {
      const resize = new ResizeObserver(scheduleGeometry);
      resize.observe(map);
      resize.observe(panel);
      records.forEach(record => resize.observe(record.node));
    } else window.addEventListener('resize', scheduleGeometry);

    map.dataset.ecosystemReady = 'true';
    map.classList.add('is-enhanced');
    renderSelection();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleGeometry);
  });
})();
