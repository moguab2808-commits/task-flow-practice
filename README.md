# 메모 등록

제목과 설명으로 카드를 등록하고 목록으로 보는 웹 앱. 카드는 처음 상태가 '할 일'이다. API 는 `/api/tasks` 이다. 카드는 SQLite 파일(`backend/memos.db`)에 저장하므로 서버를 다시 시작해도 남는다. DB 파일은 Git 에 올라가지 않는다. 설계 문서는 PRD.md, ARCHITECTURE.md, DECISIONS.md 를 본다.

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

DB 파일 위치를 바꾸려면 서버를 켜기 전에 환경변수 `MEMO_DB_PATH` 에 파일 경로를 지정한다.
