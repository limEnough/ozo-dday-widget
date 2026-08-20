/** D-Day 계산 및 날짜 문자열 처리. 값 형식은 HTML date input과 같은 "YYYY-MM-DD". */

/** 지정 가능한 최대 일수. D-1000 ~ D+1000 */
export const MAX_DDAY = 1000;

/** 목표일이 없을 때 위젯에 표시하는 문구 */
export const NO_DATE_LABEL = "날짜를 선택해 주세요";

/** 한도를 넘겼을 때 보여주는 안내 문구 */
export const LIMIT_MESSAGE = "1000일 이상의 날짜는 지정할 수 없습니다";

const DAY_MS = 86400000;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "YYYY-MM-DD"를 로컬 자정 Date로 변환. 존재하지 않는 날짜면 null */
export function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

export function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/** 오늘 자정 기준 남은 일수. 날짜가 비었거나 잘못되면 null */
export function diffDays(value: string): number | null {
  const target = parseDate(value);
  if (!target) return null;
  return Math.round((target.getTime() - startOfToday().getTime()) / DAY_MS);
}

/** D-1000 ~ D+1000 범위 안인지. 빈 값(미설정)은 허용한다. */
export function isWithinLimit(value: string): boolean {
  if (value === "") return true;
  const days = diffDays(value);
  return days !== null && Math.abs(days) <= MAX_DDAY;
}

/** date input의 선택 가능 범위 */
export function dateInputBounds(): { min: string; max: string } {
  const today = startOfToday();
  return {
    min: toDateString(new Date(today.getTime() - MAX_DDAY * DAY_MS)),
    max: toDateString(new Date(today.getTime() + MAX_DDAY * DAY_MS)),
  };
}

/**
 * 세는 방향.
 * - until: 목표일까지 남은 일수 (D-). 당일이 D-Day
 * - since: 목표일부터 지난 일수 (D+). 당일이 1일차라 D+1
 */
export type CountMode = "until" | "since";

export const DEFAULT_MODE: CountMode = "until";

export const MODE_LABELS: Record<CountMode, string> = {
  until: "D- 남은 일수",
  since: "D+ 지난 일수",
};

export const MODE_HINTS: Record<CountMode, string> = {
  until: "목표일까지 며칠 남았는지 셉니다. 당일은 D-Day.",
  since: "목표일부터 며칠 지났는지 셉니다. 당일이 1일차라 D+1.",
};

/**
 * 위젯에 표시할 D-Day 문자열. 목표일이 없으면 안내 문구.
 * 고른 방향과 어긋나는 날짜(D- 인데 이미 지난 경우 등)는 반대 부호로 보여준다.
 */
export function formatDDay(value: string, mode: CountMode = DEFAULT_MODE): string {
  const remaining = diffDays(value);
  if (remaining === null) return NO_DATE_LABEL;

  if (mode === "since") {
    // 아직 오지 않은 날이면 남은 일수를 그대로, 당일부터는 1일차로 센다
    return remaining > 0 ? `D-${remaining}` : `D+${1 - remaining}`;
  }

  if (remaining === 0) return "D-Day";
  return remaining > 0 ? `D-${remaining}` : `D+${-remaining}`;
}

/** "2026-06-12" -> "2026. 06. 12" */
export function formatDate(value: string): string {
  return parseDate(value) ? value.replace(/-/g, ". ") : "";
}

/** 자정이 지나면 D-Day가 바뀌므로, 다음 자정까지 남은 ms */
export function msUntilMidnight(): number {
  const next = startOfToday();
  next.setDate(next.getDate() + 1);
  return Math.max(1000, next.getTime() - Date.now());
}
