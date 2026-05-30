import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, "..");

// 1. Read root package.json version
const rootPkgPath = path.join(rootDir, "package.json");
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf8"));
const version = rootPkg.version;

if (!version) {
  console.error("[Version Sync] ERROR: No version field found in root package.json!");
  process.exit(1);
}

console.log(`[Version Sync] Synchronizing workspace version to: v${version}`);

// Helper to write JSON and ensure trailing newline
const writeJson = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
};

// 2. Sync to apps/desktop/src-tauri/tauri.conf.json
const tauriConfPath = path.join(rootDir, "apps/desktop/src-tauri/tauri.conf.json");
if (fs.existsSync(tauriConfPath)) {
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf8"));
  if (tauriConf.version !== version) {
    tauriConf.version = version;
    writeJson(tauriConfPath, tauriConf);
    console.log(`[Version Sync] Updated apps/desktop/src-tauri/tauri.conf.json version to ${version}`);
  } else {
    console.log("[Version Sync] apps/desktop/src-tauri/tauri.conf.json version is already up-to-date.");
  }
}

// 3. Sync to apps/desktop/package.json
const desktopPkgPath = path.join(rootDir, "apps/desktop/package.json");
if (fs.existsSync(desktopPkgPath)) {
  const desktopPkg = JSON.parse(fs.readFileSync(desktopPkgPath, "utf8"));
  if (desktopPkg.version !== version) {
    desktopPkg.version = version;
    writeJson(desktopPkgPath, desktopPkg);
    console.log(`[Version Sync] Updated apps/desktop/package.json version to ${version}`);
  }
}

// 4. Sync to apps/web/package.json
const webPkgPath = path.join(rootDir, "apps/web/package.json");
if (fs.existsSync(webPkgPath)) {
  const webPkg = JSON.parse(fs.readFileSync(webPkgPath, "utf8"));
  if (webPkg.version !== version) {
    webPkg.version = version;
    writeJson(webPkgPath, webPkg);
    console.log(`[Version Sync] Updated apps/web/package.json version to ${version}`);
  }
}

// 5. Sync to packages/components/package.json
const compPkgPath = path.join(rootDir, "packages/components/package.json");
if (fs.existsSync(compPkgPath)) {
  const compPkg = JSON.parse(fs.readFileSync(compPkgPath, "utf8"));
  if (compPkg.version !== version) {
    compPkg.version = version;
    writeJson(compPkgPath, compPkg);
    console.log(`[Version Sync] Updated packages/components/package.json version to ${version}`);
  }
}
