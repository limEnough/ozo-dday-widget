import type { CountMode } from "./dday";

/** 위젯 한 건. 메인 프로세스의 public/store.js 와 형태를 맞춘다. */
export interface Widget {
  id: string;
  /** 위젯 상단에 표시할 이름. 빈 문자열이면 표시하지 않는다. */
  title: string;
  /** "YYYY-MM-DD". 빈 문자열이면 목표일 미설정 */
  targetDate: string;
  /** 세는 방향. until = 남은 일수(D-), since = 지난 일수(D+) */
  mode: CountMode;
  /** WIDGET_COLORS 인덱스 (0 ~ 9) */
  colorId: number;
  /** 바탕화면 표시 여부 */
  enabled: boolean;
  x: number | null;
  y: number | null;
  /** z-order 기준: 클수록(최신일수록) 앞 */
  createdAt: number;
}

/** 위젯 생성/수정 시 넘기는 값 */
export type WidgetInput = Partial<
  Pick<Widget, "title" | "targetDate" | "mode" | "colorId" | "enabled" | "x" | "y">
>;

export type StoreErrorCode = "LIMIT_COUNT" | "LIMIT_DDAY" | "NOT_FOUND";

export type StoreResult =
  | { ok: true; widget?: Widget }
  | { ok: false; error: StoreErrorCode };

export interface Limits {
  maxWidgets: number;
  maxDDay: number;
  colorCount: number;
}
