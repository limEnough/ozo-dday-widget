const { app, BrowserWindow } = require("electron");
const path = require("path");
const isDev = !app.isPackaged; // 패키징된 exe가 아니면 개발 모드

function createWindow() {
  const win = new BrowserWindow({
    width: 60,
    height: 30,
    title: "OZO 디데이",
    transparent: true, // 배경 투명하게
    frame: false, // 상단 바 제거
    alwaysOnTop: true, // 1. 항상 위에 표시
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadURL(
    isDev
      ? "http://localhost:3000"
      : `file://${path.join(app.getAppPath(), "build", "index.html")}`,
  );
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
