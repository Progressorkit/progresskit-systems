'use strict';

// A manual 620ms turn settles before a neighboring projection opens.
const SHOWROOM_CENTER_SETTLE_MS = 650;
const SHOWROOM_MOVE_MS = 620;

const ProjectShowroom = {
  wrap(index, length) {
    return length > 0 ? ((Math.trunc(index) % length) + length) % length : 0;
  },
  offset(index, active, length) {
    if (length < 2) return 0;
    const half = Math.floor(length / 2);
    return this.wrap(index - active + half, length) - half;
  },
  relative(index, phase, length) {
    if (length < 2) return 0;
    return ((index - phase + length / 2) % length + length) % length - length / 2;
  },
  orbit(offset, length, slotLimit = 5) {
    // One camera projection drives modules, cables and the metal frame.
    const slots = Math.min(slotLimit, Math.max(1, length));
    const theta = length < 2 ? 0 : offset * Math.PI * 2 / slots;
    const depth = Math.cos(theta);
    const projection = slotLimit === 6 ? .12 : .24;
    const perspective = 1 / (1 - projection * depth);
    const edge = length <= slotLimit ? 1 : slotLimit === 6
      ? Math.max(0, Math.min(1, (offset + 3.5) * 2, (2.5 - offset) * 2))
      : Math.max(0, Math.min(1, (2.5 - Math.abs(offset)) * 2));
    return {
      x:length < 2 ? 0 : Math.sin(theta) * perspective,
      y:length < 2 ? 0 : depth * perspective,
      depth,
      scale:length < 2 ? 1 : (1 - projection) * perspective,
      angle:length < 2 ? 0 : -Math.sin(theta) * 16,
      light:.8 + .2 * (depth + 1) / 2,
      opacity:(.8 + .2 * (depth + 1) / 2) * edge,
      visible:length > 0 && edge > 0,
    };
  },
  mechanism(offset, length) {
    // A six-socket rotor. At the rear handoff only one of the outgoing and
    // incoming faces is visible; the half-open six-slot window never duplicates.
    const slots = Math.min(6, Math.max(1, length));
    const theta = offset * Math.PI * 2 / slots - Math.PI / 2;
    const edge = length <= 6 ? 1 : Math.max(0, Math.min(1, (offset + .5) * 2, (5.5 - offset) * 2));
    const x = Math.cos(theta), y = Math.sin(theta);
    return { x, y, depth:(y + 1) / 2, scale:.97 + .03 * (y + 1) / 2,
      angle:-x * 8, light:1, opacity:edge, visible:length > 0 && edge > 0 };
  },
  select(projects, category = '', id = '') {
    const normalized = projects.some(project => project.category === category) ? category : '';
    const items = projects.filter(project => !normalized || project.category === normalized);
    const selected = items.findIndex(project => project.id === id);
    return { category:normalized, items, index:selected < 0 ? 0 : selected };
  },
  drag(dx, dy, velocity = 0, width = 320) {
    const suppressClick = Math.hypot(dx, dy) >= 12;
    const horizontal = Math.abs(dx) >= 12 && Math.abs(dx) > Math.abs(dy) * 1.15;
    const threshold = Math.max(38, Math.min(80, width * .17));
    const projected = dx + Math.max(-1.5, Math.min(1.5, velocity)) * 100;
    const steps = horizontal && Math.abs(projected) >= threshold
      ? -Math.sign(projected) * Math.min(2, Math.max(1, Math.round(Math.abs(projected) / (width * .55)))) : 0;
    return { horizontal, suppressClick, steps };
  },
  wheel(dx, dy) {
    return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) >= 2 ? Math.sign(dx) : 0;
  },
  read(value) {
    const url = new URL(value);
    return { category:url.searchParams.get('kategoria') || '', project:url.searchParams.get('projekt') || '' };
  },
  url(value, category, project = '') {
    const url = new URL(value);
    for (const [key, entry] of [['kategoria', category], ['projekt', project]]) {
      if (entry) url.searchParams.set(key, entry);
      else url.searchParams.delete(key);
    }
    return url;
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = ProjectShowroom;

if (typeof document !== 'undefined') {
  const initialize = (domReady = false) => {
    const root = document.querySelector('[data-showroom]');
    if (!root) return;
    const viewport = root.querySelector('[data-showroom-viewport]');
    const cards = [...root.querySelectorAll('.showroom-card')];
    const source = document.querySelector('#showroom-data');
    let projects;
    try {
      const data = JSON.parse(source?.textContent || 'null');
      projects = Array.isArray(data) ? data : data?.projects;
      if (!Array.isArray(projects) || projects.length !== cards.length || !projects.length) return;
      const ids = new Set(projects.map(project => project.id));
      if (ids.size !== projects.length || cards.some(card => !ids.has(card.dataset.projectId))) return;
    } catch (error) {
      console.debug('ProgressKit: showroom enhancement unavailable.', error.name);
      return;
    }
    const byId = new Map(projects.map(project => [project.id, project]));
    const byCard = new Map(cards.map(card => [card.dataset.projectId, card]));
    const gates = [...root.querySelectorAll('[data-showroom-category]')];
    const buttons = [...root.querySelectorAll('[data-showroom-step]')];
    const orbitNodes = [...root.querySelectorAll('[data-orbit-node]')];
    const energyToggle = root.querySelector('[data-showroom-motion-toggle]');
    const status = root.querySelector('#showroom-status');
    const position = root.querySelector('[data-showroom-position]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion:reduce)');
    const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)');
    const inlineSlices = root.hasAttribute?.('data-showroom-slices') === true;
    const narrowLayout = inlineSlices ? window.matchMedia('(max-width:700px)') : {matches:false};
    let sliceCard = null;
    let sliceTimer;
    let sliceReturnTarget;
    let sliceHoverBlocked = false;
    let sliceAnimations = [];
    const stopSliceAnimations = () => { sliceAnimations.forEach(animation => animation.cancel()); sliceAnimations = []; };
    const label = (element, value) => {
      if (element.firstChild?.nodeType === 3 && element.childNodes?.length === 1) element.firstChild.nodeValue = value;
      else if (element.textContent !== value) element.textContent = value;
    };
    let state = ProjectShowroom.select(projects);
    let previewSnapshot;
    let openId = '';
    let locked = false;
    let gesture;
    let dragFrame;
    let openTimer;
    let suppressClickUntil = 0;
    let wheelTotal = 0;
    let lastWheel = 0;
    let wheelLockUntil = 0;
    let movementTimer;
    let layoutSignature = '';
    let energyPaused = false;
    let phaseFrame = 0;
    let pendingKeyboardFocus = false;
    let displayPhase = 0;
    let targetPhase = 0;
    let phaseEnds = 0;
    let lastIndex = 0;
    let geometryCollection = '';
    let orbitInView = true;
    const active = () => state.items[state.index];
    const cancelOpen = () => { clearTimeout(openTimer); openTimer = null; root.classList.remove('is-projecting'); };
    function settleWires() {
      if (reducedMotion.matches || document.hidden || !orbitInView) return;
      clearTimeout(movementTimer);
      root.classList.add('is-orbit-moving');
      movementTimer = setTimeout(() => root.classList.remove('is-orbit-moving'), SHOWROOM_CENTER_SETTLE_MS);
    }
    function paintGeometry() {
      const indexes = new Map(state.items.map((project, index) => [project.id, index]));
      const visible = [];
      root.style.setProperty('--mechanism-turn', `${(-displayPhase * 360 / Math.min(6, state.items.length)).toFixed(4)}deg`);
      for (const card of cards) {
        const index = indexes.get(card.dataset.projectId);
        const included = index !== undefined;
        const offset = included ? ProjectShowroom.relative(index, displayPhase, state.items.length) : 99;
        const point = inlineSlices ? ProjectShowroom.mechanism(offset, state.items.length)
          : ProjectShowroom.orbit(offset, state.items.length);
        const selected = included && index === state.index;
        const shown = included && (narrowLayout.matches ? selected : point.visible);
        card.hidden = false;
        card.classList.toggle('is-orbit-hidden', !shown);
        card.classList.toggle('is-active', selected);
        card.style.setProperty('--showroom-offset', offset.toFixed(6));
        card.style.setProperty('--showroom-x', point.x.toFixed(6));
        card.style.setProperty('--showroom-y', point.y.toFixed(6));
        card.style.setProperty('--showroom-angle', `${point.angle.toFixed(3)}deg`);
        card.style.setProperty('--showroom-scale', point.scale.toFixed(6));
        card.style.setProperty('--showroom-light', point.light.toFixed(6));
        card.style.setProperty('--showroom-opacity', shown ? point.opacity.toFixed(6) : '0');
        card.style.zIndex = String(!shown ? 0 : point.depth >= 0 ? 10 + Math.round(point.depth * 6) : 2 + Math.round((point.depth + 1) * 3));
        card.inert = locked || !shown || Boolean(sliceCard && card !== sliceCard);
        card.setAttribute('aria-hidden', String(!included || !shown || (sliceCard ? card !== sliceCard : !selected)));
        card.querySelector('[data-showroom-open]').tabIndex = !locked && selected && shown && !sliceCard ? 0 : -1;
        if (shown) visible.push({id:card.dataset.projectId, point, selected});
        if (included) card.setAttribute('aria-label', `${byId.get(card.dataset.projectId).name} · ${index + 1} z ${state.items.length}`);
      }
      if (pendingKeyboardFocus && document.activeElement === viewport) {
        const card = byCard.get(active()?.id);
        if (card && !card.inert) {
          pendingKeyboardFocus = false;
          card.querySelector('[data-showroom-open]').focus({preventScroll:true});
        }
      }
      orbitNodes.forEach((node, index) => {
        const item = state.items.length > 1 ? visible[index] : null;
        node.style.display = item ? '' : 'none';
        node.dataset.projectId = item?.id || '';
        node.classList.toggle('is-active', Boolean(item?.selected));
        if (!item) return;
        const x = 500 + item.point.x * 500, y = 250 + item.point.y * 250;
        const link = node.querySelector('.showroom-orbit__link');
        link.setAttribute('x2', x.toFixed(3)); link.setAttribute('y2', y.toFixed(3));
        node.querySelectorAll('circle').forEach(circle => { circle.setAttribute('cx', x.toFixed(3)); circle.setAttribute('cy', y.toFixed(3)); });
        const spark = node.querySelector('.showroom-orbit__spark');
        if (spark) {
          spark.setAttribute('cx', '500'); spark.setAttribute('cy', '250');
          spark.style.setProperty('--spark-x', `${(x - 500).toFixed(3)}px`);
          spark.style.setProperty('--spark-y', `${(y - 250).toFixed(3)}px`);
        }
      });
    }
    function finishPhase() {
      if (phaseFrame) cancelAnimationFrame(phaseFrame);
      phaseFrame = 0;
      if (sliceCard) { phaseEnds = 0; paintGeometry(); return; }
      displayPhase = targetPhase;
      phaseEnds = 0;
      paintGeometry();
    }
    function animatePhase() {
      if (phaseFrame) cancelAnimationFrame(phaseFrame);
      const from = displayPhase, started = performance.now();
      phaseEnds = started + SHOWROOM_MOVE_MS;
      const tick = () => {
        phaseFrame = 0;
        const fraction = Math.min(1, Math.max(0, (performance.now() - started) / SHOWROOM_MOVE_MS));
        const eased = fraction * fraction * (3 - 2 * fraction);
        displayPhase = from + (targetPhase - from) * eased;
        paintGeometry();
        if (fraction < 1) phaseFrame = requestAnimationFrame(tick);
        else phaseEnds = 0;
      };
      phaseFrame = requestAnimationFrame(tick);
      paintGeometry();
    }
    function arrangeGeometry(allowMotion = true) {
      if (sliceCard) { paintGeometry(); return; }
      const collection = `${state.category}:${state.items.map(project => project.id).join(',')}`;
      if (narrowLayout.matches || collection !== geometryCollection || !allowMotion || reducedMotion.matches || document.hidden || !orbitInView) {
        geometryCollection = collection;
        lastIndex = state.index;
        targetPhase = state.index;
        finishPhase();
        return;
      }
      if (state.index === lastIndex) {
        if (!phaseFrame && Math.abs(displayPhase - targetPhase) > 1e-7) animatePhase();
        else paintGeometry();
        return;
      }
      const delta = ProjectShowroom.offset(state.index, lastIndex, state.items.length);
      lastIndex = state.index;
      targetPhase += delta;
      // Preserve the legacy five-node controller; the shipped six-node wheel
      // keeps its continuous path, including Home/End and rapid repeated input.
      if (!inlineSlices && (Math.abs(delta) > 2 || Math.abs(targetPhase - displayPhase) > 2)) { finishPhase(); return; }
      animatePhase();
    }
    const syncUrl = () => {
      const url = ProjectShowroom.url(location.href, state.category, openId);
      if (url.href !== location.href) history.replaceState(null, '', url);
    };
    function endPreview(restore = true) {
      if (!previewSnapshot) return;
      const previous = previewSnapshot;
      previewSnapshot = null;
      root.dataset.previewCategory = '';
      root.classList.remove('is-filter-preview');
      gates.forEach(gate => gate.classList.remove('is-hover-preview'));
      cards.forEach(card => card.classList.remove('is-category-preview'));
      if (restore) { state = ProjectShowroom.select(projects, previous.category, previous.id); render(); }
    }
    function render(announce = true, allowMotion = true) {
      const signature = `${state.category}:${state.index}:${state.items.map(project => project.id).join(',')}`;
      if (layoutSignature && signature !== layoutSignature && !reducedMotion.matches && !document.hidden) settleWires();
      layoutSignature = signature;
      arrangeGeometry(allowMotion);
      const committedCategory = previewSnapshot ? previewSnapshot.category : state.category;
      gates.forEach(gate => gate.setAttribute('aria-pressed', String(gate.dataset.showroomCategory === committedCategory)));
      buttons.forEach(button => { button.disabled = locked || state.items.length < 2; });
      root.classList.toggle('is-hologram-open', locked);
      root.classList.toggle('is-projecting', locked);
      root.classList.toggle('showroom-reduced-motion', reducedMotion.matches);
      if (energyToggle) {
        energyToggle.disabled = reducedMotion.matches;
        energyToggle.setAttribute('aria-pressed', String(energyPaused || reducedMotion.matches));
        label(energyToggle, reducedMotion.matches ? 'Ruch ograniczony' : energyPaused ? 'Wznów efekty mechanizmu' : 'Wstrzymaj efekty mechanizmu');
      }
      viewport.style.setProperty('--showroom-drag', '0px');
      label(position, `${state.index + 1} / ${state.items.length}`);
      if (announce && active()) label(status, `${previewSnapshot ? 'Podgląd: ' : ''}${active().name}. ${state.index + 1} z ${state.items.length}${state.category ? ` · ${active().categoryLabel || ''}` : ' · wszystkie projekty'}.`);
    }
    function placeSlice() {
      if (!sliceCard) return;
      if (narrowLayout.matches) {
        viewport.style.removeProperty('--slice-stage-top');
        return;
      }
      // The drawer unfolds into the full reading surface; its natural height
      // extends the page. The closed mechanism reserves its original footprint.
      const bounds = viewport.getBoundingClientRect();
      const width = Math.min(820, bounds.width - 32);
      const left = (bounds.width - width) / 2;
      viewport.style.setProperty('--slice-stage-top', '16.00px');
      for (const [name, value] of Object.entries({left, width})) {
        sliceCard.style.setProperty(`--slice-${name}`, `${value.toFixed(2)}px`);
      }
    }
    function closeSlice(restoreFocus = false, updateUrl = true) {
      clearTimeout(sliceTimer);
      stopSliceAnimations();
      if (!sliceCard) return;
      const card = sliceCard;
      sliceCard = null;
      card.classList.remove('is-slice-expanded');
      card.querySelector('[data-slice-panel]').hidden = true;
      card.querySelector('[data-showroom-open]').setAttribute('aria-expanded', 'false');
      root.classList.remove('is-slice-open');
      viewport.style.removeProperty('--slice-stage-top');
      openId = '';
      // An explicit close must stay closed under a stationary mouse.
      sliceHoverBlocked = finePointer.matches && viewport.matches(':hover');
      render(false);
      if (updateUrl) syncUrl();
      if (restoreFocus) {
        const target = sliceReturnTarget && !sliceReturnTarget.closest('[inert],[hidden],[aria-hidden="true"]') ? sliceReturnTarget : viewport;
        target.focus({preventScroll:true});
        const box = card.getBoundingClientRect();
        const headerBottom = document.querySelector('.topbar')?.getBoundingClientRect().bottom || 0;
        if (box.top < headerBottom || box.bottom > window.innerHeight) card.scrollIntoView({block:'start',behavior:'instant'});
      }
    }
    function openSlice(id, trigger, focus = false) {
      const card = byCard.get(id);
      const panel = card?.querySelector('[data-slice-panel]');
      if (!panel || sliceCard === card) return;
      if (sliceCard) closeSlice(false, false);
      stopSliceAnimations();
      cancelOpen();
      clearTimeout(sliceTimer);
      // The selected face has reached the front socket before extrusion.
      if (phaseFrame) cancelAnimationFrame(phaseFrame);
      phaseFrame = 0;
      phaseEnds = 0;
      stopGesture();
      const before = card.getBoundingClientRect();
      sliceReturnTarget = trigger || viewport;
      sliceCard = card;
      state.index = state.items.findIndex(project => project.id === id);
      openId = id;
      panel.hidden = false;
      card.classList.add('is-slice-expanded');
      card.querySelector('[data-showroom-open]').setAttribute('aria-expanded', 'true');
      root.classList.add('is-slice-open');
      clearTimeout(movementTimer);
      root.classList.remove('is-orbit-moving');
      placeSlice();
      render(false, false);
      syncUrl();
      panel.querySelector('.project-slice__body').scrollTop = 0;
      if (!reducedMotion.matches && typeof card.animate === 'function') {
        const after = card.getBoundingClientRect();
        const x = before.left - after.left, y = before.top - after.top;
        const sx = before.width / after.width, sy = before.height / after.height;
        sliceAnimations.push(card.animate([
          {transform:`translate(${x}px,${y}px) scale(${sx},${sy})`,transformOrigin:'0 0',offset:0},
          {transform:`translate(${x}px,${y - 3}px) scale(${sx * 1.025},${sy * 1.025})`,transformOrigin:'0 0',offset:.17},
          {transform:'translate(0,0) scale(1)',transformOrigin:'0 0',offset:1},
        ], {duration:520,easing:'cubic-bezier(.18,.75,.2,1)'}));
        sliceAnimations.push(panel.animate([{opacity:0,transform:'translateY(-8px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,delay:220,fill:'backwards'}));
      }
      if (focus) panel.querySelector('[data-slice-close]').focus({preventScroll:true});
    }
    function move(delta) {
      if (locked || state.items.length < 2) return;
      const focusedSlice = sliceCard?.contains(document.activeElement);
      closeSlice(false, false);
      if (gesture) stopGesture();
      endPreview();
      cancelOpen();
      if (openId) { openId = ''; syncUrl(); }
      const focusedLink = document.activeElement?.closest?.('[data-showroom-open]');
      state.index = ProjectShowroom.wrap(state.index + delta, state.items.length);
      render();
      syncUrl();
      if (focusedSlice || pendingKeyboardFocus || (focusedLink && root.contains(focusedLink))) {
        const card = byCard.get(active().id);
        pendingKeyboardFocus = card.inert;
        (pendingKeyboardFocus ? viewport : card.querySelector('[data-showroom-open]')).focus({preventScroll:true});
      }
    }
    function requestOpen(id, trigger, fromHistory = false) {
      const project = byId.get(id);
      if (!project || (locked && !fromHistory)) return;
      if (inlineSlices) {
        if (sliceCard?.dataset.projectId === id) return;
        if (sliceCard) closeSlice(false, false);
        endPreview(); cancelOpen();
        if (!state.items.some(item => item.id === id)) state = ProjectShowroom.select(projects, '', id);
        state.index = state.items.findIndex(item => item.id === id);
        render(true, !fromHistory);
        root.classList.add('is-projecting');
        const dispatch = () => { finishPhase(); openSlice(id, trigger, true); };
        const remaining = phaseFrame ? Math.max(0, phaseEnds - performance.now()) + 30 : 0;
        if (!reducedMotion.matches && remaining > 0) openTimer = setTimeout(dispatch, remaining);
        else dispatch();
        return;
      }
      endPreview();
      cancelOpen();
      if (!state.items.some(item => item.id === id)) state = ProjectShowroom.select(projects, '', id);
      const prior = active()?.id;
      state.index = state.items.findIndex(item => item.id === id);
      render();
      root.classList.add('is-projecting');
      const dispatch = () => {
        if (active()?.id !== id) return;
        // The timer may run before the final animation frame on a busy tab.
        // Commit the pose before the hologram measures its triggering module.
        finishPhase();
        openId = id; syncUrl();
        document.dispatchEvent(new CustomEvent('progresskit:open-project', {detail:{id, trigger:trigger || byCard.get(id).querySelector('[data-showroom-open]')}}));
      };
      const remaining = phaseFrame ? Math.max(0, phaseEnds - performance.now()) + 30 : 0;
      if (!reducedMotion.matches && (prior !== id || remaining > 0)) openTimer = setTimeout(dispatch, prior !== id ? SHOWROOM_CENTER_SETTLE_MS : remaining);
      else dispatch();
    }
    function restore(request = true) {
      if (sliceCard) closeSlice(sliceCard.contains(document.activeElement), false);
      stopGesture();
      endPreview();
      cancelOpen();
      const desired = ProjectShowroom.read(location.href);
      const selected = byId.get(desired.project);
      let category = desired.category;
      if (selected && category && selected.category !== category) category = '';
      state = ProjectShowroom.select(projects, category, selected?.id || active()?.id || '');
      const previousOpen = openId;
      openId = selected?.id || '';
      render(true, false);
      if (request && selected) requestOpen(selected.id, byCard.get(selected.id).querySelector('[data-showroom-open]'), true);
      else if (request && locked) document.dispatchEvent(new CustomEvent('progresskit:close-project', {detail:{id:previousOpen}}));
    }
    root.classList.add('showroom-enhanced');
    root.classList.toggle('showroom-narrow', narrowLayout.matches);
    root.querySelectorAll('[data-showroom-enhancement]').forEach(node => { node.hidden = false; });
    // Decorative energy has no animation loop of its own and sleeps offscreen.
    if (typeof IntersectionObserver !== 'undefined') {
      const orbitVisibility = new IntersectionObserver(entries => {
        const inView = entries.some(entry => entry.isIntersecting);
        orbitInView = inView;
        root.classList.toggle('showroom-in-view', inView);
        if (!inView) {
          clearTimeout(sliceTimer);
          cancelOpen(); stopGesture(); finishPhase();
          clearTimeout(movementTimer);
          root.classList.remove('is-orbit-moving');
        }
      }, {threshold:.1});
      orbitVisibility.observe(viewport);
    }
    root.classList.toggle('is-page-hidden', document.hidden);
    restore(false);
    energyToggle?.addEventListener('click', () => {
      energyPaused = !energyPaused;
      root.classList.toggle('is-energy-paused', energyPaused);
      render(false);
    });

    gates.forEach(gate => {
      gate.addEventListener('click', () => {
        if (locked) return;
        closeSlice(false, false);
        stopGesture();
        endPreview(false);
        cancelOpen(); openId = '';
        state = ProjectShowroom.select(projects, gate.dataset.showroomCategory, active()?.id);
        render(); syncUrl();
      });
      gate.addEventListener('pointerenter', event => {
        if (locked || sliceCard || !finePointer.matches || event.pointerType === 'touch') return;
        // A pointer-only preview must not make a keyboard user's focused link
        // disappear. Clicking a gate still selects its category explicitly.
        const focusedProject = document.activeElement?.closest?.('[data-showroom-open]');
        if (focusedProject && root.contains(focusedProject)) return;
        stopGesture();
        if (!previewSnapshot) previewSnapshot = {category:state.category, id:active()?.id};
        cancelOpen();
        const category = gate.dataset.showroomCategory;
        state = ProjectShowroom.select(projects, category, active()?.id);
        root.dataset.previewCategory = category;
        root.classList.add('is-filter-preview');
        gate.classList.add('is-hover-preview');
        cards.forEach(card => card.classList.toggle('is-category-preview', Boolean(category && card.dataset.category === category)));
        render();
      });
      gate.addEventListener('pointerleave', () => {
        endPreview();
      });
    });
    buttons.forEach(button => button.addEventListener('click', () => move(Number(button.dataset.showroomStep))));
    root.addEventListener('click', event => {
      if (inlineSlices && event.target.closest('[data-slice-close]')) {
        closeSlice(true); return;
      }
      const link = event.target.closest('[data-showroom-open]');
      if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (locked || performance.now() < suppressClickUntil) return;
      requestOpen(link.dataset.showroomOpen, link);
    });
    viewport.addEventListener('keydown', event => {
      if (locked || event.ctrlKey || event.metaKey || event.altKey) return;
      if (sliceCard && event.key === 'Escape') {
        event.preventDefault(); closeSlice(true); return;
      }
      if (sliceCard && event.target.closest('[data-slice-panel]') && !['ArrowLeft','ArrowRight'].includes(event.key)) return;
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        move(event.key === 'Home' ? -state.index : event.key === 'End' ? state.items.length - 1 - state.index : event.key === 'ArrowRight' ? 1 : -1);
      } else if (event.key === 'Escape' && openTimer && !locked) {
        event.preventDefault(); cancelOpen(); openId = ''; syncUrl();
      } else if ((event.key === 'Enter' || event.key === ' ') && event.target === viewport) {
        event.preventDefault(); requestOpen(active().id, byCard.get(active().id).querySelector('[data-showroom-open]'));
      }
    });
    viewport.addEventListener('pointerdown', event => {
      if (sliceCard) return;
      if (locked || (event.pointerType === 'mouse' && event.button !== 0)) return;
      if (gesture) { stopGesture(); return; }
      cancelOpen();
      finishPhase();
      gesture = {id:event.pointerId, x:event.clientX, y:event.clientY, lastX:event.clientX,
        time:performance.now(), phase:displayPhase, dx:0, dy:0, velocity:0, horizontal:false};
    });
    viewport.addEventListener('pointermove', event => {
      if (!gesture || gesture.id !== event.pointerId || locked) return;
      const now = performance.now();
      gesture.dx = event.clientX - gesture.x; gesture.dy = event.clientY - gesture.y;
      gesture.velocity = (event.clientX - gesture.lastX) / Math.max(1, now - gesture.time);
      gesture.lastX = event.clientX; gesture.time = now;
      // A single-card filter cannot rotate, but its gesture still has to be
      // tracked so a swipe does not become a compatibility click on the card.
      if (state.items.length < 2) return;
      if (!gesture.horizontal && Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15) {
        gesture.horizontal = true;
        viewport.setPointerCapture?.(event.pointerId);
        root.classList.add('is-dragging');
      }
      if (!gesture.horizontal) return;
      event.preventDefault();
      if (!dragFrame) dragFrame = requestAnimationFrame(() => {
        dragFrame = null;
        if (gesture) {
          const pixelsPerStep = Math.max(140, Math.min(280, viewport.clientWidth * .35));
          displayPhase = gesture.phase - Math.max(-1.8, Math.min(1.8, gesture.dx / pixelsPerStep));
          paintGeometry();
        }
      });
    });
    function stopGesture() {
      const pointerId = gesture?.id;
      const displaced = gesture?.horizontal;
      gesture = null;
      if (dragFrame) cancelAnimationFrame(dragFrame);
      dragFrame = null; root.classList.remove('is-dragging');
      viewport.style.setProperty('--showroom-drag', '0px');
      if (displaced) settleWires();
      if (pointerId !== undefined && viewport.hasPointerCapture?.(pointerId)) viewport.releasePointerCapture(pointerId);
    }
    const finishGesture = (event, cancelled = false) => {
      if (!gesture || gesture.id !== event.pointerId) return;
      const result = ProjectShowroom.drag(gesture.dx, gesture.dy, gesture.velocity, viewport.clientWidth);
      if (result.suppressClick) suppressClickUntil = performance.now() + 450;
      stopGesture();
      if (!cancelled && result.steps) move(result.steps);
      else render(false);
    };
    viewport.addEventListener('pointerup', event => finishGesture(event));
    viewport.addEventListener('pointercancel', event => finishGesture(event, true));
    viewport.addEventListener('lostpointercapture', event => {
      // Taking capture from a touched child releases its implicit capture.
      // That bubbled child event does not cancel the viewport's new gesture.
      if (event.target === viewport) finishGesture(event, true);
    });
    // Before horizontal intent, pointer capture is deliberately absent so page
    // scrolling stays native. A release outside still has to clear our gesture.
    document.addEventListener('pointerup', event => finishGesture(event));
    document.addEventListener('pointercancel', event => finishGesture(event, true));
    viewport.addEventListener('dragstart', event => event.preventDefault());
    viewport.addEventListener('wheel', event => {
      if (locked || sliceCard || state.items.length < 2) return;
      const dx = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX;
      const dy = event.shiftKey && !event.deltaX ? 0 : event.deltaY;
      const direction = ProjectShowroom.wheel(dx, dy);
      if (!direction) return; // Ordinary vertical scrolling belongs to the page.
      event.preventDefault();
      const now = performance.now();
      if (now - lastWheel > 180) wheelTotal = 0;
      lastWheel = now; wheelTotal += dx;
      if (now > wheelLockUntil && Math.abs(wheelTotal) > 42) {
        move(Math.sign(wheelTotal)); wheelTotal = 0; wheelLockUntil = now + 230;
      }
    }, {passive:false});
    if (inlineSlices) {
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && sliceCard) { event.preventDefault(); closeSlice(true); }
      });
      cards.forEach(card => {
        card.addEventListener('pointerenter', () => clearTimeout(sliceTimer));
        card.addEventListener('pointermove', event => {
          clearTimeout(sliceTimer);
          // Scrolling or a manual turn can carry a module under a stationary
          // pointer. Hover needs an actual pointer move over a settled module.
          if (sliceCard || sliceHoverBlocked || !finePointer.matches || event.pointerType === 'touch' || gesture || phaseFrame || locked || card.inert) return;
          sliceTimer = setTimeout(() => {
            if (performance.now() >= suppressClickUntil && !gesture && !phaseFrame && !sliceCard && !card.inert) openSlice(card.dataset.projectId, card.querySelector('[data-showroom-open]'));
          }, 130);
        });
        card.addEventListener('pointerleave', () => {
          clearTimeout(sliceTimer);
          if (!sliceCard) sliceHoverBlocked = false;
        });
      });
      viewport.addEventListener('pointerleave', event => {
        clearTimeout(sliceTimer);
        sliceHoverBlocked = false;
        // Keyboard and touch disclosures remain open until dismissed explicitly.
        if (narrowLayout.matches || !finePointer.matches || event.pointerType === 'touch' || !sliceCard || sliceCard.contains(document.activeElement)) return;
        sliceTimer = setTimeout(() => {
          if (sliceCard && !sliceCard.contains(document.activeElement)) closeSlice(false);
        }, 280);
      });
      viewport.addEventListener('pointerenter', () => clearTimeout(sliceTimer));
      window.addEventListener('resize', placeSlice);
      narrowLayout.addEventListener('change', () => {
        clearTimeout(sliceTimer);
        cancelOpen(); stopGesture();
        if (phaseFrame) cancelAnimationFrame(phaseFrame);
        phaseFrame = 0; phaseEnds = 0;
        root.classList.toggle('showroom-narrow', narrowLayout.matches);
        // A desktop neighbor can be expanded independently of selection. Make
        // that same module the sole foreground module when narrowing the page.
        if (sliceCard) state.index = state.items.findIndex(project => project.id === sliceCard.dataset.projectId);
        lastIndex = state.index;
        targetPhase = state.index;
        displayPhase = targetPhase;
        render(false, false);
        placeSlice();
      });
    }
    document.addEventListener('progresskit:hologram-open', event => {
      const id = event.detail?.id;
      if (!byId.has(id)) return;
      endPreview();
      cancelOpen(); openId = id;
      if (!state.items.some(item => item.id === id)) state = ProjectShowroom.select(projects, '', id);
      state.index = state.items.findIndex(item => item.id === id);
      locked = true; stopGesture(); finishPhase(); render(false); syncUrl();
    });
    document.addEventListener('progresskit:hologram-close', event => {
      if (openId && event.detail?.id && event.detail.id !== openId) return;
      cancelOpen(); locked = false; openId = ''; root.classList.remove('is-projecting'); render(); syncUrl();
    });
    window.addEventListener('popstate', () => {
      const wasExpanded = Boolean(sliceCard);
      restore(true);
      // Native fragment traversal can reset focus after popstate dispatch.
      if (wasExpanded && !sliceCard) requestAnimationFrame(() => {
        if (!sliceCard) viewport.focus({preventScroll:true});
      });
    });
    reducedMotion.addEventListener('change', () => {
      cancelOpen(); stopGesture(); finishPhase(); clearTimeout(movementTimer); root.classList.remove('is-orbit-moving'); render(false, false);
    });
    document.addEventListener('visibilitychange', () => {
      root.classList.toggle('is-page-hidden', document.hidden);
      if (document.hidden) {
        clearTimeout(sliceTimer);
        cancelOpen(); endPreview(); stopGesture(); finishPhase(); clearTimeout(movementTimer); root.classList.remove('is-orbit-moving'); render(false, false);
      }
    });
    window.addEventListener('pagehide', () => {
      clearTimeout(sliceTimer);
      cancelOpen(); stopGesture(); finishPhase();
      clearTimeout(movementTimer);
      root.classList.remove('is-orbit-moving');
      root.classList.add('is-page-hidden');
    });
    window.addEventListener('pageshow', () => root.classList.toggle('is-page-hidden', document.hidden));
    const initial = ProjectShowroom.read(location.href).project;
    if (byId.has(initial)) {
      const openInitial = () => requestAnimationFrame(() => requestOpen(initial, byCard.get(initial).querySelector('[data-showroom-open]'), true));
      if (domReady || document.readyState === 'complete') openInitial();
      else document.addEventListener('DOMContentLoaded', openInitial, {once:true});
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initialize(true), {once:true});
  else initialize();
}
