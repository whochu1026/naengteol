# 아키텍처 (요약)

제출용 본문은 **[architecture-and-conventions.md](./architecture-and-conventions.md)** 입니다.  
이 파일은 런타임만 짧게 적어 둔 요약입니다.

```text
Browser → Next.js(:3000) ──/api rewrite──► Express(:4000)
                                              │
                                         repositories
                                              │
                                       backend/data/*.json
```

- 계층: `routes → controllers → services → repositories`
- 인증: HttpOnly 쿠키 `naengteol_token` + `tokenVersion`
- OpenAPI: `backend/openapi.yaml` → `/api/docs`
