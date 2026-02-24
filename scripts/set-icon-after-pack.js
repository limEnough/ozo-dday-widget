/**
 * electron-builder afterPack 훅.
 * win-unpacked 생성 직후、Setup(NSIS) 만들기 전에 exe에 아이콘을 적용한다.
 * 그래야 설치본에 들어가는 exe가 새 아이콘을 갖는다.
 */
const path = require("path");
const fs = require("fs");

const APP_NAME = "OZO 디데이";

module.exports = async function (context) {
  if (context.electronPlatformName !== "win32") return;

  const appOutDir = context.appOutDir;
  const exePath = path.join(appOutDir, `${APP_NAME}.exe`);
  const root = path.join(__dirname, "..");
  const iconPath = path.join(root, "public", "icon.ico");

  if (!fs.existsSync(exePath) || !fs.existsSync(iconPath)) return;

  const rceditFn =
    require("rcedit").rcedit ||
    require("rcedit").default ||
    require("rcedit");

  await rceditFn(exePath, {
    icon: iconPath,
    "version-string": {
      ProductName: APP_NAME,
      FileDescription: APP_NAME,
      CompanyName: "OZO",
    },
  });
  console.log("set-icon (afterPack): applied to", path.basename(exePath));
};
