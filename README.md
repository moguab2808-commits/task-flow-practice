# 메모 등록

제목과 설명, 예정일(선택)로 카드를 등록하고 월간 캘린더로 보는 웹 앱. 예정일이 없는 카드는 캘린더 아래 "날짜 없음" 영역에 보인다. 카드는 처음 상태가 '할 일'이다. API 는 `/api/tasks` 이다. 카드는 SQLite 파일(`backend/memos.db`)에 저장하므로 서버를 다시 시작해도 남는다. DB 파일은 Git 에 올라가지 않는다. 설계 문서는 PRD.md, ARCHITECTURE.md, DECISIONS.md 를 본다.

## 구조

```
backend/   FastAPI (uv)
frontend/  React · Vite
```

## 실행

두 서버를 각각 다른 터미널에서 실행한다.

```
cd backend
uv run uvicorn app.main:app --port 8000
```

```
cd frontend
npm install
npm run dev
```

브라우저에서 http://localhost:5173 을 연다.

서버는 시작할 때 DB 에 필요한 컬럼(예정일)을 자동으로 더한다. 기존 카드는 지워지지 않고 "날짜 없음"이 된다. 코드를 바꾼 뒤에는 서버를 다시 시작해야 반영된다.

DB 파일 위치를 바꾸려면 서버를 켜기 전에 환경변수 `MEMO_DB_PATH` 에 파일 경로를 지정한다.
