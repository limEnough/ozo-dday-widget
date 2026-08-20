const { contextBridge, ipcRenderer } = require("electron");

const CHANGED = "widgets:changed";
const EDIT_REQUEST = "manager:edit-request";

contextBridge.exposeInMainWorld("api", {
  // --- 조회 ---
  list: () => ipcRenderer.invoke("store:list"),
  find: (id) => ipcRenderer.invoke("store:find", id),
  limits: () => ipcRenderer.invoke("store:limits"),

  // --- 변경 ---
  create: (input) => ipcRenderer.invoke("store:create", input),
  update: (id, patch) => ipcRenderer.invoke("store:update", { id, patch }),
  remove: (id) => ipcRenderer.invoke("store:remove", id),
  setEnabled: (id, enabled) =>
    ipcRenderer.invoke("store:set-enabled", { id, enabled }),

  // --- 대화상자 ---
  confirm: (message) => ipcRenderer.invoke("dialog:confirm", message),
  alert: (message) => ipcRenderer.invoke("dialog:alert", message),

  // --- 위젯 창 ---
  resizeToContent: (width, height) =>
    ipcRenderer.send("widget:resize", { width, height }),
  dragStart: () => ipcRenderer.send("widget:drag-start"),
  dragEnd: () => ipcRenderer.send("widget:drag-end"),
  showWidgetMenu: () => ipcRenderer.send("widget:context-menu"),
  bringToFront: () => ipcRenderer.send("widget:bring-to-front"),

  // --- 관리 창 ---
  openManager: (editId) => ipcRenderer.send("manager:open", editId ?? null),
  closeManager: () => ipcRenderer.send("manager:close"),
  showListMenu: (id) => ipcRenderer.send("manager:list-context-menu", id),

  // --- 이벤트 ---
  onWidgetsChanged: (handler) => {
    const listener = (_event, widgets) => handler(widgets);
    ipcRenderer.on(CHANGED, listener);
    return () => ipcRenderer.removeListener(CHANGED, listener);
  },
  onEditRequest: (handler) => {
    const listener = (_event, id) => handler(id);
    ipcRenderer.on(EDIT_REQUEST, listener);
    return () => ipcRenderer.removeListener(EDIT_REQUEST, listener);
  },
});
