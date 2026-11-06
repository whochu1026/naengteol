# 냉털

냉장고에 있는 식재료와 유통기한을 관리하는 웹 애플리케이션입니다.

보유·임박·소비·폐기 흐름을 한곳에서 다루며, 오늘·이번 주 먹을 것 계획, 빠른 재등록, 통계·휴지통까지 MVP 범위로 구현했습니다.

| 구분 | 주소 |
|------|------|
| 웹 | http://localhost:3000 |
| API | http://localhost:4000 |
| API 문서 (Swagger) | http://localhost:4000/api/docs |

---

## 제출물 안내

발문 기준으로 **무엇을·왜·어떻게** 만들었는지는 아래 문서에 모았습니다. README는 실행·스택·스키마 요약의 진입점입니다.

| 제출물 | 위치 | 비고 |
|--------|------|------|
| 애플리케이션 | 이 저장소 (`frontend` + `backend`) | 식재료 리소스 CRUD 포함 웹 앱 |
| 기획서 | **[docs/planning.md](./docs/planning.md)** | 문제·사용자·우선순위·화면·API·TODO |
| 아키텍처·컨벤션 | **[docs/architecture-and-conventions.md](./docs/architecture-and-conventions.md)** | 구조 다이어그램·계층·규칙·선택 이유 |
| README | 본 문서 | 실행 방법·스택·스키마·고민 |
| 라이선스 | [LICENSE](./LICENSE) | MIT |
| Postman (선택) | [postman/](./postman/) | 로컬 API 스모크용 컬렉션 |

보강 자료: [docs/schema.md](./docs/schema.md) · [docs/architecture.md](./docs/architecture.md) · [docs/conventions.md](./docs/conventions.md) (요약 링크)

**CRUD 대응:** 식재료 `POST/GET/PATCH/DELETE /api/ingredients` (삭제는 soft delete, 영구 삭제는 purge). 사용자 계정 생성·조회·수정·탈퇴도 포함합니다.

---

## 1. 프로젝트 실행 방법

### 요구 사항

- Node.js **20 이상** (`package.json` `engines`에 명시)
- npm

### 설치

```bash
# 저장소 루트에서
npm install
npm --prefix backend install
npm --prefix frontend install
```

백엔드 환경 변수는 `backend/.env.example`을 참고해 `backend/.env`로 복사해 사용할 수 있습니다. 없어도 개발용 기본값으로 기동됩니다.

```bash
cp backend/.env.example backend/.env
```

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | `4000` | API 포트 |
| `JWT_SECRET` | `dev-only-change-me` | JWT 서명 비밀키 (운영 시 반드시 변경) |
| `JWT_EXPIRES_IN` | `7d` | 토큰 만료 |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | CORS 허용 출처 |
| `DATA_DIR` | `./data` | JSON 데이터 디렉터리 (백엔드 cwd 기준) |
| `DEMO_LOGIN` | `true` | 데모 로그인 허용 여부 (`false`로 비활성) |

프론트엔드는 `next.config.ts`에서 `/api/*`를 백엔드로 프록시합니다. 백엔드 주소가 다르면 `API_PROXY_TARGET`(기본 `http://127.0.0.1:4000`)을 설정합니다.

### 실행

```bash
# API + 웹 동시 실행
npm run dev
```

개별 실행:

```bash
npm run dev:backend   # http://localhost:4000
npm run dev:frontend  # http://localhost:3000
```

### 테스트 · 타입체크 · 린트

```bash
npm test        # 백엔드 단위·통합 테스트
npm run typecheck
npm run lint    # 프론트 ESLint
```

### 프로덕션 빌드

```bash
npm run build           # backend tsc + frontend next build (--webpack)
npm --prefix frontend run start   # 웹 (API는 별도 기동 필요)
npm --prefix backend run start    # API (build 후 dist)
```

개발 시에는 `npm run dev`만으로 충분합니다. 프론트 프로덕션 빌드는 환경에 따라 Turbopack 네이티브 바인딩이 없을 수 있어 `next build --webpack`을 사용합니다.

### 데모 로그인

로그인 화면의 **데모 계정으로 시작** 버튼으로 `demo@naengteol.local` 계정에 바로 로그인할 수 있습니다.  
평가·시연이 끝나면 `DEMO_LOGIN=false`로 끌 수 있습니다.

### Postman

선택적으로 `postman/` 아래 컬렉션·로컬 환경으로 API를 호출해 볼 수 있습니다. 계약의 기준은 Swagger(`/api/docs`)입니다.

---

## 2. 기술 스택 및 선택 이유

### 프론트엔드

| 기술 | 버전(대략) | 선택 이유 |
|------|------------|-----------|
| Next.js (App Router) | 16.x | 페이지·레이아웃 구성이 빠르고, `/api` 리버스 프록시로 쿠키 인증을 단순화 |
| React | 19.x | Next와 맞춘 최신 UI 런타임 |
| TypeScript | 5.x | API 계약·폼 상태를 타입으로 고정해 회귀를 줄임 |
| Tailwind CSS | 4.x | 유틸리티 기반으로 MVP UI를 빠르게 다듬기 위함 |
| lucide-react | — | 아이콘 일관성 |

### 백엔드

| 기술 | 버전(대략) | 선택 이유 |
|------|------------|-----------|
| Express | 4.x | REST API를 얇게 나누기 좋은 검증된 Node 서버 |
| TypeScript + tsx | 5.x / 4.x | 타입 공유에 가깝게 맞추고, 개발 시 즉시 실행 |
| Zod | 3.x | 요청 검증과 필드 단위 에러 메시지를 한곳에서 관리 |
| jsonwebtoken + cookie | — | SPA에서 HttpOnly 쿠키로 XSS 노출을 줄인 세션형 JWT |
| bcryptjs | — | 비밀번호 해시 저장 |
| swagger-ui-express + OpenAPI | — | `/api/docs`로 계약을 바로 확인 |

### 데이터·인프라

| 기술 | 선택 이유 |
|------|-----------|
| JSON 파일 저장소 (`backend/data/*.json`) | MVP에서 DB 설치·마이그레이션 비용을 빼고, 스키마·흐름 구현에 집중 |
| 로컬 단일 프로세스 | 인프라(클라우드 DB, 컨테이너 오케스트레이션)는 범위 밖. 배포 시 RDB로 교체하기 쉬운 Repository 경계만 둠 |

루트는 npm workspaces 대신 `concurrently`로 `backend`/`frontend`를 함께 띄웁니다. 패키지 경계는 유지하면서 실행만 단순화하기 위함입니다.

---

## 3. 아키텍처 및 컨벤션

### 전체 구조

```text
naengteol/
├── frontend/          # Next.js 웹
├── backend/           # Express API + OpenAPI + JSON 데이터
├── docs/              # 상세 문서
├── package.json       # dev 오케스트레이션
└── README.md
```

```text
브라우저(localhost:3000)
    │  /api/*  (Next rewrite)
    ▼
Express API(localhost:4000)
    │
    ├─ routes → controllers → services → repositories
    └─ JsonTable → backend/data/*.json
```

인프라를 별도로 구축하지 않았습니다. 개발·시연은 로컬 두 프로세스(웹·API)로 충분하고, 영속 계층은 파일 시스템입니다.

### 소스 코드 구조

**백엔드** (`backend/src/`)

| 계층 | 역할 |
|------|------|
| `routes/` | URL 매핑, 인증 미들웨어 연결 |
| `controllers/` | 요청 파싱·응답 포맷 |
| `services/` | 도메인 규칙 (소비/폐기, 합치기, 통계, 알림 대상 등) |
| `repositories/` | JSON 읽기/쓰기 |
| `validators/` | Zod 스키마 |
| `middlewares/` | JWT 인증, 에러 처리 |
| `utils/expiration.ts` | Asia/Seoul 기준 신선도 계산 |

**프론트엔드** (`frontend/src/`)

| 영역 | 역할 |
|------|------|
| `app/` | App Router 페이지 (`(main)` 보호 영역 + login/signup) |
| `components/` | `*View` 화면, 식재료 다이얼로그, `AppShell`, UI 프리미티브 |
| `lib/api.ts` | fetch 래퍼 (`credentials: "include"`) |
| `lib/types.ts` | API 계약 타입 |

### 컨벤션

- **API 응답**: 성공 `{ success: true, data }`, 실패 `{ success: false, message, errors: [{ field, message }] }`
- **인증**: HttpOnly 쿠키 `naengteol_token`. 로그아웃·비밀번호 변경·탈퇴 시 `tokenVersion` 증가로 기존 JWT 무효화
- **날짜**: 생성/수정은 ISO 시각, 유통기한·구매일·소비일은 `YYYY-MM-DD`. 신선도는 **Asia/Seoul 달력일** 기준
  - 4일 이상 → 정상(`FRESH`)
  - 0~3일 → 임박(`EXPIRING`)
  - 음수 → 만료(`EXPIRED`)
  - 날짜 없음 → 기한 미정(`UNKNOWN`)
- **네이밍**: TypeScript camelCase, REST는 명사 리소스 + 행위 서브패스 (`/consume`, `/restore`, `/purge`, `/bulk`)
- **UI 카피·에러 메시지**: 한국어
- **정적 경로 우선**: `/api/ingredients/stats` 등 고정 경로를 `/:id`보다 먼저 등록

자세한 레이어·폴더 설명은 [docs/architecture.md](./docs/architecture.md), 코딩 규칙은 [docs/conventions.md](./docs/conventions.md)를 참고하세요.

---

## 4. 데이터베이스 스키마 구조 및 설계 이유

실제 RDB 대신 **JSON 문서 3개**를 테이블처럼 사용합니다.

| 파일 | 역할 |
|------|------|
| `users.json` | 계정 |
| `categories.json` | 전역 카테고리 (사용자 공유, 시드 8종) |
| `ingredients.json` | 사용자별 식재료 |

원자적 저장을 위해 `JsonTable`이 임시 파일 기록 후 `rename`하고, 프로세스 내 쓰기 큐로 동시 쓰기를 직렬화합니다.

### 엔티티 요약

**User**  
`id`, `email`, `nickname?`, `password`(bcrypt), `tokenVersion`, `notificationSettings?`, `createdAt`, `updatedAt`

**Category**  
`id`, `name`, `sortOrder` — 채소·과일·육류·해산물·유제품·가공식품·조미료·기타

**Ingredient**  
`id`, `userId`, `categoryId`, `name`, `quantity`, `unit`,  
`purchasedAt`, `expirationDate`, `storageType`(`REFRIGERATED` \| `FROZEN` \| `ROOM`),  
`status`(`ACTIVE` \| `CONSUMED` \| `DELETED`),  
`outcome?`(`USED` \| `WASTED`), `consumedAt?`, `memo`, `createdAt`, `updatedAt`

### 상태·폐기 설계 이유

- **ACTIVE / CONSUMED / DELETED**를 나눈 이유: “먹고 끝낸 것”과 “잘못 지운 것(휴지통)”을 분리하기 위함입니다. 삭제는 soft delete → 휴지통 복구 → purge(영구 삭제)입니다.
- **outcome(USED/WASTED)** 을 `CONSUMED`에 둔 이유: 목록·필터는 소비 완료로 묶되, 통계에서 절약률(먹음 ÷ (먹음+폐기))을 내기 위함입니다. 네 번째 status로 `WASTED`를 두면 복구·일괄 처리 분기가 늘어서 기각했습니다.
- **카테고리 고정 시드**: MVP에서 사용자 정의 카테고리보다 필터·CSV 가져오기 안정성을 우선했습니다.
- **유통기한을 계산 필드로 두지 않음**: 저장은 날짜만 하고, 응답 DTO에서 `freshness`·`daysLeft`를 붙여 “오늘”이 바뀌어도 재계산됩니다.

ERD·필드 상세·상태 전이도는 [docs/schema.md](./docs/schema.md)를 참고하세요.

---

## 5. 주요 기능

- 회원가입·로그인·로그아웃·닉네임/비밀번호 변경·탈퇴
- 식재료 CRUD, 검색·필터·정렬·페이지네이션
- 부분 소비, 먹음/폐기 구분, 일괄 처리, 같은 이름 합치기
- soft delete 휴지통·복구·영구 삭제
- 대시보드, 오늘/이번 주 먹을 것, 소비·폐기 통계(절약률)
- CSV 템플릿·가져오기·내보내기
- 빠른 재등록(자주/최근 재료 → 유통기한만 입력)
- 유통기한 알림 설정(앱을 열 때 배너 + 브라우저 Notification)

---

## 6. 개발 시 고민했던 점 / 아쉬운 점

**고민**

- JSON vs RDB: 제출·시연 속도를 위해 JSON을 택하고, Service/Repository로 이후 교체 여지를 남겼습니다.
- 알림: 진짜 백그라운드 푸시(VAPID·서비스 워커)는 범위가 커서, “앱을 열 때” 확인 + 권한 UX를 명확히 하는 쪽으로 정리했습니다.
- 폐기 모델링: 별도 status vs outcome 필드 — 통계와 soft delete를 동시에 지키기 위해 outcome을 선택했습니다.
- 스택: 권장 Vue/Nest 대신 Next/Express — 익숙한 도구로 기획·구현·문서 일치에 시간을 썼습니다.

**아쉬운 점**

- 다중 인스턴스·동시 접속에는 JSON 파일이 한계입니다.
- 가족 공유 냉장고, 장보기 연동, 바코드/OCR, 카카오 로그인, Electron·LLM 연동은 고도화로 미뤘습니다.
- 데스크톱 네비에 기능을 많이 넣었다가 핵심 4개 + 계정 메뉴로 다시 줄였습니다.

고도화 TODO 전체는 [docs/planning.md §10](./docs/planning.md)을 참고하세요.

---

## 라이선스

MIT — [LICENSE](./LICENSE)
