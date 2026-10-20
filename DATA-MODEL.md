- 상태: 작성 중 (사용자 확인 전)

# DATA-MODEL: 카드형 Task 관리 웹 앱

근거: API-SPEC.md, DECISIONS.md(D-005 ~ D-017, 확인 전), ARCHITECTURE.md 4절, PRD.md.
Task 한 건이 SQLite 에 갖는 필드 여섯 개를 뜻 · 누가 넣는지 · 필수 여부 · 변경 규칙으로 적는다.
정하지 않은 것(자료형 · 길이 제한 · 시각 형식 등)은 정하지 않고 **결정 필요**로 남겼다.
v1 의 메모는 `id` 와 `content` 만 가졌고 서버 메모리에만 있었다. v2 는 새 SQLite 에서 시작하며 v1 데이터는 옮기지 않는다.

## 1. 필드 여섯 개

| 필드 | 뜻 | 누가 넣나 | 필수 | 변경 규칙 | 근거 |
|---|---|---|---|---|---|
| id | Task 를 구분하는 값 | 서버 (저장소가 부여) | 항상 값이 있음 | 사용자는 못 바꾼다. 한 번 부여되면 바뀌지 않는다. | ARCHITECTURE 4절 |
| title | 이름 | 사용자 | 필수 | 수정 가능. 비거나 공백만 있으면 저장하지 않는다. | D-014, R-006 |
| description | 추가 설명 | 사용자 | 선택 | 수정 가능. 비워도 된다. | D-015, R-006 |
| status | 할 일 · 진행 중 · 완료 | 사용자 행동과 규칙 | 항상 값이 있음 | 상태 변경으로만 바뀐다. 수정으로는 바뀌지 않는다. 현재 상태와 상관없이 고를 수 있다. | D-008, D-010 |
| created_at | 만든 시각 | 서버 | 항상 값이 있음 | 사용자가 넣거나 바꾸지 않는다. | D-017 |
| updated_at | 마지막으로 고친 시각 | 서버 | 항상 값이 있음 | 사용자가 넣거나 바꾸지 않는다. | D-017 |

- 요청 본문에 담는 값은 API-SPEC 기준으로 title · description(등록과 수정), status(상태 변경)다. id 는 경로 값 `{task_id}` 로만 쓰이며 바뀌지 않는다. created_at · updated_at 은 요청 입력에 없고 서버가 채운다.
- 새 Task 의 처음 status 는 TODO 이다 (D-011).
- 목록 순서는 최신이 먼저다. 기준은 id 내림차순이다 (D-016. 시각 기준으로 바꿀지는 결정 필요).

## 2. status: 화면 표시와 저장 값

| 화면 표시 | 저장 값 |
|---|---|
| 할 일 | TODO |
| 진행 중 | IN_PROGRESS |
| 완료 | DONE |

- 저장 값 문자열은 task-flow 의 DATA-MODEL 을 따른 제안이다. 확정은 사용자 확인 후.
- 허용하는 값은 이 세 개뿐이며 API 가 검증한다.

## 3. 예시
```json
{
  "id": 3,
  "title": "보고서 초안",
  "description": "월요일 회의용",
  "status": "IN_PROGRESS",
  "created_at": "2026-10-20T10:02:00",
  "updated_at": "2026-10-20T11:40:00"
}
```
- 예시일 뿐이며 자료형 · 시각 형식을 확정한 것이 아니다.

## 4. 결정 필요 모음

| 항목 | 걸린 곳 | 근거 |
|---|---|---|
| id 의 자료형 (예시는 숫자, 기존 코드도 숫자 자동 증가) | id | API-SPEC 의 `{task_id}` 형식과 같은 항목 |
| title · description 의 길이 제한 (v1 은 본문 300자) | title, description | O-3 |
| description 이 비었을 때 저장 방식 (빈 문자열 / 값 없음) | description | 문서에 없음 |
| id · created_at · updated_at 이 요청 본문에 오면 무시할지 거절할지 | id, created_at, updated_at | 문서에 없음 |
| 상태 변경도 updated_at 을 바꾸는지 | updated_at | 문서에 없음 (ARCHITECTURE 6.3 은 바꾼다고 가정) |
| 처음 만들 때 updated_at 값 (created_at 과 같은지) | updated_at | 문서에 없음 |
| 시각의 형식과 시간대 | created_at, updated_at | 문서에 없음 |
| 제목 앞뒤 공백을 잘라 저장할지 | title | D-014 는 공백만 있는 경우만 정함 |
| DB 파일 위치와 이름, 테이블 이름 | 전체 | O-8 |

"확인 전"인 D-005 ~ D-017 이 승인되지 않으면 해당 부분을 다시 쓴다.
