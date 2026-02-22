import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function localIsoWithOffset(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  const offsetMin = -date.getTimezoneOffset(); // minutes east of UTC
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const oh = pad(Math.floor(abs / 60));
  const om = pad(abs % 60);

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}${sign}${oh}:${om}`;
}

function readFile(p) {
  return fs.readFileSync(p, "utf8");
}
function writeFile(p, s) {
  fs.writeFileSync(p, s, "utf8");
}

function replaceOrDie(source, pattern, replacement, label) {
  const next = source.replace(pattern, replacement);
  if (next === source) die(`Non ho trovato pattern per: ${label}`);
  return next;
}

const repoRoot = process.cwd();
const appMetaPath = path.join(repoRoot, "src/meta/appMeta.ts");
const versionsPath = path.join(repoRoot, "src/meta/versions.ts");

if (!fs.existsSync(appMetaPath)) die(`File non trovato: ${appMetaPath}`);
if (!fs.existsSync(versionsPath)) die(`File non trovato: ${versionsPath}`);

const args = process.argv.slice(2);
if (args.length < 1) {
  die(`Uso:
  node scripts/release.mjs <version> [--tbd] ["note 1" "note 2" ...]
Esempio:
  node scripts/release.mjs 0.4.0 "Math fix: inverse Z3 moves" "PAR is real min clicks"
`);
}

const version = args[0];
const tbd = args.includes("--tbd");
const notes = args.filter((a) => a !== version && a !== "--tbd");

const deployedAtIso = tbd ? "TBD" : localIsoWithOffset();

// 1) Update APP_VERSION
let appMeta = readFile(appMetaPath);
appMeta = replaceOrDie(
  appMeta,
  /export\s+const\s+APP_VERSION\s*=\s*"[^"]*"\s*;/,
  `export const APP_VERSION = "${version}";`,
  "APP_VERSION"
);
writeFile(appMetaPath, appMeta);

// 2) Prepend VERSION_HISTORY entry
let versions = readFile(versionsPath);

// Very conservative insert: finds `export const VERSION_HISTORY... = [` and injects right after `[`
const entry = `  {\n` +
  `    version: "${version}",\n` +
  `    deployedAtIso: "${deployedAtIso}",\n` +
  `    notes: [\n` +
  (notes.length
    ? notes.map((n) => `      ${JSON.stringify(n)},\n`).join("")
    : `      "Release ${version}",\n`) +
  `    ],\n` +
  `  },\n`;

const marker = /export\s+const\s+VERSION_HISTORY\s*:\s*VersionMeta\[\]\s*=\s*\[\s*\n/;
if (!marker.test(versions)) die("Non trovo l'inizio di VERSION_HISTORY in versions.ts");

versions = versions.replace(marker, (m) => m + entry);
writeFile(versionsPath, versions);

// 3) Optional git operations (safe defaults: just stage + commit + tag, you can comment out)
try {
  execSync("git status --porcelain", { stdio: "pipe" });
} catch {
  // not a git repo? fine, skip
  console.log("ℹ️  Git non disponibile qui, salto commit/tag.");
  process.exit(0);
}

try {
  execSync("git add src/meta/appMeta.ts src/meta/versions.ts", { stdio: "inherit" });
  execSync(`git commit -m "release: v${version}"`, { stdio: "inherit" });
  execSync(`git tag v${version}`, { stdio: "inherit" });
  console.log(`\n✅ Release files updated + commit + tag created (v${version}).\n`);
  console.log(`Prossimo step: git push && git push origin v${version}\n`);
} catch (e) {
  die("Git commit/tag fallito. Controlla output sopra.");
}