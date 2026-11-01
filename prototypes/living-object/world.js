/* A bounded material response, not a permanent render loop. Local proof only. */
(() => {
  'use strict';
  const root = document.documentElement;
  const workshop = document.querySelector('.workshop');
  const scenes = [...document.querySelectorAll('[data-scene]')];
  const device = document.querySelector('[data-device]');
  const ignition = document.querySelector('[data-ignition]');
  const details = document.querySelector('#module-details');
  const screen = document.querySelector('.product-screen');
  const pauseButton = document.querySelector('[data-pause]');
  const connection = document.querySelector('#connection');
  if (!workshop || !device || !ignition || !details || !pauseButton) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 700px)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const properties = ['--lx', '--ly', '--shift-x', '--shift-y', '--shadow-x', '--shadow-y', '--glint-x', '--glint-y', '--tension'];
  let active = null, userPaused = false, leaving = false, paused = true;
  let raf = 0, viewportDirty = true, pointer = null, deadline = 0, lastTime = 0;
  let x = 0, y = 0, vx = 0, vy = 0, tx = 0, ty = 0;
  let opened = false, deviceTimer = 0, chargeTimer = 0, chargeArmed = false;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const full = () => !narrow.matches && fine.matches && !navigator.connection?.saveData &&
    !(navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) &&
    !(navigator.deviceMemory > 0 && navigator.deviceMemory <= 4);

  function resetLight() {
    pointer = null; x = y = vx = vy = tx = ty = 0; deadline = lastTime = 0;
    scenes.forEach(scene => properties.forEach(name => scene.style.removeProperty(name)));
  }
  function schedule() {
    if (!raf) raf = requestAnimationFrame(render);
  }
  function armConduit() {
    if (!chargeArmed || active !== connection || paused || !full()) return;
    chargeArmed = false;
    connection.dataset.charge = 'true';
    clearTimeout(chargeTimer);
    chargeTimer = setTimeout(() => { delete connection.dataset.charge; chargeTimer = 0; }, 1600);
  }
  function selectVisibleScene() {
    let winner = null, best = 0;
    for (const scene of scenes) {
      const box = scene.getBoundingClientRect();
      const visible = Math.max(0, Math.min(innerHeight, box.bottom) - Math.max(78, box.top));
      if (visible > best) { best = visible; winner = scene; }
    }
    if (winner !== active) { resetLight(); active = winner; }
    scenes.forEach(scene => { scene.dataset.live = String(scene === active && !paused); });
    viewportDirty = false;
    armConduit();
  }
  function paint() {
    if (!active) return;
    const values = {
      '--lx': `${(50 + x * 36).toFixed(2)}%`, '--ly': `${(45 + y * 33).toFixed(2)}%`,
      '--shift-x': `${(x * 12).toFixed(2)}px`, '--shift-y': `${(y * 9).toFixed(2)}px`,
      '--shadow-x': `${(14 - x * 20).toFixed(2)}px`, '--shadow-y': `${(28 - y * 12).toFixed(2)}px`,
      '--glint-x': `${(x * 50).toFixed(2)}px`, '--glint-y': `${(y * 20).toFixed(2)}px`,
      '--tension': `${(x * .24).toFixed(3)}deg`
    };
    for (const [name, value] of Object.entries(values)) active.style.setProperty(name, value);
  }
  function render(now) {
    raf = 0;
    if (viewportDirty) selectVisibleScene();
    if (paused || !full() || !active) return;
    if (pointer) {
      const box = active.getBoundingClientRect();
      tx = clamp(((pointer.x - box.left) / box.width - .5) * 2, -1, 1);
      ty = clamp(((pointer.y - box.top) / box.height - .5) * 2, -1, 1);
      pointer = null;
    }
    if (!deadline) return;
    const dt = lastTime ? clamp((now - lastTime) / 16.667, .5, 2) : 1;
    lastTime = now;
    // Damped mass: only reflection, shadow and at most .24deg of case tension.
    const damping = Math.pow(.68, dt);
    vx = (vx + (tx - x) * .095 * dt) * damping;
    vy = (vy + (ty - y) * .095 * dt) * damping;
    x = clamp(x + vx * dt, -1, 1); y = clamp(y + vy * dt, -1, 1);
    if (now >= deadline || Math.abs(tx-x) + Math.abs(ty-y) + Math.abs(vx) + Math.abs(vy) < .001) {
      x = tx; y = ty; vx = vy = 0; deadline = lastTime = 0;
    }
    paint();
    if (deadline) schedule();
  }
  function finishDevice() {
    clearTimeout(deviceTimer); deviceTimer = 0;
    device.dataset.state = opened ? 'open' : 'closed';
  }
  function setOpen(value, keyboard = false) {
    if (!value && details.contains(document.activeElement)) ignition.focus({ preventScroll: true });
    opened = value;
    clearTimeout(deviceTimer);
    device.dataset.state = value ? 'opening' : 'closing';
    workshop.dataset.powered = String(value);
    details.hidden = !value;
    screen.setAttribute('aria-hidden', String(!value));
    ignition.setAttribute('aria-expanded', String(value));
    ignition.querySelector('span').textContent = value ? 'Zamknij moduł' : 'Otwórz moduł';
    chargeArmed = value;
    if (!value) { clearTimeout(chargeTimer); chargeTimer = 0; delete connection.dataset.charge; }
    if (paused) finishDevice();
    else deviceTimer = setTimeout(finishDevice, narrow.matches ? 850 : 1120);
    if (value && keyboard) details.querySelector('a')?.focus({ preventScroll: true });
    armConduit();
  }
  function syncMotion() {
    paused = userPaused || reduced.matches || document.hidden || leaving;
    root.dataset.motion = paused ? 'paused' : 'running';
    root.dataset.quality = full() ? 'full' : 'compact';
    pauseButton.disabled = reduced.matches;
    pauseButton.setAttribute('aria-pressed', String(userPaused || reduced.matches));
    pauseButton.textContent = reduced.matches ? 'Ruch ograniczony' : userPaused ? 'Wznów ruch' : 'Wstrzymaj ruch';
    if (paused || !full()) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0; resetLight(); finishDevice();
      clearTimeout(chargeTimer); chargeTimer = 0; delete connection.dataset.charge;
    }
    selectVisibleScene();
  }

  root.dataset.enhanced = 'true';
  ignition.hidden = pauseButton.hidden = false;
  setOpen(false);
  ignition.addEventListener('click', event => setOpen(!opened, event.detail === 0));
  pauseButton.addEventListener('click', () => { userPaused = !userPaused; syncMotion(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && opened) { setOpen(false); ignition.focus({ preventScroll: true }); }
  });
  // One pointermove listener for the whole proof. Native scrolling stays native.
  document.addEventListener('pointermove', event => {
    if (paused || !full() || event.pointerType === 'touch') return;
    const scene = event.target.closest?.('[data-scene]');
    if (scene !== active || !scene) return;
    pointer = { x: event.clientX, y: event.clientY };
    deadline = performance.now() + 650;
    schedule();
  }, { passive: true });
  document.addEventListener('pointerleave', () => {
    if (paused || !full()) return;
    pointer = null; tx = ty = 0; deadline = performance.now() + 650; schedule();
  });
  document.addEventListener('visibilitychange', syncMotion);
  addEventListener('pagehide', () => { leaving = true; syncMotion(); });
  addEventListener('pageshow', () => { leaving = false; syncMotion(); });
  addEventListener('scroll', () => { viewportDirty = true; schedule(); }, { passive: true });
  addEventListener('resize', () => { resetLight(); viewportDirty = true; schedule(); });
  [reduced, narrow, fine].forEach(media => media.addEventListener('change', syncMotion));
  navigator.connection?.addEventListener('change', syncMotion);
  syncMotion();
})();
