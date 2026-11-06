# 냉털 프론트엔드

Next.js(App Router) 웹 클라이언트입니다.

루트 저장소에서 함께 실행하는 것을 권장합니다.

```bash
# 저장소 루트
npm install
npm --prefix frontend install
npm run dev
```

- 웹: http://localhost:3000
- `/api/*` 요청은 `next.config.ts` rewrite로 백엔드(`API_PROXY_TARGET`, 기본 `http://127.0.0.1:4000`)에 전달됩니다.

단독 실행:

```bash
npm run dev      # 개발
npm run build    # 프로덕션 빌드 (next build --webpack)
npm run start    # 빌드 결과 실행
npm run lint
```

> `next build` 기본(Turbopack)이 네이티브 바인딩 없이 실패하는 환경을 위해 webpack 빌드를 씁니다.


프로젝트 전체 설명·기획·아키텍처는 루트 [README.md](../README.md)와 [docs/](../docs/)를 참고하세요.
