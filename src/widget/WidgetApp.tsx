import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { api } from "../shared/api";
import { getColor, WIDGET_BACKGROUND } from "../shared/colors";
import { formatDDay, msUntilMidnight, NO_DATE_LABEL } from "../shared/dday";
import type { Widget } from "../shared/types";
import "./widget.css";

/** 이 거리 미만으로 움직였으면 드래그가 아니라 클릭으로 본다 */
const CLICK_SLOP = 4;

interface Props {
  widgetId: string;
}

function WidgetApp({ widgetId }: Props) {
  const [widget, setWidget] = useState<Widget | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const pressRef = useRef<{ x: number; y: number } | null>(null);

  // 자정을 넘기면 D-Day가 달라지므로 다시 계산한다
  const [dayTick, setDayTick] = useState(0);

  // --- 내 위젯 데이터 구독 ---
  useEffect(() => {
    let alive = true;
    const sync = async () => {
      const found = await api.find(widgetId);
      if (alive) setWidget(found);
    };
    sync();
    return api.onWidgetsChanged((widgets) => {
      if (alive) setWidget(widgets.find((w) => w.id === widgetId) ?? null);
    });
  }, [widgetId]);

  useEffect(() => {
    const timer = setTimeout(() => setDayTick((n) => n + 1), msUntilMidnight());
    return () => clearTimeout(timer);
  }, [dayTick]);

  // --- 콘텐츠 크기에 맞춰 창 크기를 맞춘다 (content-fit) ---
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame || !widget) return;

    const report = () => {
      const rect = frame.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        api.resizeToContent(Math.ceil(rect.width), Math.ceil(rect.height));
      }
    };

    report();
    const observer = new ResizeObserver(report);
    observer.observe(frame);
    // 웹폰트가 늦게 적용되면 글자 폭이 달라지므로 한 번 더 측정한다
    document.fonts?.ready.then(report).catch(() => {});
    return () => observer.disconnect();
  }, [widget, dayTick]);

  // --- 드래그로 위치 이동 ---
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button !== 0) return;
    pressRef.current = { x: event.screenX, y: event.screenY };
    api.dragStart();
  }, []);

  useEffect(() => {
    const stop = () => {
      if (!pressRef.current) return;
      pressRef.current = null;
      api.dragEnd();
    };
    window.addEventListener("mouseup", stop);
    window.addEventListener("blur", stop);
    return () => {
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("blur", stop);
    };
  }, []);

  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    const press = pressRef.current;
    const moved =
      press &&
      (Math.abs(event.screenX - press.x) > CLICK_SLOP ||
        Math.abs(event.screenY - press.y) > CLICK_SLOP);
    if (moved) return; // 드래그 끝에 발생한 더블클릭은 무시
    api.openManager();
  }, []);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    api.showWidgetMenu();
  }, []);

  if (!widget) return <div className="widget-frame" ref={frameRef} />;

  const color = getColor(widget.colorId);
  const hasDate = widget.targetDate !== "";
  const label = formatDDay(widget.targetDate, widget.mode);

  return (
    <div className="widget-frame" ref={frameRef}>
      <div
        className="widget"
        style={
          {
            "--accent": color.accent,
            "--border": color.border,
            "--bg": WIDGET_BACKGROUND,
          } as React.CSSProperties
        }
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        title={hasDate ? widget.title || label : NO_DATE_LABEL}
      >
        {widget.title ? <div className="widget__title">{widget.title}</div> : null}
        <div className={hasDate ? "widget__dday" : "widget__dday widget__dday--empty"}>
          {label}
        </div>
      </div>
    </div>
  );
}

export default WidgetApp;
