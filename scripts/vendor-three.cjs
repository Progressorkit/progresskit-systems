"use strict";
const fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, ".."),
  check = process.argv.includes("--check");
const version = require(
  path.join(root, "node_modules/three/package.json"),
).version;
if (version !== require(path.join(root, "package.json")).dependencies.three)
  throw Error("Three version differs from exact package pin");
for (const [source, target] of [
  ["build/three.module.js", "three.module.js"],
  ["build/three.core.js", "three.core.js"],
  ["LICENSE", "LICENSE"],
]) {
  const data = fs.readFileSync(path.join(root, "node_modules/three", source));
  const dest = path.join(root, "assets/vendor/three", target);
  if (check) {
    if (!fs.existsSync(dest) || !data.equals(fs.readFileSync(dest)))
      throw Error("Stale vendor file " + target);
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, data);
  }
}
console.log(
  `PASS: Three.js ${version}, local modules and MIT license ${check ? "verified" : "vendored"}`,
);
