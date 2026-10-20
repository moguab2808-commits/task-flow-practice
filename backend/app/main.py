import logging
import os
import sqlite3
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

TITLE_MAX = 100
DESCRIPTION_MAX = 300
STATUS_TODO = "TODO"  # 새 카드의 처음 상태 (D-011). 나머지 값은 상태 변경 이슈에서 쓴다.

# SQLite 파일 하나에 저장한다. 서버를 다시 시작해도 남는다.
# 경로는 환경변수 MEMO_DB_PATH 로 바꿀 수 있고, 기본값은 backend/memos.db 이다.
DB_PATH = Path(os.environ.get("MEMO_DB_PATH", Path(__file__).resolve().parent.parent / "memos.db"))

app = FastAPI(title="Task 카드")
log = logging.getLogger("uvicorn.error")


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    # v1 의 memos 테이블은 건드리지 않고 그대로 둔다. v1 데이터는 옮기지 않는다 (PRD R-003).
    with connect() as conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS tasks ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "title TEXT NOT NULL, "
            "description TEXT NOT NULL DEFAULT '', "
            "status TEXT NOT NULL DEFAULT 'TODO', "
            "created_at TEXT NOT NULL, "
            "updated_at TEXT NOT NULL)"
        )


init_db()


class TaskIn(BaseModel):
    title: str
    # 생략해도 검증기가 돌도록 validate_default 를 켠다. 아니면 None 이 저장소로 넘어간다.
    description: str | None = Field(default=None, validate_default=True)

    @field_validator("title")
    @classmethod
    def valid_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("제목이 비어 있습니다.")
        if len(value) > TITLE_MAX:
            raise ValueError(f"제목은 {TITLE_MAX}자 이내여야 합니다.")
        return value

    @field_validator("description")
    @classmethod
    def valid_description(cls, value: str | None) -> str:
        value = value or ""
        if len(value) > DESCRIPTION_MAX:
            raise ValueError(f"설명은 {DESCRIPTION_MAX}자 이내여야 합니다.")
        return value


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/tasks", status_code=201)
def create_task(body: TaskIn):
    now = datetime.now().isoformat(timespec="seconds")
    try:
        conn = connect()
        try:
            with conn:
                cur = conn.execute(
                    "INSERT INTO tasks (title, description, status, created_at, updated_at) "
                    "VALUES (?, ?, ?, ?, ?)",
                    (body.title, body.description, STATUS_TODO, now, now),
                )
            task = {
                "id": cur.lastrowid,
                "title": body.title,
                "description": body.description,
                "status": STATUS_TODO,
                "created_at": now,
                "updated_at": now,
            }
        finally:
            conn.close()
    except sqlite3.Error:
        log.exception("카드 저장 실패")
        raise HTTPException(status_code=500, detail="카드를 저장하지 못했습니다.")
    log.info("카드 등록 완료 (id=%s)", task["id"])
    return task


@app.get("/api/tasks")
def list_tasks(offset: int = Query(0, ge=0), limit: int = Query(5, ge=1, le=5)):
    try:
        conn = connect()
        try:
            # 하나 더 읽어 다음 페이지가 있는지 알아낸다.
            rows = conn.execute(
                "SELECT id, title, description, status, created_at, updated_at "
                "FROM tasks ORDER BY id DESC LIMIT ? OFFSET ?",
                (limit + 1, offset),
            ).fetchall()
        finally:
            conn.close()
    except sqlite3.Error:
        log.exception("카드 목록 조회 실패")
        raise HTTPException(status_code=500, detail="카드 목록을 불러오지 못했습니다.")
    items = [dict(row) for row in rows[:limit]]
    return {"items": items, "has_more": len(rows) > limit}
