/**
 * Kill running Electron/OZO 디데이 processes so release folder can be deleted.
 * Fixes EBUSY when the app or electron.exe is still running.
 */
const { execSync } = require("child_process");

if (process.platform === "win32") {
  // Try multiple names (Task Manager may show "Electron" or the .exe name)
  const names = [
    "OZO 디데이.exe",
    "electron.exe",
    "Electron.exe",
    "OZO 디데이",
    "Electron",
  ];
  for (const name of names) {
    try {
      const q = name.includes(" ") ? `"${name}"` : name;
      execSync(`taskkill /IM ${q} /F`, { stdio: "ignore", windowsHide: true });
      console.log("Stopped:", name);
    } catch (e) {
      // Process not running — ignore
    }
  }
}
