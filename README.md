# OZO 디데이

바탕화면에 D-Day 위젯을 띄우는 Windows 앱입니다. 위젯은 최대 10개까지 만들 수 있고,
항상 다른 창 위에 표시되며, 트레이 아이콘으로 관리합니다.

## 배포 시 함께 전달할 안내문

설치 파일에 코드 서명이 되어 있지 않아 **Windows SmartScreen 경고가 뜹니다.**
정상이며, 아래 안내를 exe와 함께 전달해 주세요. 안내 없이 보내면 대부분 그냥 닫습니다.

---

### 📋 복사해서 쓰는 안내문

> **OZO 디데이 설치 안내**
>
> 1. `OZO 디데이 Setup 0.1.0.exe` 를 실행합니다.
> 2. **"Windows의 PC 보호"** 라는 파란 경고창이 뜹니다.
>    토이 프로젝트로 만들어본 앱이라 게시자 인증서가 없어서 나오는 안내이니 그대로 진행하시면 됩니다.(인증절차는 유료더군요)
>    - **`추가 정보`** 클릭 → **`실행`** 버튼 클릭
> 3. 설치가 끝나면 자동으로 실행됩니다. 관리 창에서 `+ 새 위젯`으로 D-Day를 등록하세요.
>
> **참고**
>
> - 관리자 권한이 필요 없습니다. 내 계정에만 설치됩니다.
> - 위젯을 모두 끄면 화면에서 사라지지만 앱은 계속 실행됩니다.
>   작업표시줄 우측 **숨겨진 아이콘(^)** 안의 트레이 아이콘을 **더블클릭**하면 관리 창이 열립니다.
> - 삭제는 `설정 → 앱 → 설치된 앱`에서 "OZO 디데이"를 제거하면 됩니다.

---

### 백신이 차단하는 경우

일부 백신은 서명 없는 설치 파일을 격리합니다. 예외 등록을 안내하거나,
코드 서명 인증서(OV/EV)를 발급받아 `package.json`의 `win.certificateFile`에 지정하면 경고가 사라집니다.

## 요구 사항

| 항목     | 내용                                                  |
| -------- | ----------------------------------------------------- |
| OS       | Windows 10 / 11 (x64)                                 |
| 권한     | 관리자 권한 불필요 (사용자별 설치)                    |
| 런타임   | 별도 설치 불필요 — Electron이 exe에 포함되어 있습니다 |
| 네트워크 | 불필요 — 폰트를 포함한 모든 자원을 앱에 번들합니다    |

설치 위치는 `%LOCALAPPDATA%\Programs\ozo-dday-widget`,
위젯 데이터는 `%APPDATA%\ozo-dday-widget\widgets.json` 에 저장됩니다.

## 개발

```bash
npm install --legacy-peer-deps   # react-scripts 5 와 TypeScript 5 의 peer 충돌 우회
npm run electron-dev             # CRA dev 서버 + Electron 동시 실행
```

`src/` (렌더러)는 저장 시 hot-reload 되지만,
`public/electron.js` · `preload.js` · `store.js` (메인 프로세스)는 **Electron을 재시작해야** 반영됩니다.

### 구조

```
public/            메인 프로세스 (CRA가 build/ 로 복사, electron-builder 진입점은 build/electron.js)
  electron.js      위젯 창 · 관리 창 · 트레이 · 컨텍스트 메뉴 · 드래그 · IPC
  preload.js       contextBridge API
  store.js         widgets.json 영속화, 개수/기간 제한 검증
src/
  shared/          types · colors · dday(D-Day 계산) · api(타입드 브리지)
  widget/          바탕화면 위젯 (콘텐츠 크기에 맞춰 창 크기 자동 조정)
  manager/         위젯 관리 화면
```

렌더러 번들 하나를 두 창이 공유하며, `?view=widget&id=…` / `?view=manager` 쿼리로 분기합니다.

## 빌드

```bash
npm run dist    # release\OZO 디데이 Setup 0.1.0.exe  (배포용 설치 파일)
npm run pack    # release\win-unpacked\               (설치 없이 실행, 빠른 확인용)
npm run clean   # 실행 중인 앱 종료 후 release/ build/ 정리 (EBUSY 발생 시)
```

버전은 `package.json`의 `version`을 올리면 파일명에 반영됩니다.

## 동작 규칙

- 위젯은 최대 **10개**. 색상은 10가지 중 선택하며 배경은 고정입니다.
- 목표일은 오늘로부터 **D-1000 ~ D+1000** 범위만 지정할 수 있습니다.
- 세는 방향을 고를 수 있습니다.
  - **D- (남은 일수)** — 당일이 `D-Day`
  - **D+ (지난 일수)** — 당일이 1일차라 `D+1`
- 위젯 **더블클릭** → 관리 창, **우클릭** → 수정 · 삭제 · 끄기 · 맨 앞으로 이동
- 되묻는 동작은 **저장**과 **삭제** 두 가지뿐입니다.
