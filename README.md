# Realtime Stock Candle Visualization (Phase 1 Complete)

Next.js 환경에서 고빈도 주식 시세 데이터를 부드럽고 끊김 없이 시각화하기 위한 실험 프로젝트입니다.
Phase 1 구현이 완료되었으며, 외부 시세 API 대신 금융 공학 기반의 Mock 데이터를 사용하여 렌더링 최적화 구조와 실시간 캔들 업데이트 파이프라인을 구축했습니다.

---

## 핵심 요약

본 프로젝트는 고성능 금융 차트 구현을 위해 React 렌더 사이클과 브라우저 Paint 사이클을 분리한 아키텍처를 지향합니다.
Phase 1에서는 GBM(기하 브라운 운동) 기반 틱 스트림 생성, RAF(RequestAnimationFrame) 기반 Producer-Consumer 파이프라인, 그리고 1분 단위 OHLC 캔들 렌더링 최적화를 완료했습니다.

---

## 프로젝트 목표 및 주요 기능 (Phase 1)

### 핵심 목표

- 고빈도 Tick 데이터를 실시간으로 생성 및 1분 단위 OHLC 집계
- RAF 기반 렌더링 루프로 메인 스레드 부하 및 UI 버벅임 최소화
- 불필요한 React 리렌더링을 차단하고 Canvas 엔진(Lightweight Charts)을 직접 제어
- Next.js App Router 환경에서 SSR-safe한 차트 컴포넌트 구성

### 구현된 주요 기능

- KRW ₩75,000+ 기준의 현실적인 가격 스케일 및 포맷터 적용
- 한국형 시간 포맷 ("MM-DD:HH:mm" 축, 툴팁 내 풀 데이트타임 표시)
- 레이아웃 스래시(Layout Thrash)를 최적화한 마우스 추적 OHLC 툴팁
- 속도 프리셋 제어 (0.5x, 1x, 2x, 5x) 및 시뮬레이션 일시정지/재개
- "Go to Realtime" 기능을 포함한 자유로운 드래그/줌 상호작용
- 탭 비가시성(Tab Visibility)에 따른 리소스 자동 관리

---

## 아키텍처 (Architecture)

```mermaid
graph LR
  Producer[GBM Producer RAF + TICK_INTERVAL]
  --> Queue[RAF Queue drainToZero()]
  --> Consumer[Chart Consumer requestAnimationFrame]
  --> CandleChart[Custom KRW OHLC Tooltip]

  UI[Speed/GoRealtime Pause/Resume] --> Producer
  TabVisibility --> Producer
```

### 데이터 흐름

1. Producer: GBM 모델로 새로운 Tick 가격을 생성해 메시지 큐에 push합니다.
2. Buffer: 실시간 Tick 데이터를 임시 저장하는 큐 역할을 수행합니다.
3. Consumer: requestAnimationFrame 루프에서 큐를 배치 처리(drain)하며 1분 OHLC로 집계합니다.
4. Renderer: Lightweight Charts의 series.update()를 호출해 라이브 캔들을 즉시 반영합니다.

---

## 기술 스택 (Tech Stack)

- Framework: Next.js 15+ (App Router)
- Chart Library: Lightweight Charts
- State Management: Zustand (UI 상태 관리용)
- Streaming: Recursive setTimeout + Queue + RAF
- Testing: Vitest (Unit), Playwright (E2E)
- Package Manager: pnpm

---

## 빠른 시작 및 테스트

### 설치 및 실행

```bash
git clone <repo-url>
cd realtime-candle-chart
pnpm install
pnpm dev
```

### 테스트 실행

```bash
pnpm test # Vitest 단위 테스트
pnpm exec playwright test # Playwright E2E 테스트
```

---

## 에이전트 워크플로 및 저장소 규칙

이 프로젝트는 Cursor Agent 기반의 병렬 개발 워크플로를 전제로 운영됩니다.

### 개발 원칙

- 고빈도 Tick 데이터는 React State에 직접 저장하지 않고 Ref/Queue 기반으로 처리합니다.
- Chart 관련 로직은 Client-only로 유지하며 SSR 충돌을 방지합니다.
- 모든 작업은 작은 단위로 분리하여 코드 리뷰와 자동화 테스트를 병행합니다.
- AI 에이전트가 제안한 변경 사항은 인간의 검토 및 승인 후 커밋하는 프로세스를 따릅니다.

### 관련 문서

- docs/spec-phase1.md: 세부 구현 명세
- .cursor/rules/: 에이전트 동작 및 Git 워크플로 규칙

---

## 데모 스크린샷

![Realtime Candle Chart Demo](chart-full.png)
(위 이미지는 Phase 1 실시간 캔들 차트 동작 화면의 예시입니다.)

---

## 로드맵 (Roadmap)

- Phase 2: WebSocket 실시간 데이터 연동 및 네트워크 복구 로직 구현
