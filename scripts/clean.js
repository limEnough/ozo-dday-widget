const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const dirs = ["release", "build"];
const isWin = process.platform === "win32";
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function tryRemove(dir) {
  const full = path.join(process.cwd(), dir);
  if (!fs.existsSync(full)) {
    console.log("(not found):", dir);
    return true;
  }
  try {
    fs.rmSync(full, { recursive: true, maxRetries: isWin ? 5 : 1, retryDelay: 500 });
    console.log("Deleted:", dir);
    return true;
  } catch (e) {
    if (isWin && (e.code === "EBUSY" || e.code === "EPERM")) {
      console.log("Node delete failed, trying Windows rd /s /q...");
      try {
        execSync(`rd /s /q "${full}"`, { shell: "cmd.exe", stdio: "ignore", windowsHide: true });
        console.log("Deleted (via rd):", dir);
        return true;
      } catch (e2) {
        console.error("rd also failed —", e2.message);
      }
    }
    console.error("Failed to delete", dir, "—", e.message);
    if (e.code) console.error("  code:", e.code);
    return false;
  }
}

async function main() {
  if (isWin) {
    console.log("Waiting 2s for Windows to release file handles...");
    await delay(2000);
  }

  let ok = true;
  for (const dir of dirs) {
    if (!tryRemove(dir)) ok = false;
  }

  if (!ok && isWin) {
    console.log("\nIf release is still locked:");
    console.log("  1. Close any Explorer window showing the release folder");
    console.log("  2. Open Task Manager and end 'OZO D-Day Widget' or 'Electron'");
    console.log("  3. Run: npm run clean");
    process.exit(1);
  }
}

main();
