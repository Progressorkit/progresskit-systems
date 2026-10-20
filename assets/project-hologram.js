(function () {
  'use strict';

  const STAGES = new Set(['Koncepcja', 'Prototyp', 'W rozwoju', 'Alpha', 'Beta', 'Dostępny', 'Utrzymywany', 'Wstrzymany', 'Archiwalny']);
  const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const CLOSE_DELAY = 280;
  const text = (value, max = 1200) => typeof value === 'string' ? value.trim().slice(0, max) : '';

  // Only local catalogue routes and local raster media can become attributes.
  function safeLocalUrl(value, base, kind) {
    if (typeof value !== 'string' || !value.trim() || value.length > 1400) return null;
    try {
      const page = new URL(base);
      const url = new URL(value, page);
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== page.origin) return null;
      if (url.username || url.password || url.search || url.hash) return null;
      if (kind === 'project') {
        if (!/(?:^|\/)projekty\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(url.pathname)) return null;
      } else if (kind === 'image') {
        if (!url.pathname.includes('/assets/projects/') || !/\.(?:png|jpe?g|webp|avif)$/i.test(url.pathname)) return null;
      } else return null;
      return url.href;
    } catch (_) {
      return null;
    }
  }

  function normalizeProjects(input, base) {
    const rows = Array.isArray(input) ? input : input && Array.isArray(input.projects) ? input.projects : [];
    const seen = new Set();
    return rows.slice(0, 300).flatMap(row => {
      if (!row || typeof row !== 'object') return [];
      const id = text(row.id, 120);
      const name = text(row.name, 180);
      const url = safeLocalUrl(row.url, base, 'project');
      if (!ID_PATTERN.test(id) || !name || !url || seen.has(id)) return [];
      seen.add(id);
      const technologies = Array.isArray(row.technologies)
        ? [...new Set(row.technologies.map(item => text(item, 80)).filter(Boolean))].slice(0, 12) : [];
      const gallery = Array.isArray(row.gallery) ? row.gallery.flatMap(item => {
        if (!item || typeof item !== 'object') return [];
        const src = safeLocalUrl(item.src, base, 'image');
        if (!src || !Number.isInteger(item.width) || !Number.isInteger(item.height)
          || item.width < 1 || item.height < 1 || item.width > 12000 || item.height > 12000) return [];
        return [{src, width:item.width, height:item.height, alt:text(item.alt, 360), caption:text(item.caption, 600)}];
      }).slice(0, 1) : [];
      return [{id, name, url, summary:text(row.summary), problem:text(row.problem, 1800),
        category:text(row.category, 80), categoryLabel:text(row.categoryLabel, 100),
        stage:STAGES.has(row.stage) ? row.stage : null, technologies, gallery}];
    });
  }

  function initProjectHologram(doc, win) {
    const dataNode = doc.querySelector('#showroom-data');
    let raw = [];
    try { raw = JSON.parse(dataNode ? dataNode.textContent : '[]'); } catch (_) { /* Real anchors remain the fallback. */ }
    const base = doc.baseURI || win.location.href;
    const projects = new Map(normalizeProjects(raw, base).map(project => [project.id, project]));
    const dialog = doc.querySelector('#project-hologram');
    const query = selector => dialog ? dialog.querySelector(selector) : null;
    const nodes = {
      surface:query('[data-hologram-surface]'), close:query('[data-hologram-close]'),
      category:query('[data-hologram-category]'), name:query('[data-hologram-name]'),
      summary:query('[data-hologram-summary]'), problem:query('[data-hologram-problem]'),
      stage:query('[data-hologram-stage]'), technologies:query('[data-hologram-technologies]'),
      technologyList:query('[data-hologram-technology-list]'), link:query('[data-hologram-project-link]'),
      figure:query('[data-hologram-figure]'), imageSlot:query('[data-hologram-image-slot]'),
      caption:query('[data-hologram-caption]'), identity:query('[data-hologram-identity]'),
      identityCategory:query('[data-hologram-identity-category]'), identityName:query('[data-hologram-identity-name]')
    };
    const complete = dialog && Object.values(nodes).every(Boolean);
    const motion = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : {matches:true};
    const listeners = [];
    let active = null;
    let phase = 'closed';
    let returnTarget = null;
    let closeTimer = null;
    let openingFrame = null;
    let cycle = 0;
    let backdropPointer = null;

    function listen(target, type, handler) {
      if (!target || typeof target.addEventListener !== 'function') return;
      target.addEventListener(type, handler);
      listeners.push(() => target.removeEventListener(type, handler));
    }
    function clearScheduled() {
      if (closeTimer !== null) win.clearTimeout(closeTimer);
      if (openingFrame !== null && win.cancelAnimationFrame) win.cancelAnimationFrame(openingFrame);
      closeTimer = null;
      openingFrame = null;
    }
    function emit(type, id) {
      doc.dispatchEvent(new win.CustomEvent(type, {detail:{id}}));
    }
    function navigate(url) {
      if (url) win.location.assign(url);
    }
    function canFocus(node) {
      if (!node || node.isConnected === false || node.hidden || node.disabled || typeof node.focus !== 'function') return false;
      if (node.closest && node.closest('[hidden],[inert]')) return false;
      return !node.getClientRects || node.getClientRects().length > 0;
    }
    function restoreFocus(target) {
      const destination = canFocus(target) ? target : doc.querySelector('[data-showroom-viewport]');
      if (canFocus(destination)) destination.focus({preventScroll:true});
    }
    function render(project, token) {
      // The same scroller serves every project; a new presentation starts at its title.
      nodes.surface.scrollTop = 0;
      nodes.category.textContent = project.categoryLabel || project.category;
      nodes.name.textContent = project.name;
      nodes.summary.textContent = project.summary;
      nodes.problem.textContent = project.problem;
      nodes.problem.parentElement.hidden = !project.problem;
      nodes.stage.textContent = project.stage || 'Etap do potwierdzenia';
      nodes.link.href = project.url;
      nodes.link.setAttribute('aria-label', 'Zobacz cały projekt: ' + project.name);
      nodes.technologyList.replaceChildren();
      for (const technology of project.technologies) {
        const item = doc.createElement('li');
        item.textContent = technology;
        nodes.technologyList.append(item);
      }
      nodes.technologies.hidden = project.technologies.length === 0;
      nodes.identityCategory.textContent = project.categoryLabel || project.category;
      nodes.identityName.textContent = project.name;
      nodes.imageSlot.replaceChildren();
      nodes.figure.hidden = true;
      nodes.identity.hidden = false;
      nodes.caption.textContent = '';
      const media = project.gallery[0];
      if (media) {
        const image = doc.createElement('img');
        image.width = media.width;
        image.height = media.height;
        image.alt = media.alt || project.name;
        image.decoding = 'async';
        image.addEventListener('error', () => {
          if (cycle !== token || !active || active.id !== project.id) return;
          nodes.figure.hidden = true;
          nodes.identity.hidden = false;
          nodes.imageSlot.replaceChildren();
        }, {once:true});
        image.src = media.src;
        nodes.imageSlot.append(image);
        nodes.caption.textContent = media.caption;
        nodes.caption.hidden = !media.caption;
        nodes.figure.hidden = false;
        nodes.identity.hidden = true;
      }
    }

    function finishClose() {
      if (!active) return;
      const id = active.id;
      const target = returnTarget;
      clearScheduled();
      const token = ++cycle;
      active = null;
      phase = 'closed';
      returnTarget = null;
      backdropPointer = null;
      dialog.classList.remove('is-entering', 'is-closing');
      if (dialog.open) dialog.close();
      doc.documentElement.classList.remove('project-hologram-active');
      nodes.imageSlot.replaceChildren();
      emit('progresskit:hologram-close', id);
      // A close listener may immediately open another project.
      if (cycle === token && !dialog.open) restoreFocus(target);
    }

    function requestClose() {
      if (!active || phase === 'closing') return;
      clearScheduled();
      const token = ++cycle;
      phase = 'closing';
      backdropPointer = null;
      dialog.classList.remove('is-entering');
      if (motion.matches || doc.visibilityState === 'hidden') return finishClose();
      dialog.classList.add('is-closing');
      closeTimer = win.setTimeout(() => {
        if (cycle === token && phase === 'closing') finishClose();
      }, CLOSE_DELAY);
    }

    function openProject(id, trigger) {
      const project = projects.get(id);
      if (!project) {
        const fallback = trigger && trigger.getAttribute ? safeLocalUrl(trigger.getAttribute('href'), base, 'project') : null;
        navigate(fallback);
        return false;
      }
      if (!complete || typeof dialog.showModal !== 'function') {
        navigate(project.url);
        return false;
      }
      clearScheduled();
      const token = ++cycle;
      const triggerInside = trigger && dialog.contains(trigger);
      if (!triggerInside) returnTarget = trigger || (dialog.contains(doc.activeElement) ? returnTarget : doc.activeElement);
      active = project;
      phase = 'open';
      backdropPointer = null;
      dialog.classList.remove('is-closing', 'is-entering');
      if (!motion.matches) dialog.classList.add('is-entering');
      render(project, token);
      try {
        if (!dialog.open) dialog.showModal();
      } catch (_) {
        active = null;
        phase = 'closed';
        returnTarget = null;
        dialog.classList.remove('is-entering', 'is-closing');
        nodes.imageSlot.replaceChildren();
        doc.documentElement.classList.remove('project-hologram-active');
        navigate(project.url);
        return false;
      }
      // Project from the selected orbital module while retaining native modal
      // focus and dismissal. Safe defaults cover history and anchor fallbacks.
      if (dialog.style?.setProperty) {
        let x = 50, y = 100;
        const sourceBox = trigger?.getBoundingClientRect?.();
        const panelBox = dialog.getBoundingClientRect();
        const width = panelBox.right - panelBox.left, height = panelBox.bottom - panelBox.top;
        if (sourceBox && width > 0 && height > 0) {
          x = Math.max(5, Math.min(95, ((sourceBox.left + sourceBox.right) / 2 - panelBox.left) / width * 100));
          y = Math.max(5, Math.min(100, ((sourceBox.top + sourceBox.bottom) / 2 - panelBox.top) / height * 100));
        }
        dialog.style.setProperty('--projection-origin', `${x.toFixed(2)}% ${y.toFixed(2)}%`);
      }
      doc.documentElement.classList.add('project-hologram-active');
      emit('progresskit:hologram-open', id);
      nodes.close.focus({preventScroll:true});
      if (!motion.matches && win.requestAnimationFrame) {
        openingFrame = win.requestAnimationFrame(() => {
          if (cycle !== token || phase !== 'open') return;
          openingFrame = win.requestAnimationFrame(() => {
            openingFrame = null;
            if (cycle === token && phase === 'open') dialog.classList.remove('is-entering');
          });
        });
      } else dialog.classList.remove('is-entering');
      return true;
    }

    listen(doc, 'progresskit:open-project', event => {
      const detail = event.detail || {};
      openProject(detail.id, detail.trigger);
    });
    listen(doc, 'progresskit:close-project', event => {
      const id = event.detail && event.detail.id;
      if (active && (!id || id === active.id)) requestClose();
    });
    if (complete) {
      listen(nodes.close, 'click', requestClose);
      listen(dialog, 'cancel', event => {
        event.preventDefault();
        requestClose();
      });
      listen(dialog, 'close', () => {
        // Native close events are queued; ignore one belonging to an earlier session.
        if (!dialog.open && active) finishClose();
      });
      listen(dialog, 'keydown', event => {
        if (event.key === 'Escape') event.stopPropagation();
      });
      listen(dialog, 'transitionend', event => {
        if (event.target === dialog && event.propertyName === 'opacity' && phase === 'closing') finishClose();
      });
      const outside = event => {
        const box = nodes.surface.getBoundingClientRect();
        return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
      };
      listen(dialog, 'pointerdown', event => {
        backdropPointer = null;
        if (!active || event.isPrimary === false || event.button !== 0 || !outside(event)) return;
        backdropPointer = {id:event.pointerId, x:event.clientX, y:event.clientY};
      });
      listen(dialog, 'pointerup', event => {
        const start = backdropPointer;
        backdropPointer = null;
        if (start && start.id === event.pointerId && outside(event)
          && Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 6) requestClose();
      });
      listen(dialog, 'pointercancel', () => { backdropPointer = null; });
      listen(motion, 'change', event => {
        if (!event.matches) return;
        if (phase === 'closing') finishClose();
        else {
          clearScheduled();
          dialog.classList.remove('is-entering');
        }
      });
    }
    return {
      open:openProject,
      close:requestClose,
      getState:() => ({id:active ? active.id : null, phase}),
      destroy() {
        if (active) finishClose();
        clearScheduled();
        listeners.forEach(remove => remove());
      }
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = {safeLocalUrl, normalizeProjects, initProjectHologram};
  if (typeof document !== 'undefined') {
    const boot = () => initProjectHologram(document, window);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
    else boot();
  }
}());
