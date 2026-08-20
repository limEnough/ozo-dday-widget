const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  dialog,
  ipcMain,
  screen,
  shell,
} = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");
const store = require("./store");

const isDev = !app.isPackaged; // 패키징된 exe가 아니면 개발 모드
const APP_ID = "com.ozo.dday-widget";

/** 관리 화면을 "새 위젯" 작성 상태로 여는 신호 */
const NEW_WIDGET = "new";

/** 위젯 id -> BrowserWindow */
const widgetWindows = new Map();
/** webContents.id -> 위젯 id (IPC 발신자 식별용) */
const senderToWidget = new Map();

let managerWindow = null;
let tray = null;
let dragState = null;

// ---------------------------------------------------------------- URL / 경로

function rendererUrl(query) {
  const base = isDev
    ? "http://localhost:3000/"
    : pathToFileURL(path.join(__dirname, "index.html")).toString();
  const search = new URLSearchParams(query).toString();
  return `${base}?${search}`;
}

function iconPath() {
  return path.join(__dirname, "icon.ico");
}

function preloadPath() {
  return path.join(__dirname, "preload.js");
}

// ------------------------------------------------------------------ 위젯 창

/** 저장된 위치가 없을 때 화면 좌상단부터 계단식으로 배치한다 */
function cascadePosition() {
  const { workArea } = screen.getPrimaryDisplay();
  const step = widgetWindows.size % 8;
  return {
    x: workArea.x + 48 + step * 28,
    y: workArea.y + 48 + step * 28,
  };
}

function createWidgetWindow(widget) {
  const fallback = cascadePosition();
  const win = new BrowserWindow({
    // 실제 크기는 렌더러가 콘텐츠를 측정한 뒤 widget:resize 로 맞춘다
    width: 160,
    height: 72,
    x: widget.x === null ? fallback.x : widget.x,
    y: widget.y === null ? fallback.y : widget.y,
    title: "OZO 디데이",
    useContentSize: true,
    show: false,
    transparent: true,
    frame: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  // 전체화면 앱 위에서도 보이도록 최상위 레벨로 올린다
  win.setAlwaysOnTop(true, "screen-saver");

  widgetWindows.set(widget.id, win);
  // 창이 파괴된 뒤에는 win.webContents 접근 자체가 예외를 던지므로 미리 잡아 둔다
  const contentsId = win.webContents.id;
  senderToWidget.set(contentsId, widget.id);

  // 렌더러 측정이 실패하더라도 창이 영영 숨어 있지 않도록 보험을 둔다
  const showTimer = setTimeout(() => {
    if (!win.isDestroyed() && !win.isVisible()) win.showInactive();
  }, 2000);

  win.once("ready-to-show", () => {
    if (!win.isDestroyed()) win.showInactive();
  });

  win.on("closed", () => {
    clearTimeout(showTimer);
    senderToWidget.delete(contentsId);
    if (widgetWindows.get(widget.id) === win) widgetWindows.delete(widget.id);
  });

  win.loadURL(rendererUrl({ view: "widget", id: widget.id }));
  win.moveTop();
  return win;
}

/** 저장된 목록과 실제 창 상태를 일치시킨다 */
function syncWidgetWindows() {
  const all = store.list();
  const enabled = all.filter((w) => w.enabled);
  const wanted = new Set(enabled.map((w) => w.id));

  for (const [id, win] of [...widgetWindows]) {
    if (!wanted.has(id)) {
      widgetWindows.delete(id);
      if (!win.isDestroyed()) win.destroy();
    }
  }

  // 오래된 것부터 열어야 최신 위젯이 가장 앞에 남는다
  for (const widget of [...enabled].sort((a, b) => a.createdAt - b.createdAt)) {
    if (!widgetWindows.has(widget.id)) createWidgetWindow(widget);
  }
}

function broadcastWidgets() {
  const all = store.list();
  const targets = [...widgetWindows.values(), managerWindow].filter(
    (win) => win && !win.isDestroyed(),
  );
  for (const win of targets) win.webContents.send("widgets:changed", all);
}

/** 변경 후 창 상태와 렌더러를 한 번에 갱신한다 */
function refresh() {
  syncWidgetWindows();
  broadcastWidgets();
  updateTrayMenu();
}

// ------------------------------------------------------------------ 관리 창

function openManager(editId = null) {
  if (managerWindow && !managerWindow.isDestroyed()) {
    managerWindow.show();
    managerWindow.focus();
    if (editId) managerWindow.webContents.send("manager:edit-request", editId);
    return managerWindow;
  }

  managerWindow = new BrowserWindow({
    width: 440,
    height: 660,
    minWidth: 400,
    minHeight: 520,
    title: "OZO 디데이 · 위젯 관리",
    icon: iconPath(),
    show: false,
    frame: false,
    backgroundColor: "#111216",
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  managerWindow.once("ready-to-show", () => {
    managerWindow.show();
    if (editId) managerWindow.webContents.send("manager:edit-request", editId);
  });

  managerWindow.on("closed", () => {
    managerWindow = null;
  });

  // 외부 링크는 기본 브라우저로
  managerWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  managerWindow.loadURL(rendererUrl({ view: "manager" }));
  return managerWindow;
}

// -------------------------------------------------------------------- 대화상자

function showMessageBox(parent, options) {
  const merged = { noLink: true, title: "OZO 디데이", ...options };
  return parent && !parent.isDestroyed()
    ? dialog.showMessageBoxSync(parent, merged)
    : dialog.showMessageBoxSync(merged);
}

function confirmDialog(parent, message) {
  const response = showMessageBox(parent, {
    type: "question",
    buttons: ["취소", "확인"],
    defaultId: 1,
    cancelId: 0,
    message,
  });
  return response === 1;
}

function alertDialog(parent, message) {
  showMessageBox(parent, { type: "warning", buttons: ["확인"], message });
}

// ------------------------------------------------------------- 위젯 조작 동작

function requestDelete(id, parent) {
  if (!confirmDialog(parent, "삭제할까요?")) return;
  store.remove(id);
  refresh();
}

function setEnabled(id, enabled) {
  store.update(id, { enabled });
  refresh();
}

/** 실제 생성은 관리 화면에서 저장할 때 이뤄진다 */
function addWidget(parent) {
  if (store.count() >= store.MAX_WIDGETS) {
    alertDialog(
      parent,
      `위젯은 최대 ${store.MAX_WIDGETS}개까지 만들 수 있습니다.`,
    );
    return;
  }
  openManager(NEW_WIDGET);
}

// ------------------------------------------------------------------- 드래그

function stopDrag() {
  if (!dragState) return;
  clearInterval(dragState.timer);
  const { win, id } = dragState;
  dragState = null;
  if (win.isDestroyed()) return;
  const [x, y] = win.getPosition();
  store.update(id, { x, y });
  broadcastWidgets();
}

function startDrag(win, id) {
  stopDrag();
  const cursor = screen.getCursorScreenPoint();
  const [winX, winY] = win.getPosition();
  const offsetX = cursor.x - winX;
  const offsetY = cursor.y - winY;

  const timer = setInterval(() => {
    if (win.isDestroyed()) return stopDrag();
    const point = screen.getCursorScreenPoint();
    win.setPosition(point.x - offsetX, point.y - offsetY);
  }, 16);

  dragState = { win, id, timer };
}

// --------------------------------------------------------------------- 트레이

function updateTrayMenu() {
  if (!tray) return;
  const all = store.list();
  const items = all
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((w) => ({
      label: widgetLabel(w),
      type: "checkbox",
      checked: w.enabled,
      click: () => setEnabled(w.id, !w.enabled),
    }));

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "위젯 관리…", click: () => openManager() },
      { label: "새 위젯", click: () => addWidget(null) },
      { type: "separator" },
      ...(items.length
        ? [{ label: "위젯 표시", submenu: items }, { type: "separator" }]
        : []),
      { label: "종료", click: () => app.quit() },
    ]),
  );
}

function widgetLabel(widget) {
  if (widget.title) return widget.title;
  if (widget.targetDate) return widget.targetDate.replace(/-/g, ". ");
  return "날짜 미설정";
}

function createTray() {
  tray = new Tray(iconPath());
  tray.setToolTip("OZO 디데이");
  tray.on("double-click", () => openManager());
  updateTrayMenu();
}

// ----------------------------------------------------------------------- IPC

function widgetIdOf(event) {
  return senderToWidget.get(event.sender.id) ?? null;
}

function windowOf(event) {
  return BrowserWindow.fromWebContents(event.sender);
}

function registerIpc() {
  ipcMain.handle("store:list", () => store.list());
  ipcMain.handle("store:find", (_event, id) => store.find(id));
  ipcMain.handle("store:limits", () => ({
    maxWidgets: store.MAX_WIDGETS,
    maxDDay: store.MAX_DDAY,
    colorCount: store.COLOR_COUNT,
  }));

  ipcMain.handle("store:create", (_event, input) => {
    const result = store.create(input || {});
    if (result.ok) refresh();
    return result;
  });

  ipcMain.handle("store:update", (_event, { id, patch }) => {
    const result = store.update(id, patch || {});
    if (result.ok) refresh();
    return result;
  });

  ipcMain.handle("store:remove", (_event, id) => {
    const result = store.remove(id);
    if (result.ok) refresh();
    return result;
  });

  ipcMain.handle("store:set-enabled", (_event, { id, enabled }) => {
    const result = store.update(id, { enabled });
    if (result.ok) refresh();
    return result;
  });

  ipcMain.handle("dialog:confirm", (event, message) =>
    confirmDialog(windowOf(event), String(message ?? "")),
  );

  ipcMain.handle("dialog:alert", (event, message) => {
    alertDialog(windowOf(event), String(message ?? ""));
    return true;
  });

  // --- 위젯 창 ---
  ipcMain.on("widget:resize", (event, { width, height }) => {
    const win = windowOf(event);
    if (!win || win.isDestroyed()) return;
    const w = Math.max(1, Math.ceil(width));
    const h = Math.max(1, Math.ceil(height));
    const [curW, curH] = win.getContentSize();
    if (curW === w && curH === h) return;
    // resizable:false 상태에서는 크기 변경이 막히므로 잠시 풀었다 되돌린다
    win.setResizable(true);
    win.setContentSize(w, h);
    win.setResizable(false);
    if (!win.isVisible()) win.showInactive();
  });

  ipcMain.on("widget:drag-start", (event) => {
    const id = widgetIdOf(event);
    const win = windowOf(event);
    if (id && win && !win.isDestroyed()) startDrag(win, id);
  });

  ipcMain.on("widget:drag-end", () => stopDrag());

  ipcMain.on("widget:bring-to-front", (event) => {
    const win = windowOf(event);
    if (win && !win.isDestroyed()) win.moveTop();
  });

  ipcMain.on("widget:context-menu", (event) => {
    const id = widgetIdOf(event);
    const win = windowOf(event);
    if (!id || !win || win.isDestroyed()) return;

    Menu.buildFromTemplate([
      { label: "수정", click: () => openManager(id) },
      { label: "삭제", click: () => requestDelete(id, win) },
      { type: "separator" },
      { label: "끄기", click: () => setEnabled(id, false) },
      { label: "맨 앞으로 이동", click: () => win.moveTop() },
      { type: "separator" },
      { label: "위젯 관리…", click: () => openManager() },
    ]).popup({ window: win });
  });

  // --- 관리 창 ---
  ipcMain.on("manager:open", (_event, editId) => openManager(editId || null));

  ipcMain.on("manager:close", (event) => {
    const win = windowOf(event);
    if (win && !win.isDestroyed()) win.close();
  });

  ipcMain.on("manager:list-context-menu", (event, id) => {
    const win = windowOf(event);
    if (!id || !win || win.isDestroyed()) return;
    Menu.buildFromTemplate([
      { label: "수정", click: () => openManager(id) },
      { label: "삭제", click: () => requestDelete(id, win) },
    ]).popup({ window: win });
  });
}

// ------------------------------------------------------------------ 앱 수명주기

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => openManager());

  app.whenReady().then(() => {
    app.setAppUserModelId(APP_ID);
    registerIpc();

    // 첫 실행이면 안내용 위젯을 하나 만들어 둔다
    store.ensureSeed();

    createTray();
    syncWidgetWindows();
    updateTrayMenu();

    // 켜진 위젯이 하나도 없으면 화면에 아무것도 안 보이므로 관리 화면부터 띄운다
    if (widgetWindows.size === 0) openManager();
  });

  // 트레이에 상주하므로 위젯 창을 모두 닫아도 종료하지 않는다
  app.on("window-all-closed", () => {});

  app.on("before-quit", () => stopDrag());

  app.on("activate", () => {
    if (widgetWindows.size === 0 && !managerWindow) openManager();
  });
}
