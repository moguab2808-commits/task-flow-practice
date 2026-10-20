import logging
import os
import sqlite3
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

MAX_LENGTH = 300

# SQLite 파일 하나에 저장한다. 서버를 다시 시작해도 남는다.
# 경로는 환경변수 MEMO_DB_PATH 로 바꿀 수 있고, 기본값은 backend/memos.db 이다.
DB_PATH = Path(os.environ.get("MEMO_DB_PATH", Path(__file__).resolve().parent.parent / "memos.db"))

app = FastAPI(title="메모 작성")
log = logging.getLogger("uvicorn.error")


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS memos ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, "
            "content TEXT NOT NULL)"
        )


init_db()


class MemoIn(BaseModel):
    content: str = Field(max_length=MAX_LENGTH)

    @field_validator("content")
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("메모 내용이 비어 있습니다.")
        return value


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/memos", status_code=201)
def create_memo(body: MemoIn):
    try:
        conn = connect()
        try:
            with conn:
                cur = conn.execute("INSERT INTO memos (content) VALUES (?)", (body.content,))
            memo = {"id": cur.lastrowid, "content": body.content}
        finally:
            conn.close()
    except sqlite3.Error:
        log.exception("메모 저장 실패")
        raise HTTPException(status_code=500, detail="메모를 저장하지 못했습니다.")
    log.info("메모 등록 완료 (id=%s)", memo["id"])
    return memo


@app.get("/memos")
def list_memos(offset: int = Query(0, ge=0), limit: int = Query(5, ge=1, le=5)):
    try:
        conn = connect()
        try:
            # 하나 더 읽어 다음 페이지가 있는지 알아낸다.
            rows = conn.execute(
                "SELECT id, content FROM memos ORDER BY id DESC LIMIT ? OFFSET ?",
                (limit + 1, offset),
            ).fetchall()
        finally:
            conn.close()
    except sqlite3.Error:
        log.exception("메모 목록 조회 실패")
        raise HTTPException(status_code=500, detail="메모 목록을 불러오지 못했습니다.")
    items = [dict(row) for row in rows[:limit]]
    return {"items": items, "has_more": len(rows) > limit}
