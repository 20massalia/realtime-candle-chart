# Real-Time Stock Candle Visualization (Phase 1: Mocking)

Next.js 환경에서 고빈도 주식 시세 데이터를 부드럽고 끊김 없이 시각화하기 위한 실험 프로젝트입니다.  
Phase 1에서는 외부 시세 API 대신 금융 공학 기반의 Mock 데이터를 사용하여, **렌더링 최적화 구조**와 **실시간 캔들 업데이트 파이프라인** 구현에 집중합니다.

## Overview

이 프로젝트의 목표는 다음과 같습니다.

- 고빈도 Tick 데이터를 실시간으로 생성한다
- Tick 데이터를 1분 단위 OHLC 캔들로 집계한다
- `requestAnimationFrame` 기반 렌더링 루프로 화면 버벅임을 줄인다
- Lightweight Charts를 사용해 실시간 캔들 차트를 렌더링한다
- Next.js 환경에서 SSR 충돌 없이 차트 컴포넌트를 안전하게 분리한다

즉, 이 저장소는 단순한 차트 예제가 아니라,  
“실시간 데이터 스트리밍 + 브라우저 렌더링 최적화 + 금융 시계열 시각화”를 함께 다루는 프론트엔드 실험 프로젝트입니다.

## Goals

Phase 1의 핵심 목표는 아래와 같습니다.

- GBM(Geometric Brownian Motion) 기반 Mock Tick 생성
- Tick → 1분 OHLC 집계
- live candle 실시간 업데이트
- queue + `requestAnimationFrame` 기반 소비 구조
- 불필요한 React 리렌더링 최소화
- background tab 상태에서 리소스 사용 최소화
- Next.js에서 차트 컴포넌트의 SSR-safe 구성

## Tech Stack

- **Framework**: Next.js (App Router)
- **Chart Library**: Lightweight Charts
- **State Management**: Zustand
- **Streaming Logic**: `setInterval` + Queue + `requestAnimationFrame`
- **Language**: TypeScript

## Why This Project

이 프로젝트는 React 렌더 사이클과 브라우저 paint 사이클을 분리하고, 메시지 큐 기반 처리와 Canvas 차트 엔진을 조합해 **고성능 대시보드 구현 역량**을 키우기 위한 목적을 가집니다.

또한 외부 API 의존 없이 먼저 Mocking 단계부터 구현함으로써,  
문제의 핵심을 **데이터 수집이 아니라 렌더링 구조와 아키텍처 설계**에 맞추고자 합니다.

## Architecture

예상 데이터 흐름은 아래와 같습니다.

1. **Producer**
   - GBM 모델로 새로운 Tick 가격 생성
   - 생성된 Tick을 queue에 push

2. **Buffer**
   - 실시간 Tick 데이터를 임시 저장하는 메시지 큐

3. **Consumer**
   - `requestAnimationFrame` 루프에서 queue를 배치 처리
   - Tick을 1분 OHLC candle로 집계

4. **Renderer**
   - Lightweight Charts의 `series.update()`를 사용해 live candle 반영

## Parallel Agent Workflow

이 프로젝트는 **Cursor를 활용한 병렬 에이전트 개발 워크플로**를 전제로 설계되었습니다.

기본 운영 방식은 다음과 같습니다.

- **Writer Agent**: 기능 구현
- **Reviewer Agent**: 코드 리뷰 및 구조 점검
- **Test Agent**: 테스트/검증 포인트 확인
- **Human Reviewer**: 최종 검토 및 승인

Cursor의 Background Agents를 활용해 여러 task를 병렬로 실행하고,  
각 task는 작은 단위로 분리하여 리뷰 가능한 diff를 유지하는 것을 목표로 합니다.

이 프로젝트에서는 AI가 바로 커밋하지 않고,  
**작업 → 리뷰 → 인간 승인 → 커밋** 순서를 따릅니다.

## Repository Rules

이 저장소는 아래 원칙을 따릅니다.

- 고빈도 Tick 데이터는 React state에 직접 저장하지 않는다
- queue/ref 기반으로 버퍼링하고 `requestAnimationFrame`에서만 소비한다
- chart 관련 코드는 client-only로 유지한다
- SSR 환경에서 안전하지 않은 코드는 `dynamic(..., { ssr: false })`로 분리한다
- task 완료 후 AI는 변경 사항 요약과 리뷰 포인트만 제공하고, commit/push는 인간 승인 후 진행한다

관련 세부 규칙은 아래 파일에서 관리합니다.

- `docs/spec-phase1.md`
- `.cursor/rules/realtime-candle.mdc`
- `.cursor/rules/git-workflow.mdc`

## Planned Structure

```bash
app/
components/
lib/
stores/
docs/
.cursor/
```

예상 역할은 다음과 같습니다.

- `app/`: Next.js App Router page/layout
- `components/`: chart 관련 UI 컴포넌트
- `lib/`: GBM 생성기, aggregation, queue 로직
- `stores/`: 저빈도 UI 상태 관리
- `docs/`: 프로젝트 명세와 프롬프트 템플릿
- `.cursor/`: Cursor rules 및 MCP 설정
