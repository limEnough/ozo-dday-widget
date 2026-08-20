/**
 * 위젯 색상 옵션.
 * 배경은 모든 옵션이 공유하는 고정 불투명 색이고,
 * 텍스트 색과 테두리 색이 한 세트로 묶여 10가지 중 선택된다.
 */
export interface WidgetColor {
  id: number;
  name: string;
  /** 본문 텍스트 색 */
  accent: string;
  /** 테두리 색 */
  border: string;
}

/** 변경 불가한 위젯 배경색 */
export const WIDGET_BACKGROUND = "#17181C";

export const WIDGET_COLORS: WidgetColor[] = [
  { id: 0, name: "라임", accent: "#D0FF00", border: "#D0FF00" },
  { id: 1, name: "민트", accent: "#3DE8B0", border: "#3DE8B0" },
  { id: 2, name: "시안", accent: "#38D9F5", border: "#38D9F5" },
  { id: 3, name: "블루", accent: "#6AA6FF", border: "#6AA6FF" },
  { id: 4, name: "바이올렛", accent: "#A78BFA", border: "#A78BFA" },
  { id: 5, name: "핑크", accent: "#F871B8", border: "#F871B8" },
  { id: 6, name: "코랄", accent: "#FF7A6B", border: "#FF7A6B" },
  { id: 7, name: "오렌지", accent: "#FF9D3D", border: "#FF9D3D" },
  { id: 8, name: "골드", accent: "#F5CE3E", border: "#F5CE3E" },
  { id: 9, name: "화이트", accent: "#E8EAF0", border: "#E8EAF0" },
];

export function getColor(colorId: number): WidgetColor {
  return WIDGET_COLORS[colorId] ?? WIDGET_COLORS[0];
}
