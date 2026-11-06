# 냉털

냉장고에 보관 중인 식재료와 유통기한을 체계적으로 관리할 수 있는 웹 애플리케이션입니다.

식재료의 보유부터 소비·폐기까지의 전 과정을 관리하고, 유통기한 임박 식재료 확인, 오늘 및 이번 주 소비 계획, 빠른 재등록, 통계 및 휴지통 기능을 제공합니다.

MVP 범위 내에서 회원 관리, 식재료 관리, 소비 이력 관리 등 핵심 기능을 구현했습니다.

| 구분 | 주소 |
|------|------|
| 웹 | [http://localhost:3000](http://localhost:3000) |
| API | [http://localhost:4000](http://localhost:4000) |
| API 문서 (Swagger) | [http://localhost:4000/api/docs](http://localhost:4000/api/docs) |

---

## 관련 문서

| 문서 | 내용 |
|------|------|
| [docs/planning.md](./docs/planning.md) | 기획서 — 프로젝트 개요, 사용자, 우선순위, 화면 구성, API 및 TODO |
| [docs/architecture-and-conventions.md](./docs/architecture-and-conventions.md) | 아키텍처 및 컨벤션 — 프로젝트 구조, 계층별 역할, 개발 규칙 및 기술 선택 이유 |
| [docs/schema.md](./docs/schema.md) | 데이터 스키마 및 엔티티 관계, 상태 전이 |
| [postman/](./postman/) | 로컬 API 테스트용 Postman 컬렉션 (선택) |

---

## 1. 프로젝트 실행 방법

### 요구 사항

- Node.js **20 이상** (`package.json`의 `engines`에 명시)
- npm

### 설치

저장소 루트에서 다음 명령어를 실행합니다.

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

백엔드 환경 변수는 `backend/.env.example`을 참고해 `backend/.env`로 복사하여 사용할 수 있습니다. 환경 변수 파일이 없어도 개발용 기본값으로 실행할 수 있습니다.

```bash
cp backend/.env.example backend/.env
```

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | `4000` | API 서버 포트 |
| `JWT_SECRET` | `dev-only-change-me` | JWT 서명 비밀키 (운영 환경에서는 반드시 변경) |
| `JWT_EXPIRES_IN` | `7d` | JWT 만료 기간 |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | CORS 허용 출처 |
| `DATA_DIR` | `./data` | JSON 데이터 저장 디렉터리 (백엔드 실행 경로 기준) |
| `DEMO_LOGIN` | `true` | 데모 로그인 허용 여부 (`false`로 설정하면 비활성화) |

프론트엔드는 `next.config.ts`에서 `/api/*` 요청을 백엔드로 프록시합니다.

백엔드 주소가 다른 경우 `API_PROXY_TARGET` 환경 변수를 설정할 수 있습니다. 기본값은 `http://127.0.0.1:4000`입니다.

### 실행

API 서버와 웹 서버를 동시에 실행합니다.

```bash
npm run dev
```

개별 실행이 필요한 경우 다음 명령어를 사용합니다.

```bash
npm run dev:backend   # API 서버: http://localhost:4000
npm run dev:frontend  # 웹 서버: http://localhost:3000
```

### 테스트 · 타입 체크 · 린트

```bash
npm test        # 백엔드 단위 및 통합 테스트
npm run typecheck
npm run lint    # 프론트엔드 ESLint
```

### 프로덕션 빌드 및 실행

```bash
npm run build                       # 백엔드 TypeScript 컴파일 및 프론트엔드 Next.js 빌드
npm --prefix frontend run start    # 웹 서버 실행
npm --prefix backend run start     # API 서버 실행 (빌드 후 dist 기준)
```

개발 환경에서는 `npm run dev`만으로 웹과 API 서버를 함께 실행할 수 있습니다.

프론트엔드 프로덕션 빌드는 환경에 따라 Turbopack 네이티브 바인딩 문제가 발생할 수 있어 `next build --webpack`을 사용하도록 구성했습니다.

### 데모 로그인

로그인 화면의 **데모 계정으로 시작** 버튼을 통해 별도의 회원가입 없이 서비스를 체험할 수 있습니다.

데모 로그인 시 세션마다 새로운 데모 냉장고 데이터를 생성하며, 다음과 같은 예시 데이터가 포함됩니다.

- 보유 식재료: 당일, 임박, 정상, 만료, 기한 미정
- 소비 완료 식재료: 먹음, 폐기
- 휴지통 데이터

평가 및 시연이 끝난 후에는 `DEMO_LOGIN=false`로 설정하여 데모 로그인을 비활성화할 수 있습니다.

### Postman

선택적으로 `postman/` 디렉터리의 컬렉션과 로컬 환경 설정을 사용해 API를 테스트할 수 있습니다.

API 요청 및 응답 규격의 기준은 Swagger 문서(`/api/docs`)입니다.

---

## 2. 기술 스택 및 선택 이유

### 프론트엔드

| 기술 | 버전 (대략) | 선택 이유 |
|------|------------|-----------|
| Next.js (App Router) | 16.x | App Router 기반의 페이지 및 레이아웃 구성과 API 프록시를 활용한 쿠키 인증 구조 단순화 |
| React | 19.x | Next.js와 호환되는 최신 UI 라이브러리 |
| TypeScript | 5.x | API 계약 및 폼 상태를 타입으로 관리하여 개발 안정성과 유지보수성 향상 |
| Tailwind CSS | 4.x | 유틸리티 기반 스타일링으로 일관된 UI를 빠르게 구현 |
| lucide-react | - | 일관된 아이콘 시스템 구성 |

### 백엔드

| 기술 | 버전 (대략) | 선택 이유 |
|------|------------|-----------|
| Express | 4.x | REST API를 간결하게 구성할 수 있는 검증된 웹 프레임워크 |
| TypeScript + tsx | 5.x / 4.x | 타입 안정성 확보 및 개발 환경에서 별도 빌드 없이 TypeScript 실행 |
| Zod | 3.x | 요청 데이터 검증 및 필드별 유효성 검사 관리 |
| jsonwebtoken + cookie | - | JWT 기반 인증 및 HttpOnly 쿠키를 활용한 토큰 관리 |
| bcryptjs | - | 비밀번호 해싱을 통한 계정 정보 보호 |
| swagger-ui-express + OpenAPI | - | API 명세를 문서화하고 `/api/docs`에서 확인할 수 있도록 구성 |

### 데이터 및 인프라

| 기술 | 선택 이유 |
|------|-----------|
| JSON 파일 저장소 (`backend/data/*.json`) | 별도의 DB 설치 및 마이그레이션 과정 없이 데이터 모델과 핵심 비즈니스 로직 구현에 집중 |
| 로컬 단일 프로세스 | 별도 인프라 구축 없이 웹·API 서버를 로컬 환경에서 실행할 수 있도록 구성 |
| Repository 패턴 | 데이터 접근 로직을 분리하여 추후 RDB로 전환할 수 있는 구조 확보 |

루트 프로젝트는 npm workspaces 대신 `concurrently`를 사용해 `backend`와 `frontend`를 함께 실행하도록 구성했습니다.

각 프로젝트의 패키지 경계는 유지하면서 개발 환경에서의 실행 과정을 단순화하기 위한 선택입니다.

### 우대 기술에 대한 검토 및 적용 범위

요구사항에서 제시한 **Electron(데스크톱 애플리케이션)** 및 **LLM MCP(외부 서비스 연동)** 기술을 검토했으나, MVP에서는 핵심 기능의 완성도와 구현 범위를 우선하여 적용하지 않았습니다.

| 우대 기술 | MVP에서 제외한 이유 | 향후 확장 방향 |
|-----------|-------------------|----------------|
| Electron | 웹 브라우저만으로 식재료 CRUD, 유통기한 확인 및 소비 관리 등 핵심 기능 구현이 가능하다고 판단. 데스크톱 패키징 및 OS 알림 구현보다 웹 서비스의 사용성과 완성도에 집중 | 트레이 상주, 백그라운드 OS 알림, CSV 드래그 앤 드롭 등 데스크톱 환경에 특화된 기능 추가 |
| LLM MCP | 핵심 기능은 REST API만으로 구현할 수 있으며, AI 에이전트 연동까지 포함하면 MVP 개발 범위가 확대될 수 있다고 판단 | 식재료 조회·소비 API를 MCP 도구로 제공하여 자연어 기반 재고 조회, 소비 처리 및 메뉴 추천 기능으로 확장 |

기술 고도화 계획은 [docs/planning.md §10](./docs/planning.md), 기술 선택 및 미적용 사유는 [docs/architecture-and-conventions.md §8](./docs/architecture-and-conventions.md)을 참고하세요.

---

## 3. 아키텍처 및 개발 컨벤션

### 전체 프로젝트 구조

```text
naengteol/
├── frontend/          # Next.js 웹 애플리케이션
├── backend/           # Express API 서버 및 JSON 데이터 저장소
├── docs/              # 프로젝트 관련 문서
├── package.json       # 개발 환경 실행 및 스크립트 관리
└── README.md
```

### 전체 요청 흐름

```text
브라우저 (localhost:3000)
       │
       │ /api/* (Next.js Rewrite)
       ▼
Express API (localhost:4000)
       │
       ├── routes
       │     └── controllers
       │             └── services
       │                     └── repositories
       │
       ▼
JsonTable
       │
       ▼
backend/data/*.json
```

별도의 데이터베이스 서버나 인프라를 구축하지 않고, 로컬 환경에서 웹과 API 서버를 각각 실행하도록 구성했습니다.

데이터는 백엔드의 JSON 파일에 저장하며, Repository 계층을 통해 데이터 접근 로직을 분리했습니다.

### 소스 코드 구조

**백엔드 (`backend/src/`)**

| 계층 | 역할 |
|------|------|
| `routes/` | API 경로 정의 및 인증 미들웨어 연결 |
| `controllers/` | HTTP 요청 처리 및 응답 구성 |
| `services/` | 비즈니스 로직 처리 (소비·폐기, 데이터 병합, 통계, 알림 대상 등) |
| `repositories/` | JSON 데이터 읽기 및 쓰기 |
| `validators/` | Zod 기반 요청 데이터 검증 |
| `middlewares/` | JWT 인증 및 공통 에러 처리 |
| `utils/expiration.ts` | Asia/Seoul 기준 유통기한 및 신선도 계산 |

**프론트엔드 (`frontend/src/`)**

| 영역 | 역할 |
|------|------|
| `app/` | App Router 기반 페이지 구성 (`(main)` 보호 영역, 로그인 및 회원가입) |
| `components/` | 화면 컴포넌트, 식재료 다이얼로그, AppShell 및 공통 UI 컴포넌트 |
| `lib/api.ts` | API 요청 래퍼 (`credentials: "include"`) |
| `lib/types.ts` | API 요청·응답 및 도메인 타입 정의 |

### 개발 컨벤션

- **API 응답 규격**
  - 성공: `{ success: true, data }`
  - 실패: `{ success: false, message, errors: [{ field, message }] }`

- **인증 및 세션 관리**
  - JWT를 HttpOnly 쿠키(`naengteol_token`)에 저장하여 클라이언트 JavaScript에서 토큰에 직접 접근할 수 없도록 구성했습니다.
  - 로그아웃, 비밀번호 변경 및 회원 탈퇴 시 `tokenVersion`을 증가시켜 기존 JWT를 무효화합니다.

- **날짜 및 시간 처리**
  - 생성·수정 시각: ISO 형식
  - 유통기한·구매일·소비일: `YYYY-MM-DD`
  - 신선도 계산: Asia/Seoul 기준 달력일 적용

- **신선도 분류 기준**

  | 조건 | 상태 | 코드 |
  |------|------|------|
  | 4일 이상 남음 | 정상 | `FRESH` |
  | 0~3일 남음 | 임박 | `EXPIRING` |
  | 유통기한 지남 | 만료 | `EXPIRED` |
  | 유통기한 미입력 | 기한 미정 | `UNKNOWN` |

- **네이밍 규칙**
  - TypeScript: camelCase
  - REST API: 명사형 리소스와 행위별 서브 경로 조합 (`/consume`, `/restore`, `/purge`, `/bulk`)

- **UI 및 에러 메시지**
  - 사용자에게 노출되는 UI 문구와 에러 메시지는 한국어로 통일합니다.

- **라우트 등록 순서**
  - `/api/ingredients/stats`와 같은 고정 경로를 `/:id`와 같은 동적 경로보다 먼저 등록합니다.

계층별 역할 및 상세 구조는 [docs/architecture-and-conventions.md](./docs/architecture-and-conventions.md)를 참고하세요.

---

## 4. 데이터 모델 및 저장 구조

실제 RDB 대신 3개의 JSON 파일을 데이터 저장소로 사용합니다.

| 파일 | 역할 |
|------|------|
| `users.json` | 사용자 계정 정보 |
| `categories.json` | 전역 식재료 카테고리 정보 (사용자 공유, 기본 8종 제공) |
| `ingredients.json` | 사용자별 식재료 정보 |

데이터의 원자적 저장을 위해 `JsonTable`에서 임시 파일에 데이터를 기록한 후 `rename`으로 교체하며, 프로세스 내 쓰기 큐를 통해 동시 쓰기 작업을 순차적으로 처리합니다.

### 엔티티 구성

**User**

`id`, `email`, `nickname?`, `password`(bcrypt), `tokenVersion`, `notificationSettings?`, `createdAt`, `updatedAt`

**Category**

`id`, `name`, `sortOrder`

기본 카테고리: 채소, 과일, 육류, 해산물, 유제품, 가공식품, 조미료, 기타

**Ingredient**

`id`, `userId`, `categoryId`, `name`, `quantity`, `unit`, `purchasedAt`, `expirationDate`, `storageType`(`REFRIGERATED` | `FROZEN` | `ROOM`), `status`(`ACTIVE` | `CONSUMED` | `DELETED`), `outcome?`(`USED` | `WASTED`), `consumedAt?`, `memo`, `createdAt`, `updatedAt`

### 상태 및 폐기 모델링

- **상태 분리 (`ACTIVE` / `CONSUMED` / `DELETED`)**

  식재료의 보유 상태, 소비 완료 상태, 삭제 상태를 분리했습니다. 소비 완료와 실수로 삭제한 데이터를 구분하고, 휴지통을 통한 복구 및 영구 삭제를 지원하기 위한 설계입니다.

- **소비 결과 분리 (`outcome: USED` / `WASTED`)**

  소비 완료 데이터는 `CONSUMED` 상태로 통합하고, 실제 소비 결과는 `outcome` 필드로 구분합니다. 이를 통해 목록에서는 소비 완료 항목으로 일관되게 관리하면서 통계에서는 먹음과 폐기를 구분해 절약률을 계산할 수 있습니다.

  절약률 계산식: `먹음 ÷ (먹음 + 폐기) × 100`

- **고정 카테고리 시드**

  MVP에서는 사용자 정의 카테고리보다 검색·필터 및 CSV 가져오기 과정에서의 데이터 일관성을 우선하여 기본 카테고리 8종을 제공합니다.

- **유통기한 계산 방식**

  유통기한 자체는 날짜 형식으로 저장하고, 신선도(`freshness`) 및 남은 일수(`daysLeft`)는 응답 DTO 구성 시 계산합니다.

  계산 결과를 별도로 저장하지 않으므로 날짜가 변경되어도 최신 기준으로 신선도를 판단할 수 있습니다.

ERD, 필드 상세 및 상태 전이도는 [docs/schema.md](./docs/schema.md)를 참고하세요.

---

## 5. 주요 기능

- **회원 관리**: 회원가입, 로그인, 로그아웃, 닉네임 및 비밀번호 변경, 회원 탈퇴
- **식재료 관리**: 식재료 등록·조회·수정·삭제, 검색·필터·정렬 및 페이지네이션
- **소비 관리**: 부분 소비 처리 및 소비 완료 결과(먹음/폐기) 구분
- **일괄 처리**: 여러 식재료의 일괄 소비 처리 및 동일 식재료 병합
- **휴지통**: 삭제 데이터 조회, 복구 및 영구 삭제
- **대시보드**: 오늘 및 이번 주 소비 예정 식재료 확인
- **소비 통계**: 먹음·폐기 현황 및 절약률 확인
- **CSV 관리**: 템플릿 다운로드, 데이터 미리보기 및 가져오기, 내보내기
- **빠른 재등록**: 자주 사용하거나 최근 등록한 식재료를 유통기한 입력만으로 재등록
- **유통기한 알림**: 앱 실행 시 임박 식재료 배너 표시 및 브라우저 Notification 지원

---

## 6. 개발 시 고민했던 점 및 개선 과제

### 주요 설계 의사결정

- **JSON 파일 저장소와 RDB 비교**

  MVP의 빠른 개발과 시연을 위해 JSON 파일 저장 방식을 선택했습니다. 별도의 DB 설치 및 마이그레이션 과정 없이 데이터 모델과 핵심 기능을 구현할 수 있도록 했으며, 추후 RDB로 전환할 수 있도록 Repository 계층을 분리했습니다.

- **유통기한 알림 방식**

  백그라운드 푸시 알림을 구현하려면 서비스 워커 및 VAPID 기반 푸시 서버 등 추가 구성이 필요합니다. MVP에서는 구현 범위를 고려해 앱 실행 시 임박 식재료를 확인하고, 브라우저 Notification을 통해 알림을 제공하는 방식으로 구성했습니다.

- **소비 및 폐기 데이터 모델링**

  먹음과 폐기를 별도 상태로 분리하는 대신 `CONSUMED` 상태와 `outcome` 필드를 조합했습니다. 소비 완료 목록의 일관성을 유지하면서 통계에서는 먹음과 폐기를 구분할 수 있도록 설계했습니다.

- **기술 스택 선택**

  권장 기술로 제시된 Vue 및 NestJS 대신 Next.js와 Express를 선택했습니다. 익숙한 기술 스택을 활용해 기획부터 구현, 테스트 및 문서화까지 일관성 있게 완성하는 데 집중했습니다.

### 아쉬운 점 및 개선 과제

- **데이터 저장소 확장성**

  JSON 파일 기반 저장 방식은 단일 프로세스 환경을 전제로 합니다. 다중 인스턴스 운영이나 동시 쓰기 작업이 증가하는 환경에서는 데이터 일관성과 확장성 측면에서 한계가 있어 RDB로의 전환이 필요합니다.

- **서비스 확장 기능**

  가족 공유 냉장고, 장보기 연동, 바코드·OCR 기반 식재료 등록, 소셜 로그인 등은 MVP 범위에서 제외했으며 향후 확장 과제로 남겼습니다.

- **기술 확장**

  Electron 기반 데스크톱 애플리케이션 및 LLM MCP 연동은 핵심 기능을 안정화한 이후 적용할 수 있도록 확장 방향을 정리했습니다.

- **UI/UX 개선**

  초기에는 데스크톱 내비게이션에 여러 기능을 배치했으나, 사용성과 정보 구조를 고려해 핵심 메뉴 4개와 계정 메뉴 중심으로 재구성했습니다.

향후 고도화 계획 및 기능별 우선순위는 [docs/planning.md §10](./docs/planning.md)을 참고해주세요.

---

## 라이선스

MIT — [LICENSE](./LICENSE)