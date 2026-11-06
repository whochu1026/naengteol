# 데이터 스키마

냉털은 RDB 대신 JSON 파일을 테이블처럼 사용하는 파일 기반 데이터 저장 방식을 적용합니다.

데이터 파일은 `DATA_DIR` 환경 변수로 경로를 지정하며, 기본 경로는 `backend/data/`입니다.

## 1. 파일 구성

| 파일 | 엔티티 | 설명 |
|------|--------|------|
| `users.json` | `User[]` | 사용자 계정 정보 |
| `categories.json` | `Category[]` | 전역 식재료 카테고리 |
| `ingredients.json` | `Ingredient[]` | 사용자별 식재료 정보 |

- `users.json`: 이메일을 기준으로 사용자 중복 가입을 방지합니다. (애플리케이션 레벨에서 유일성 검증)
- `categories.json`: 전역 시드 데이터로 관리하며, 파일이 비어 있으면 서버 시작 시 기본 카테고리 8종을 삽입합니다.
- `ingredients.json`: `userId`를 기준으로 사용자별 데이터 소유권을 구분합니다.

### JsonTable 저장 방식

`JsonTable`은 JSON 파일을 배열 형태로 읽고, 데이터 변경 후 임시 파일에 기록한 뒤 `rename`으로 원본 파일을 교체합니다.

또한 프로세스 내 쓰기 큐를 통해 저장 작업을 직렬화하여 동일 프로세스에서 발생하는 동시 쓰기 충돌을 방지합니다.

## 2. 엔티티 관계 (논리 ERD)

```text
User (1) ────────── (N) Ingredient
                           │
                           │ (N)
                           │
                      Category (1)
```

| 관계 | 설명 |
|------|------|
| User : Ingredient | 한 명의 사용자는 여러 식재료를 등록할 수 있습니다. |
| Category : Ingredient | 하나의 카테고리에 여러 식재료가 연결될 수 있습니다. |

- `Ingredient.userId`를 통해 식재료의 소유자를 구분합니다.
- `Ingredient.categoryId`를 통해 카테고리와 연결합니다.
- 카테고리는 사용자별로 생성하지 않고 전역 데이터로 관리합니다.

**전역 카테고리를 사용하는 이유**

MVP에서는 카테고리를 고정하여 사용자별 분류 기준의 차이를 줄이고, 목록 필터와 CSV 가져오기에서 일관된 분류 값을 사용하도록 설계했습니다.

## 3. User

사용자 계정 및 인증 정보를 관리하는 엔티티입니다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `string (UUID)` | 사용자 고유 식별자 (PK) |
| `email` | `string` | 로그인 ID |
| `nickname` | `string \| null` | 사용자 표시 이름 |
| `password` | `string` | bcrypt로 해싱한 비밀번호 |
| `tokenVersion` | `number` | JWT 무효화 및 세션 관리 버전 |
| `notificationSettings` | `object \| null` | 알림 설정 (`enabled`, `notifyD3`, `notifyD0`) |
| `createdAt` | `ISO string` | 생성 일시 |
| `updatedAt` | `ISO string` | 수정 일시 |

### API 응답 규칙

- API 응답용 `PublicUser`에는 비밀번호 필드인 `password`를 포함하지 않습니다.
- `notificationSettings`는 기본 설정과 병합하여 API 응답에 항상 포함합니다.

## 4. Category

식재료를 분류하기 위한 전역 엔티티입니다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `string` | 카테고리 고유 식별자 (예: `cat_dairy`) |
| `name` | `string` | 카테고리명 (한국어 라벨) |
| `sortOrder` | `number` | 목록 표시 순서 |

### 기본 카테고리

서버 시작 시 다음 8종을 기본 데이터로 사용합니다.

1. 채소
2. 과일
3. 육류
4. 해산물
5. 유제품
6. 가공식품
7. 조미료
8. 기타

## 5. Ingredient

사용자가 등록한 식재료와 소비 상태를 관리하는 핵심 엔티티입니다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `string (UUID)` | 식재료 고유 식별자 (PK) |
| `userId` | `string` | 소유 사용자 ID |
| `categoryId` | `string` | 카테고리 ID |
| `name` | `string` | 식재료명 |
| `quantity` | `number` | 수량 (0 초과) |
| `unit` | `string` | 단위 (개, g 등 또는 직접 입력) |
| `purchasedAt` | `YYYY-MM-DD \| null` | 구매일 |
| `expirationDate` | `YYYY-MM-DD \| null` | 유통기한 |
| `storageType` | `enum` | 보관 유형 (`REFRIGERATED`, `FROZEN`, `ROOM`) |
| `status` | `enum` | 식재료 상태 (`ACTIVE`, `CONSUMED`, `DELETED`) |
| `outcome` | `enum \| null` | 소비 결과 (`USED`, `WASTED`) |
| `consumedAt` | `YYYY-MM-DD \| null` | 소비·폐기 처리일 (서울 날짜 기준) |
| `memo` | `string \| null` | 메모 |
| `createdAt` | `ISO string` | 생성 일시 |
| `updatedAt` | `ISO string` | 수정 일시 |

### 응답 DTO

저장된 `Ingredient` 데이터에 다음 계산 및 표시용 필드를 추가하여 응답합니다.

| 필드 | 설명 |
|------|------|
| `categoryName` | 연결된 카테고리명 |
| `freshness` | 유통기한 기준 신선도 상태 |
| `daysLeft` | 오늘 기준 유통기한까지 남은 일수 |

`freshness`와 `daysLeft`는 저장하지 않으며, **조회 시점의 Asia/Seoul 날짜**를 기준으로 계산합니다.

### 신선도 판정 기준

| freshness | 조건 (`daysLeft`) | 설명 |
|-----------|-------------------|------|
| `EXPIRED` | `< 0` | 유통기한 경과 |
| `EXPIRING` | `0 ~ 3` | 유통기한 임박 또는 당일 |
| `FRESH` | `≥ 4` | 유통기한 여유 |
| `UNKNOWN` | 유통기한 없음 | 날짜 기준 판정 불가 |

### 목록 조회 필터

`dueWithin` 파라미터를 사용해 유통기한 기준으로 식재료를 조회합니다.

| 값 | 조회 조건 |
|----|-----------|
| `0` | 유통기한이 오늘인 식재료만 조회 |
| `1` 이상 | 이미 만료된 항목을 포함해 `daysLeft <= N`인 식재료 조회 |

## 6. 상태 전이

식재료는 `ACTIVE`, `CONSUMED`, `DELETED` 세 가지 상태를 가집니다.

### 상태 전이 흐름

```text
                    create
                       │
                       ▼
                   [ACTIVE]
                  /    │     \
                 /     │      \
          consume    delete   partial consume
             │         │      (quantity 감소)
             ▼         ▼      (status 유지)
         [CONSUMED] [DELETED]
             │          │
          restore      purge
             │          │
             ▼          ▼
         [ACTIVE]    물리 삭제
```

### 상태별 처리 규칙

| 작업 | 대상 상태 | 처리 결과 |
|------|-----------|-----------|
| 식재료 등록 | - | `ACTIVE` |
| 전체 소비·폐기 | `ACTIVE` | `CONSUMED` |
| 부분 소비 | `ACTIVE` | 수량 감소, 상태 유지 |
| 휴지통 이동 | `ACTIVE` | `DELETED` |
| 소비 복구 | `CONSUMED` | `ACTIVE` |
| 휴지통 복구 | `DELETED` | `ACTIVE` |
| 영구 삭제 | `DELETED` | 데이터 물리 삭제 |

### 소비 결과 구분

`CONSUMED` 상태에서는 `outcome`으로 소비 결과를 구분합니다.

| outcome | 의미 |
|---------|------|
| `USED` | 식재료를 먹음 |
| `WASTED` | 식재료를 폐기함 |

- `CONSUMED`는 식재료의 처리 상태를 나타냅니다.
- `outcome`은 소비 결과를 구분하기 위한 값입니다.
- 부분 소비는 수량만 감소시키며, 전체 소비 처리 전까지 `ACTIVE` 상태를 유지합니다.
- 소비 복구 시 `status`를 `ACTIVE`로 변경하고 `consumedAt`, `outcome`을 초기화합니다.
- `DELETED` 상태의 식재료만 영구 삭제(`purge`)할 수 있습니다.

### 삭제 방식

- **Soft Delete:** 데이터를 실제로 삭제하지 않고 `DELETED` 상태로 변경하여 휴지통에 보관합니다.
- **Purge:** 휴지통에 있는 데이터를 저장소에서 물리적으로 삭제합니다.

소비 완료와 삭제는 목적이 다르므로 별도의 상태와 처리 흐름으로 관리합니다.

## 7. 설계 근거

| 설계 항목 | 선택 이유 |
|-----------|-----------|
| JSON 파일 저장소 | MVP 개발 단계에서 DB 설치 및 마이그레이션 비용을 줄이고 빠르게 구현하기 위함 |
| Repository 계층 분리 | 향후 RDB로 전환하더라도 비즈니스 로직의 변경을 최소화하기 위함 |
| Soft Delete | 실수로 삭제한 식재료를 복구할 수 있도록 하기 위함 |
| `outcome` 필드 분리 | 소비 상태와 먹음·폐기 결과를 구분해 통계에 활용하기 위함 |
| 전역 카테고리 | 사용자별 분류 차이를 줄이고 필터 및 CSV 데이터의 일관성을 유지하기 위함 |
| 계산형 `freshness` | 날짜가 바뀌어도 별도 데이터 갱신이나 마이그레이션 없이 최신 상태를 계산하기 위함 |

---

**설계 원칙:** 저장 데이터는 필요한 상태와 사용자 입력값 중심으로 유지하고, 날짜에 따라 달라지는 정보와 표시용 값은 조회 시점에 계산합니다.