# 컨벤션 (체크리스트)

제출용 상세 문서는 **[architecture-and-conventions.md](./architecture-and-conventions.md)** 입니다.  
이 문서는 개발 시 빠르게 확인할 수 있도록 핵심 규칙만 정리한 요약본입니다.

## 개발 체크리스트

- **API 응답**: 성공 `{ success, data }` / 실패 `{ success, message, errors[] }`
- **입력 검증**: Zod 사용 (`validators/schemas.ts`)
- **페이지 구성**: `page.tsx`는 최소한의 역할만 담당하고, 화면 로직은 `*View.tsx`에 분리
- **Suspense 적용**: `useSearchParams`를 사용하는 페이지만 `Suspense`로 감싸기
- **HTTP 요청**: `lib/api.ts`를 통해서만 요청하고, `credentials: "include"` 설정 유지
- **커밋 메시지**: `feat:`, `fix:`, `docs:`, `test:` 접두사 사용 권장
- **데이터 파일**: `backend/data/*.json`은 Git 추적 대상에서 제외 (`.gitignore` 적용)