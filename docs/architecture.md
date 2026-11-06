# 아키텍처 (요약)

프로젝트의 런타임 구성과 주요 요청 흐름을 간략하게 정리한 문서입니다.

상세한 시스템 구조, 계층별 역할 및 개발 규칙은 **[architecture-and-conventions.md](./architecture-and-conventions.md)** 를 참고하세요.

## 전체 요청 흐름

```text
Browser
   │
   ▼
Next.js (:3000)
   │
   │ /api/* Rewrite
   ▼
Express API (:4000)
   │
   ▼
Routes → Controllers → Services → Repositories
   │
   ▼
backend/data/*.json
```

## 주요 구성

- **Frontend**: Next.js 기반 웹 애플리케이션 (`localhost:3000`)
- **Backend**: Express 기반 REST API 서버 (`localhost:4000`)
- **Data Storage**: JSON 파일 기반 데이터 저장소 (`backend/data/`)
- **Authentication**: JWT 기반 인증 및 HttpOnly 쿠키(`naengteol_token`), `tokenVersion`을 통한 토큰 무효화
- **API Documentation**: `backend/openapi.yaml` 기반 OpenAPI 문서 및 Swagger UI (`/api/docs`)

## 관련 문서

- [architecture-and-conventions.md](./architecture-and-conventions.md) — 상세 아키텍처 및 개발 컨벤션
- [conventions.md](./conventions.md) — 개발 체크리스트
- [schema.md](./schema.md) — 데이터 모델 및 상태 전이