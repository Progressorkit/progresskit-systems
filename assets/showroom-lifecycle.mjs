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
  const detail = Math.max(0, Math.min(2, Math.floor(level)));
  const ratio = Math.min(dpr, 1) * [1, 0.8, 0.65][detail];
  return {
    compact,
    dpr: Math.max(0.5, ratio),
    transmission: (compact ? [0.5, 0.36, 0.25] : [0.65, 0.48, 0.32])[detail],
    roots: compact ? [10, 6, 3][detail] : [24, 16, 8][detail],
    coronaRoots: compact ? [12, 6, 0][detail] : [32, 16, 6][detail],
    dust: compact ? [18, 8, 0][detail] : [48, 24, 8][detail],
    farDust: compact ? [8, 4, 0][detail] : [18, 8, 0][detail],
    linkSegments: compact ? [8, 5, 3][detail] : [16, 10, 5][detail],
    shadows: !compact && detail === 0,
    facets: detail < 2,
    fps: compact ? 30 : 60,
  };
}

/* A clock sampled by the existing scene loop, never a second RAF or timer.
   Offscreen time advances; explicit hidden/user suspension freezes the anchor. */
export function coreAwakening(now = () => performance.now()) {
  let wanted = false, startedAt = 0, immediate = true, suspendedAt = null,
    closingFrom = 0;
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  function sample(time = now()) {
    const seconds = Math.max(0, ((suspendedAt ?? time) - startedAt) / 1000);
    if (!wanted) {
      const opening = immediate ? 0 : closingFrom * (1 - smooth(seconds / .35));
      return { phase: opening > .00001 ? 'closing' : 'idle', seconds: opening > .00001 ? seconds : 0,
        opening, reveal: 0 };
    }
    const age = immediate ? 2.2 : seconds;
    return { phase: age < .6 ? 'pulse' : age < 1.4 ? 'opening' : age < 2.2 ? 'reveal' : 'online',
      seconds: Math.min(2.2, age), opening: smooth((age - .6) / .8), reveal: smooth((age - 1.4) / .8) };
  }
  return {
    sample,
    set(value, options = {}) {
      const at = now();
      if (Boolean(value) === wanted && !options.immediate) return sample(at);
      closingFrom = sample(at).opening;
      wanted = Boolean(value);
      immediate = Boolean(options.immediate);
      startedAt = Number.isFinite(options.startedAt) ? options.startedAt : at;
      if (suspendedAt !== null) suspendedAt = at;
      return sample(at);
    },
    suspend(value, time = now()) {
      if (value && suspendedAt === null) suspendedAt = time;
      else if (!value && suspendedAt !== null) { startedAt += time - suspendedAt; suspendedAt = null; }
      return sample(time);
    },
    get wanted() { return wanted; },
    get suspended() { return suspendedAt !== null; },
  };
}
