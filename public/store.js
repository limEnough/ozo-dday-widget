const { app } = require("electron");
const path = require("path");
const fs = require("fs");

const STORE_FILE = "widgets.json";

const MAX_WIDGETS = 10;
const MAX_DDAY = 1000;
const COLOR_COUNT = 10;

/**
 * 위젯 한 건의 형태
 * {
 *   id: string,
 *   title: string,        // 빈 문자열 허용
 *   targetDate: string,   // "YYYY-MM-DD", 빈 문자열이면 미설정
 *   colorId: number,      // 0 ~ 9
 *   enabled: boolean,     // 바탕화면 표시 여부
 *   x: number | null,     // 저장된 위치 (없으면 자동 배치)
 *   y: number | null,
 *   createdAt: number,    // z-order 기준: 클수록(최신일수록) 앞
 * }
 */

let widgets = null;
let seq = 0;

function storePath() {
  return path.join(app.getPath("userData"), STORE_FILE);
}

function toInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function normalize(raw, index) {
  const createdAt = toInt(raw && raw.createdAt, Date.now() + index);
  const colorId = toInt(raw && raw.colorId, 0);
  return {
    id: String((raw && raw.id) || `w${createdAt}-${index}`),
    title: typeof (raw && raw.title) === "string" ? raw.title : "",
    targetDate: isDateString(raw && raw.targetDate) ? raw.targetDate : "",
    mode: (raw && raw.mode) === "since" ? "since" : "until",
    colorId: colorId >= 0 && colorId < COLOR_COUNT ? colorId : 0,
    enabled: (raw && raw.enabled) !== false,
    x: raw && Number.isFinite(raw.x) ? Math.trunc(raw.x) : null,
    y: raw && Number.isFinite(raw.y) ? Math.trunc(raw.y) : null,
    createdAt,
  };
}

function load() {
  if (widgets) return widgets;
  try {
    const parsed = JSON.parse(fs.readFileSync(storePath(), "utf8"));
    widgets = Array.isArray(parsed) ? parsed.map(normalize) : [];
  } catch (_) {
    // 파일이 없거나 깨진 경우 빈 목록에서 시작한다
    widgets = [];
  }
  seq = widgets.length;
  return widgets;
}

function persist() {
  try {
    fs.mkdirSync(path.dirname(storePath()), { recursive: true });
    fs.writeFileSync(storePath(), JSON.stringify(widgets, null, 2), "utf8");
  } catch (err) {
    console.error("위젯 목록 저장 실패:", err);
  }
}

function isDateString(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** "YYYY-MM-DD"를 로컬 자정 Date로 변환. 실제 존재하지 않는 날짜는 null */
function parseDate(value) {
  if (!isDateString(value)) return null;
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

/** 오늘 자정 기준 남은 일수. 날짜가 없거나 잘못되면 null */
function diffDays(value) {
  const target = parseDate(value);
  if (!target) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/** 목표일이 D-1000 ~ D+1000 범위 안인지 */
function isWithinDDayLimit(value) {
  if (value === "") return true; // 미설정은 허용
  const days = diffDays(value);
  if (days === null) return false;
  return Math.abs(days) <= MAX_DDAY;
}

function sanitizeInput(input, base) {
  const next = { ...base };
  if (typeof input.title === "string") next.title = input.title.trim().slice(0, 40);
  if (typeof input.targetDate === "string") {
    next.targetDate = isDateString(input.targetDate) ? input.targetDate : "";
  }
  if (input.mode === "since" || input.mode === "until") next.mode = input.mode;
  if (input.colorId !== undefined) {
    const colorId = toInt(input.colorId, next.colorId);
    next.colorId = colorId >= 0 && colorId < COLOR_COUNT ? colorId : next.colorId;
  }
  if (typeof input.enabled === "boolean") next.enabled = input.enabled;
  if (Number.isFinite(input.x)) next.x = Math.trunc(input.x);
  if (Number.isFinite(input.y)) next.y = Math.trunc(input.y);
  return next;
}

function list() {
  return load().map((w) => ({ ...w }));
}

function find(id) {
  const found = load().find((w) => w.id === id);
  return found ? { ...found } : null;
}

function count() {
  return load().length;
}

function create(input = {}) {
  const all = load();
  if (all.length >= MAX_WIDGETS) {
    return { ok: false, error: "LIMIT_COUNT" };
  }
  const createdAt = Date.now();
  seq += 1;
  const widget = sanitizeInput(input, {
    id: `w${createdAt}-${seq}`,
    title: "",
    targetDate: "",
    mode: "until",
    colorId: 0,
    enabled: true,
    x: null,
    y: null,
    createdAt,
  });
  if (!isWithinDDayLimit(widget.targetDate)) {
    return { ok: false, error: "LIMIT_DDAY" };
  }
  all.push(widget);
  persist();
  return { ok: true, widget: { ...widget } };
}

function update(id, patch = {}) {
  const all = load();
  const index = all.findIndex((w) => w.id === id);
  if (index === -1) return { ok: false, error: "NOT_FOUND" };

  const next = sanitizeInput(patch, all[index]);
  if (!isWithinDDayLimit(next.targetDate)) {
    return { ok: false, error: "LIMIT_DDAY" };
  }
  all[index] = next;
  persist();
  return { ok: true, widget: { ...next } };
}

function remove(id) {
  const all = load();
  const index = all.findIndex((w) => w.id === id);
  if (index === -1) return { ok: false, error: "NOT_FOUND" };
  all.splice(index, 1);
  persist();
  return { ok: true };
}

/** 첫 실행 시 안내용 위젯 하나를 만들어 둔다 */
function ensureSeed() {
  if (load().length > 0) return null;
  const result = create({ title: "", targetDate: "", colorId: 0 });
  return result.ok ? result.widget : null;
}

module.exports = {
  MAX_WIDGETS,
  MAX_DDAY,
  COLOR_COUNT,
  list,
  find,
  count,
  create,
  update,
  remove,
  ensureSeed,
  diffDays,
  isWithinDDayLimit,
};
