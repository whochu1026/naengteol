# 아키텍처 · 컨벤션

냉털 소스코드를 **어떻게 나누고**, **어떤 규칙으로** 작성했는지 정리한 문서입니다.  
“구조 다이어그램 + 계층 역할 + 규칙 + 그 이유”를 한곳에 모았습니다.

관련 문서: [architecture.md](./architecture.md)(런타임 요약), [conventions.md](./conventions.md)(체크리스트), [schema.md](./schema.md)(데이터)

---

## 1. 전체 구조 (프론트 · 백엔드 · 데이터)

인프라(클라우드 DB, K8s 등)는 구축하지 않았습니다. **로컬 웹 + API + JSON 파일**입니다.

```text
┌─────────────────────────────────────────────────────────┐
│  Browser (localhost:3000)                               │
│  - App Router pages / View components                   │
│  - Cookie: naengteol_token (HttpOnly, 서버 설정)         │
└───────────────────────────┬─────────────────────────────┘
                            │  fetch /api/*  (same-origin)
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Next.js 16                                             │
│  - UI 렌더링                                            │
│  - rewrite: /api/* → http://127.0.0.1:4000/api/*        │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  Express API (localhost:4000)                           │
│  routes → controllers → services → repositories         │
│  Zod 검증 / JWT 미들웨어 / OpenAPI(/api/docs)           │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  JsonTable (원자적 파일 write)                           │
│  users.json · categories.json · ingredients.json        │
└─────────────────────────────────────────────────────────┘
```

**왜 이렇게 나눴는가**

- UI와 API를 분리해 계약(OpenAPI)·테스트를 백엔드에 고정하기 쉽다
- Next rewrite로 개발 중 쿠키 도메인을 단순화한다
- Repository 뒤에 JSON을 두어, 나중에 RDB로 바꿔도 Service 이상을 유지할 수 있다

---

## 2. 디렉터리 구조와 계층 역할

### 저장소 루트

```text
naengteol/
├── frontend/     # Next.js 웹
├── backend/      # Express API
├── docs/         # 기획·아키텍처·스키마
├── package.json  # concurrently로 동시 실행
└── README.md
```

### 백엔드 (`backend/src/`)

```text
config/          환경 변수
routes/          URL · HTTP 메서드 · requireAuth
controllers/     요청/응답 어댑터 (Zod parse, res.json)
services/        도메인 규칙 (소유권, 상태 전이, 통계)
repositories/    JSON 영속화 (JsonTable)
validators/      Zod 스키마
middlewares/     인증 · 에러 핸들러
utils/           expiration, cookies, AppError
```

| 계층 | 해도 되는 일 | 하지 않는 일 |
|------|--------------|--------------|
| Route | 경로 조립 | if문으로 비즈니스 |
| Controller | 입력 파싱·상태코드 | 파일 I/O |
| Service | 규칙·트랜잭션성 로직 | `req`/`res` 직접 사용 |
| Repository | CRUD | freshness 계산 |

**이유:** CRUD 앱에서 흔한 “라우터에 로직 몰아넣기”를 피하고, 유통기한·폐기 같은 규칙을 한곳(`service`)에 모으기 위함입니다.

### 프론트엔드 (`frontend/src/`)

```text
app/                 App Router (page는 얇게)
  (main)/            로그인 후 레이아웃 + AppShell
  login|signup/
components/          *View, 식재료 다이얼로그, ui, filters
lib/                 api.ts, types.ts, format.ts, notifications.ts
```

| 규칙 | 내용 |
|------|------|
| page.tsx | 메타데이터, View 마운트. `useSearchParams` 사용 시에만 `Suspense` |
| *View.tsx | 상태·API·화면 분기 |
| lib/api.ts | 유일한 HTTP 진입점 (`credentials: "include"`) |

**이유:** 같은 소비 다이얼로그를 대시보드·목록·계획에서 재사용하려면 페이지에 로직이 있으면 복붙이 늘어납니다.

---

## 3. 네이밍 · 코드 스타일 · 커밋

### 네이밍

| 대상 | 규칙 | 예 |
|------|------|-----|
| TS 변수/함수 | camelCase | `daysLeftOf`, `quickTemplates` |
| 타입/컴포넌트 | PascalCase | `Ingredient`, `PlanView` |
| 파일 | 역할 접미사 | `ingredient.service.ts`, `auth.routes.ts` |
| API 경로 | 복수 명사 + 행위 서브패스 | `/ingredients/:id/consume` |
| 상태 enum | UPPER_SNAKE | `ACTIVE`, `WASTED` |

### 코드 스타일

- TypeScript `strict`
- 사용자 메시지·UI 카피: **한국어**
- 서버 날짜 계산: 반드시 `utils/expiration.ts` (Asia/Seoul)
- 프론트 스타일: Tailwind 유틸리티, 공통 버튼/모달은 `components/ui.tsx`

### 커밋 메시지 (권장)

```text
feat: 식재료 부분 소비 API 추가
fix: 데스크톱 네비 항목 축소
docs: 기획서·아키텍처 문서 보강
test: 폐기(outcome) 통합 테스트
```

- 제목은 명령형·한 줄, **왜**가 필요하면 본문에 작성
- 문서만 바꾼 경우 `docs:` 로 구분

---

## 4. 에러 처리와 입력 검증

### 검증

1. 요청 body/query → **Zod** (`validators/schemas.ts`)
2. 실패 시 `AppError(400, "입력값을 확인해 주세요.", fieldErrors)`
3. 컨트롤러는 `parseInput(schema, payload)`만 호출

### 에러 응답 형식

```json
{
  "success": false,
  "message": "보유 중인 식재료만 소비할 수 있습니다.",
  "errors": [{ "field": "quantity", "message": "수량은 0보다 커야 합니다." }]
}
```

성공은 항상 `{ "success": true, "data": ... }`.

### 처리 위치

| 종류 | 처리 |
|------|------|
| 검증 실패 | Zod → 400 + field errors |
| 권한/미로그인 | 401 |
| 없거나 타인 리소스 | 404 (존재 여부 누수 최소화) |
| 잘못된 상태 전이 | 400 (예: ACTIVE가 아닌데 consume) |
| 그 외 | `errorHandler`에서 500 메시지 일반화 |

프론트는 `lib/api.ts`에서 `ApiError`로 변환하고, 폼은 `errors[].field`로 필드 하이라이트합니다.

**이유:** “메시지 문자열만 다른” 에러를 막기 위해 형식을 고정했고, 필드 에러는 UX(어느 칸이 틀렸는지)에 바로 씁니다.

---

## 5. 인증 규칙

- JWT를 **HttpOnly 쿠키** `naengteol_token`에 저장 (localStorage 금지)
- 페이로드: `sub`(userId), `email`, `ver`(tokenVersion)
- 로그아웃·비밀번호 변경·탈퇴 시 `tokenVersion` 증가 → 기존 토큰 무효
- 데모 계정: `POST /api/auth/demo` (`DEMO_LOGIN=false`로 끌 수 있음)

**이유:** XSS로 토큰이 바로 탈취되기 쉬운 저장 방식을 피하고, 과제 시연용 데모 진입을 남깁니다.

---

## 6. 데이터·도메인 규칙 (코드와 일치)

- soft delete: `DELETE` → `DELETED`, 영구 삭제는 `POST .../purge`
- 소비: `outcome=USED|WASTED`, 부분 소비는 USED만 허용
- 신선도: 저장하지 않고 조회 시 계산 (서울 날짜)
- 카테고리: 전역 시드 8종 (사용자 커스텀 없음 — MVP)

상세는 [schema.md](./schema.md), 기획 우선순위는 [planning.md](./planning.md).

---

## 7. 테스트 · 문서 동기화

- `npm test` — 유통기한 유틸 + HTTP 통합 테스트
- API 계약 — `backend/openapi.yaml` / `/api/docs`
- 기획·README·이 문서의 용어(`ACTIVE`, `outcome`, 먹을 것, 절약률)를 코드와 맞춰 유지

---

## 8. 의식적으로 지키지 않은 것

| 항목 | 이유 |
|------|------|
| Vue / Nest 권장 스택 | 익숙한 Next+Express로 완성도·문서 일치에 시간 배분 |
| Electron | 웹으로도 CRUD·일상 사용 시나리오 충족 |
| LLM MCP | 핵심 문제(재고·기한)와 직접 관련 낮음, 범위 비대화 방지 |
| 엄격한 monorepo workspace | 루트는 실행만 오케스트레이션, 패키지는 독립 install |
