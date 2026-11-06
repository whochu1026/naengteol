# 데이터 스키마

RDB 대신 JSON 파일을 테이블처럼 사용합니다. 경로는 `DATA_DIR`(기본 `backend/data`)입니다.

## 파일 매핑

| 파일 | 엔티티 | 비고 |
|------|--------|------|
| `users.json` | User[] | 이메일 유일(애플리케이션 레벨) |
| `categories.json` | Category[] | 전역 시드. 비어 있으면 서버 기동 시 8종 삽입 |
| `ingredients.json` | Ingredient[] | `userId`로 소유 분리 |

`JsonTable`은 배열 전체를 읽고, 변경 후 임시 파일에 쓴 뒤 `rename`으로 교체합니다. 프로세스 내 쓰기 큐로 동시 저장을 직렬화합니다.

## ERD (논리)

```text
User 1 ──────── * Ingredient
                     │
                     * 
                  Category (전역, N:1)
```

카테고리는 사용자별이 아닙니다. MVP에서 필터·CSV 가져오기 값을 고정하기 위함입니다.

## User

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string (UUID) | PK |
| email | string | 로그인 ID |
| nickname | string? | 표시 이름 |
| password | string | bcrypt 해시 |
| tokenVersion | number | JWT 무효화 버전 |
| notificationSettings | object? | `{ enabled, notifyD3, notifyD0 }` |
| createdAt / updatedAt | ISO string | |

API의 `PublicUser`에는 `password`가 없고 `notificationSettings`는 기본값과 병합해 항상 내려줍니다.

## Category

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 예: `cat_dairy` |
| name | string | 한국어 라벨 |
| sortOrder | number | 목록 정렬 |

시드: 채소, 과일, 육류, 해산물, 유제품, 가공식품, 조미료, 기타.

## Ingredient

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string (UUID) | PK |
| userId | string | User FK |
| categoryId | string | Category FK |
| name | string | 식재료명 |
| quantity | number | 0 초과 |
| unit | string | 개/g/… 또는 직접 입력 |
| purchasedAt | `YYYY-MM-DD` \| null | 구매일 |
| expirationDate | `YYYY-MM-DD` \| null | 유통기한 |
| storageType | enum | `REFRIGERATED` \| `FROZEN` \| `ROOM` |
| status | enum | `ACTIVE` \| `CONSUMED` \| `DELETED` |
| outcome | enum \| null | `USED` \| `WASTED` (CONSUMED일 때) |
| consumedAt | `YYYY-MM-DD` \| null | 소비/폐기 처리일 (서울 날짜) |
| memo | string \| null | |
| createdAt / updatedAt | ISO string | |

응답 DTO는 저장 필드에 `categoryName`, `freshness`, `daysLeft`를 붙입니다. 신선도는 저장하지 않고 **조회 시점의 Asia/Seoul 날짜**로 계산합니다.

## 상태 전이

```text
                 create
                   │
                   ▼
               [ACTIVE]
              /    │    \
     consume     delete   (부분 소비: quantity만 감소, status 유지)
    (USED|WASTED)  │
         │         ▼
         ▼     [DELETED] ──purge──► (물리 삭제)
    [CONSUMED]
         │
      restore
         │
         ▼
     [ACTIVE]   (consumedAt, outcome 초기화)
```

- **DELETE** = soft delete (휴지통)
- **purge** = `DELETED`만 영구 삭제
- **CONSUMED + outcome** = 통계용 먹음/폐기. soft delete와 목적이 달라 분리

## 설계 이유 요약

1. **JSON**: 과제 MVP에서 설치·마이그레이션 비용 제거. Repository로 교체 여지 확보.
2. **soft delete**: 실수 삭제 복구 UX.
3. **outcome 필드**: 소비 목록은 하나로 두고 절약률만 분리.
4. **전역 카테고리**: CSV·필터 값을 단순화.
5. **계산형 freshness**: “오늘”이 바뀌어도 마이그레이션 없이 재계산.
