# task-flow

메모를 작성해 등록하고 목록으로 보는 웹 앱. 메모는 서버 메모리에만 저장하므로 서버를 다시 시작하면 사라진다. 설계 문서는 PRD.md, ARCHITECTURE.md, DECISIONS.md 를 본다.

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
