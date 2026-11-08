import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const scripts = [
  "build-fig01-hero.mjs",
  "build-fig02-instalaciones.mjs",
  "build-fig03-reaccion.mjs",
  "build-fig04-mecanica.mjs",
  "build-fig05-ecosistema.mjs",
];

for (const s of scripts) {
  for (const args of [["--audit"], ["--light"]]) {
    const res = spawnSync(process.execPath, [join(HERE, s), ...args], {
      encoding: "utf8",
      stdio: "inherit",
    });
    if ((res.status ?? 1) !== 0) process.exit(res.status ?? 1);
  }
}

const landing = spawnSync(process.execPath, [join(HERE, "build-landing-preview.mjs")], {
  encoding: "utf8",
  stdio: "inherit",
});
if ((landing.status ?? 1) !== 0) process.exit(landing.status ?? 1);
console.log("ALL 5 ANATOMY FIGURES (DARK + LIGHT) & LANDING PREVIEW BUILT + AUDITED!");
