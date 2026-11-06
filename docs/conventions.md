# 컨벤션 (체크리스트)

제출용 본문은 **[architecture-and-conventions.md](./architecture-and-conventions.md)** 입니다.  
빠른 확인용 요약만 남깁니다.

- API: `{ success, data }` / `{ success, message, errors[] }`
- 검증: Zod (`validators/schemas.ts`)
- 페이지: `page.tsx`는 얇게, 로직은 `*View.tsx` — **`useSearchParams`를 쓰는 페이지만** `Suspense`로 감쌈
- HTTP: `lib/api.ts`만 사용 (`credentials: "include"`)
- 커밋: `feat:` `fix:` `docs:` `test:` 권장
- 데이터 파일: `backend/data/*.json`은 gitignore
