import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../shared/api";
import { getColor, WIDGET_BACKGROUND, WIDGET_COLORS } from "../shared/colors";
import {
  type CountMode,
  dateInputBounds,
  DEFAULT_MODE,
  formatDate,
  formatDDay,
  isWithinLimit,
  LIMIT_MESSAGE,
  MODE_HINTS,
  MODE_LABELS,
  NO_DATE_LABEL,
} from "../shared/dday";
import type { Limits, Widget, WidgetInput } from "../shared/types";
import "../widget/widget.css";
import "./manager.css";

/** 관리 화면을 "새 위젯" 작성 상태로 여는 신호 (public/electron.js와 맞춤) */
const NEW_WIDGET = "new";

type View =
  | { screen: "list" }
  | { screen: "create" }
  | { screen: "edit"; id: string };

interface Draft {
  title: string;
  targetDate: string;
  mode: CountMode;
  colorId: number;
}

const EMPTY_DRAFT: Draft = {
  title: "",
  targetDate: "",
  mode: DEFAULT_MODE,
  colorId: 0,
};

/** 목록/트레이에 쓸 위젯 표시 이름 */
function widgetLabel(widget: Widget): string {
  if (widget.title) return widget.title;
  if (widget.targetDate) return formatDate(widget.targetDate);
  return "날짜 미설정";
}

function ManagerApp() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [limits, setLimits] = useState<Limits>({
    maxWidgets: 10,
    maxDDay: 1000,
    colorCount: 10,
  });
  const [view, setView] = useState<View>({ screen: "list" });
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const bounds = useMemo(dateInputBounds, []);

  // --- 목록 구독 ---
  useEffect(() => {
    let alive = true;
    api.list().then((list) => alive && setWidgets(list));
    api.limits().then((next) => alive && setLimits(next));
    const off = api.onWidgetsChanged((list) => alive && setWidgets(list));
    return () => {
      alive = false;
      off();
    };
  }, []);

  // --- 바탕화면/트레이에서 넘어온 수정 요청 ---
  useEffect(
    () =>
      api.onEditRequest(async (id) => {
        if (id === NEW_WIDGET) {
          setDraft(EMPTY_DRAFT);
          setView({ screen: "create" });
          return;
        }
        const widget = await api.find(id);
        if (!widget) return;
        setDraft({
          title: widget.title,
          targetDate: widget.targetDate,
          mode: widget.mode,
          colorId: widget.colorId,
        });
        setView({ screen: "edit", id });
      }),
    [],
  );

  const sorted = useMemo(
    () => [...widgets].sort((a, b) => b.createdAt - a.createdAt),
    [widgets],
  );

  // --- 목록 동작 ---
  const startCreate = useCallback(async () => {
    if (widgets.length >= limits.maxWidgets) {
      await api.alert(`위젯은 최대 ${limits.maxWidgets}개까지 만들 수 있습니다.`);
      return;
    }
    setDraft(EMPTY_DRAFT);
    setView({ screen: "create" });
  }, [widgets.length, limits.maxWidgets]);

  const toggle = useCallback((widget: Widget) => {
    api.setEnabled(widget.id, !widget.enabled);
  }, []);

  // --- 편집 동작 ---
  const backToList = useCallback(() => {
    setView({ screen: "list" });
    setDraft(EMPTY_DRAFT);
  }, []);

  const save = useCallback(async () => {
    if (view.screen === "list") return;

    if (!isWithinLimit(draft.targetDate)) {
      await api.alert(LIMIT_MESSAGE);
      return;
    }
    if (!(await api.confirm("저장할까요?"))) return;

    const input: WidgetInput = {
      title: draft.title,
      targetDate: draft.targetDate,
      mode: draft.mode,
      colorId: draft.colorId,
    };
    const result =
      view.screen === "create"
        ? await api.create(input)
        : await api.update(view.id, input);

    if (!result.ok) {
      if (result.error === "LIMIT_DDAY") await api.alert(LIMIT_MESSAGE);
      else if (result.error === "LIMIT_COUNT") {
        await api.alert(`위젯은 최대 ${limits.maxWidgets}개까지 만들 수 있습니다.`);
      }
      return;
    }
    backToList();
  }, [view, draft, limits.maxWidgets, backToList]);

  const isEditing = view.screen !== "list";
  const previewColor = getColor(draft.colorId);
  const previewLabel = formatDDay(draft.targetDate, draft.mode);

  return (
    <div className="app">
      <header className="titlebar">
        {isEditing ? (
          <button className="titlebar__back" onClick={backToList} title="목록으로">
            ‹
          </button>
        ) : null}
        <h1 className="titlebar__title">
          {view.screen === "create"
            ? "새 위젯"
            : view.screen === "edit"
              ? "위젯 수정"
              : "위젯 관리"}
        </h1>
        <button className="titlebar__close" onClick={() => api.closeManager()} title="닫기">
          ×
        </button>
      </header>

      {isEditing ? (
        <div className="body">
          <section className="preview">
            <div
              className="widget"
              style={
                {
                  "--accent": previewColor.accent,
                  "--border": previewColor.border,
                  "--bg": WIDGET_BACKGROUND,
                } as React.CSSProperties
              }
            >
              {draft.title ? <div className="widget__title">{draft.title}</div> : null}
              <div
                className={
                  draft.targetDate ? "widget__dday" : "widget__dday widget__dday--empty"
                }
              >
                {previewLabel}
              </div>
            </div>
          </section>

          <label className="field">
            <span className="field__label">이름 (선택)</span>
            <input
              className="input"
              type="text"
              maxLength={40}
              placeholder="예) 프로젝트 마감"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />
          </label>

          <label className="field">
            <span className="field__label">목표일</span>
            <input
              className="input"
              type="date"
              min={bounds.min}
              max={bounds.max}
              value={draft.targetDate}
              onChange={(e) => setDraft((d) => ({ ...d, targetDate: e.target.value }))}
            />
            <span className="field__hint">
              오늘로부터 D-{limits.maxDDay} ~ D+{limits.maxDDay} 범위만 지정할 수 있습니다.
            </span>
          </label>

          <div className="field">
            <span className="field__label">세는 방향</span>
            <div className="segmented" role="radiogroup">
              {(["until", "since"] as CountMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={draft.mode === mode}
                  className={
                    draft.mode === mode ? "segment segment--on" : "segment"
                  }
                  onClick={() => setDraft((d) => ({ ...d, mode }))}
                >
                  {MODE_LABELS[mode]}
                </button>
              ))}
            </div>
            <span className="field__hint">{MODE_HINTS[draft.mode]}</span>
          </div>

          <div className="field">
            <span className="field__label">색상</span>
            <div className="swatches">
              {WIDGET_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  title={color.name}
                  aria-label={color.name}
                  aria-pressed={draft.colorId === color.id}
                  className={
                    draft.colorId === color.id ? "swatch swatch--on" : "swatch"
                  }
                  style={{ "--swatch": color.accent } as React.CSSProperties}
                  onClick={() => setDraft((d) => ({ ...d, colorId: color.id }))}
                />
              ))}
            </div>
          </div>

          <footer className="actions">
            <button className="btn" onClick={backToList}>
              취소
            </button>
            <button className="btn btn--primary" onClick={save}>
              저장
            </button>
          </footer>
        </div>
      ) : (
        <div className="body">
          <div className="toolbar">
            <span className="toolbar__count">
              위젯 {widgets.length} / {limits.maxWidgets}
            </span>
            <button
              className="btn btn--primary btn--sm"
              onClick={startCreate}
              disabled={widgets.length >= limits.maxWidgets}
            >
              + 새 위젯
            </button>
          </div>

          {sorted.length === 0 ? (
            <p className="empty">
              아직 위젯이 없습니다.
              <br />
              <b>+ 새 위젯</b>으로 하나 만들어 보세요.
            </p>
          ) : (
            <ul className="list">
              {sorted.map((widget) => {
                const color = getColor(widget.colorId);
                return (
                  <li
                    key={widget.id}
                    className={widget.enabled ? "row" : "row row--off"}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      api.showListMenu(widget.id);
                    }}
                  >
                    <span
                      className="row__dot"
                      style={{ background: color.accent }}
                      aria-hidden
                    />
                    <div className="row__body">
                      <div className="row__title">{widgetLabel(widget)}</div>
                      <div className="row__meta">
                        {widget.targetDate
                          ? `${formatDate(widget.targetDate)} · ${formatDDay(widget.targetDate, widget.mode)}`
                          : NO_DATE_LABEL}
                      </div>
                    </div>
                    <button
                      className="row__more"
                      title="수정 / 삭제"
                      onClick={() => api.showListMenu(widget.id)}
                    >
                      ⋯
                    </button>
                    <label className="switch" title={widget.enabled ? "끄기" : "켜기"}>
                      <input
                        type="checkbox"
                        checked={widget.enabled}
                        onChange={() => toggle(widget)}
                      />
                      <span className="switch__track" />
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="hint">
            바탕화면 위젯을 <b>더블클릭</b>하면 이 화면이 열리고, <b>우클릭</b>하면 수정 ·
            삭제 · 끄기 · 맨 앞으로 이동을 할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}

export default ManagerApp;
