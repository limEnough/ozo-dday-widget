import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import ManagerApp from "./manager/ManagerApp";
import WidgetApp from "./widget/WidgetApp";

// 하나의 번들을 위젯 창과 관리 창이 함께 쓴다. 어느 쪽인지는 쿼리로 구분한다.
// 위젯:  index.html?view=widget&id=<위젯 id>
// 관리:  index.html?view=manager
const params = new URLSearchParams(window.location.search);
const isWidget = params.get("view") === "widget";
const widgetId = params.get("id") ?? "";

document.body.classList.add(isWidget ? "view-widget" : "view-manager");

const container = document.getElementById("root");
if (!container) throw new Error("#root 를 찾을 수 없습니다.");

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    {isWidget ? <WidgetApp widgetId={widgetId} /> : <ManagerApp />}
  </React.StrictMode>,
);
