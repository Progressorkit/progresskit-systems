"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const mod = () => import("../assets/showroom-lifecycle.mjs");
test("Scene frame loop has one owner, bounded cadence and idempotent cleanup", async () => {
  const { frameLoop } = await mod();
  let id = 0,
    draws = 0;
  const pending = new Map();
  const loop = frameLoop(() => draws++, {
    request: (fn) => {
      pending.set(++id, fn);
      return id;
    },
    cancel: (key) => pending.delete(key),
    now: () => 20,
    fps: 30,
  });
  loop.start();
  loop.start();
  assert.equal(pending.size, 1);
  const tick = (t) => {
    const [key, fn] = pending.entries().next().value;
    pending.delete(key);
    fn(t);
  };
  tick(100);
  tick(110);
  assert.equal(draws, 1);
  tick(140);
  assert.equal(draws, 2);
  loop.stop();
  assert.equal(pending.size, 0);
  loop.still();
  assert.equal(draws, 3);
  loop.destroy();
  loop.destroy();
  loop.start();
  loop.still();
  assert.equal(draws, 3);
  assert.equal(pending.size, 0);
});
test("Stopping or destroying from inside render never reschedules a leaked RAF", async () => {
  const { frameLoop } = await mod();
  let fn,
    requests = 0;
  let loop = frameLoop(() => loop.destroy(), {
    request: (f) => {
      fn = f;
      return ++requests;
    },
    cancel: () => {},
    now: () => 0,
  });
  loop.start();
  fn(100);
  assert.equal(requests, 1);
  assert.equal(loop.pending, false);
});
test("Resource ownership removes listeners and disposes in reverse order once", async () => {
  const { resourceScope } = await mod();
  const scope = resourceScope(),
    target = new EventTarget(),
    order = [];
  scope.listen(target, "x", () => order.push("event"));
  scope.add(() => order.push("first"));
  scope.add(() => order.push("last"));
  target.dispatchEvent(new Event("x"));
  scope.dispose();
  scope.dispose();
  target.dispatchEvent(new Event("x"));
  scope.add(() => order.push("late"));
  assert.deepEqual(order, ["event", "last", "first", "late"]);
  assert.equal(scope.size, 0);
});
test("Adaptive quality caps DPR and progressively reduces real GPU geometry", async () => {
  const { qualityProfile } = await mod();
  const full = qualityProfile(1200, 3),
    low = qualityProfile(1200, 3, 2),
    mobile = qualityProfile(390, 3, 2);
  assert.ok(full.dpr <= 1);
  assert.ok(low.dpr < full.dpr);
  assert.ok(low.roots < full.roots);
  assert.ok(mobile.roots <= low.roots);
  assert.ok(mobile.transmission < full.transmission);
  assert.ok(full.roots * 3 <= 72);
  assert.equal(full.fps, 60);
  assert.equal(mobile.fps, 30);
  assert.ok(mobile.dpr >= 0.5);
});

test("Cadence keeps fractional time on irregular displays and adapts to mobile FPS", async () => {
  const { frameLoop } = await mod();
  let callback,
    draws = 0;
  const loop = frameLoop(() => draws++, {
    request: (fn) => ((callback = fn), 1),
    cancel: () => {},
    fps: 30,
  });
  loop.start();
  for (let t = 100; t < 2100; t += 1000 / 144) callback(t);
  assert.ok(draws >= 59 && draws <= 61, `actual draws ${draws}`);
  loop.setFPS(24);
  draws = 0;
  for (let t = 2100; t < 4100; t += 1000 / 144) callback(t);
  assert.ok(draws >= 47 && draws <= 50);
  loop.destroy();
});
