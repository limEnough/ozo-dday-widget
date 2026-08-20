import type { Limits, StoreResult, Widget, WidgetInput } from "./types";

/** preload.js가 contextBridge로 노출하는 API */
export interface WidgetApi {
  list(): Promise<Widget[]>;
  find(id: string): Promise<Widget | null>;
  limits(): Promise<Limits>;

  create(input: WidgetInput): Promise<StoreResult>;
  update(id: string, patch: WidgetInput): Promise<StoreResult>;
  remove(id: string): Promise<StoreResult>;
  setEnabled(id: string, enabled: boolean): Promise<StoreResult>;

  confirm(message: string): Promise<boolean>;
  alert(message: string): Promise<boolean>;

  resizeToContent(width: number, height: number): void;
  dragStart(): void;
  dragEnd(): void;
  showWidgetMenu(): void;
  bringToFront(): void;

  openManager(editId?: string | null): void;
  closeManager(): void;
  showListMenu(id: string): void;

  onWidgetsChanged(handler: (widgets: Widget[]) => void): () => void;
  onEditRequest(handler: (id: string) => void): () => void;
}

declare global {
  interface Window {
    api?: WidgetApi;
  }
}

/** Electron 밖(브라우저)에서 열렸을 때 화면이 죽지 않도록 하는 대체 구현 */
function createStub(): WidgetApi {
  const noop = () => {};
  const unsubscribe = () => noop;
  console.warn("preload API를 찾을 수 없습니다. Electron에서 실행해 주세요.");
  return {
    list: async () => [],
    find: async () => null,
    limits: async () => ({ maxWidgets: 10, maxDDay: 1000, colorCount: 10 }),
    create: async () => ({ ok: false, error: "NOT_FOUND" }),
    update: async () => ({ ok: false, error: "NOT_FOUND" }),
    remove: async () => ({ ok: false, error: "NOT_FOUND" }),
    setEnabled: async () => ({ ok: false, error: "NOT_FOUND" }),
    confirm: async () => false,
    alert: async () => true,
    resizeToContent: noop,
    dragStart: noop,
    dragEnd: noop,
    showWidgetMenu: noop,
    bringToFront: noop,
    openManager: noop,
    closeManager: noop,
    showListMenu: noop,
    onWidgetsChanged: unsubscribe,
    onEditRequest: unsubscribe,
  };
}

export const api: WidgetApi = window.api ?? createStub();
