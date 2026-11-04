/* Scheduler is independent of Three so cancellation and visibility are testable. */
export function frameLoop(
  draw,
  {
    request = requestAnimationFrame,
    cancel = cancelAnimationFrame,
    now = () => performance.now(),
    fps = 30,
  } = {},
) {
  let id = 0,
    running = false,
    dead = false,
    last = 0,
    due = 0;
  function tick(time) {
    id = 0;
    if (!running || dead) return;
    const interval = 1000 / fps;
    if (!last || time >= due - 1) {
      const dt = last ? Math.min(0.5, (time - last) / 1000) : 1 / fps;
      due = due
        ? due + (Math.floor(Math.max(0, time - due) / interval) + 1) * interval
        : time + interval;
      last = time;
      draw(dt, time);
    }
    if (running && !dead) id = request(tick);
  }
  return {
    start() {
      if (dead || running) return;
      running = true;
      last = 0;
      due = 0;
      id = request(tick);
    },
    stop() {
      running = false;
      if (id) cancel(id);
      id = 0;
      last = 0;
      due = 0;
    },
    still() {
      if (!dead) draw(0, now());
    },
    destroy() {
      this.stop();
      dead = true;
    },
    setFPS(value) {
      fps = Math.max(1, Math.min(60, value));
      due = 0;
    },
    get pending() {
      return id !== 0;
    },
    get running() {
      return running;
    },
  };
}

export function resourceScope() {
  const cleanups = [];
  let dead = false;
  return {
    add(fn) {
      if (dead) fn();
      else cleanups.push(fn);
      return fn;
    },
    listen(target, type, fn, options) {
      target.addEventListener(type, fn, options);
      this.add(() => target.removeEventListener(type, fn, options));
    },
    dispose() {
      if (dead) return;
      dead = true;
      for (const fn of cleanups.splice(0).reverse()) fn();
    },
    get size() {
      return cleanups.length;
    },
  };
}
export function qualityProfile(width, dpr = 1, level = 0) {
  const compact = width <= 700;
  const ratio = Math.min(dpr, 1) * [1, 0.8, 0.65][Math.min(2, level)];
  return {
    compact,
    dpr: Math.max(0.5, ratio),
    transmission: compact ? 0.5 : 0.65,
    roots: compact ? (level ? 6 : 10) : [24, 18, 12][level],
    fps: compact ? 30 : 60,
  };
}
