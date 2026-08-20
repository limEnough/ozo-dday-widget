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

  const options = {
    icon: iconPath,
    "version-string": {
      ProductName: APP_NAME,
      FileDescription: APP_NAME,
      CompanyName: "OZO",
    },
  };

  // 갓 만들어진 exe를 백신이 검사하는 동안 잠겨 있어
  // rcedit이 "Unable to commit changes"로 실패하는 경우가 있다. 잠시 기다렸다 다시 시도한다.
  const MAX_ATTEMPTS = 6;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await rceditFn(exePath, options);
      console.log("set-icon (afterPack): applied to", path.basename(exePath));
      return;
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) throw err;
      const waitMs = attempt * 3000;
      console.log(
        `set-icon (afterPack): 파일이 잠겨 있어 ${waitMs / 1000}초 후 재시도 (${attempt}/${MAX_ATTEMPTS - 1})`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
};
