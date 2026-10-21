import logging
import os
import re
import sqlite3
from datetime import date, datetime
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field, field_validator

TITLE_MAX = 100
DESCRIPTION_MAX = 300
STATUS_TODO = "TODO"  # 새 카드의 처음 상태 (D-011)
StatusValue = Literal["TODO", "IN_PROGRESS", "DONE"]  # 화면 표시: 할 일 · 처리중 · 완료
DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MONTH_PATTERN = r"^\d{4}-(0[1-9]|1[0-2])$"
TASK_COLUMNS = "id, title, description, status, scheduled_date, created_at, updated_at"

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
            "scheduled_date TEXT, "
            "created_at TEXT NOT NULL, "
            "updated_at TEXT NOT NULL)"
        )
        # 예정일이 생기기 전에 만든 DB 에는 컬럼만 더한다.
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(tasks)")}
        if "scheduled_date" not in columns:
            conn.execute("ALTER TABLE tasks ADD COLUMN scheduled_date TEXT")
        # 예정일은 필수이므로(D-021) 예정일 없는 기존 카드는 만든 날짜로 채운다. 카드를 지우지 않고
        # updated_at 도 바꾸지 않는다. 컬럼은 NULL 을 허용한 채 두고 필수는 API 가 강제한다.
        # 채울 NULL 이 없으면 아무 일도 하지 않으므로 여러 번 시작해도 결과가 같다.
        conn.execute("UPDATE tasks SET scheduled_date = substr(created_at, 1, 10) WHERE scheduled_date IS NULL")


init_db()


class TaskIn(BaseModel):
    title: str
    # 생략해도 검증기가 돌도록 validate_default 를 켠다. 아니면 None 이 저장소로 넘어간다.
    description: str | None = Field(default=None, validate_default=True)
    scheduled_date: str  # 필수 (D-021). 생략 · null 은 형식 오류로 422 가 된다.

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

    @field_validator("scheduled_date")
    @classmethod
    def valid_scheduled_date(cls, value: str) -> str:
        # 정규식으로 YYYY-MM-DD 모양만 받고, 실제로 존재하는 날짜인지 확인한다 (예: 2월 30일 거절).
        if not DATE_PATTERN.match(value):
            raise ValueError("예정일은 YYYY-MM-DD 형식이어야 합니다.")
        try:
            date.fromisoformat(value)
        except ValueError:
            raise ValueError("존재하지 않는 날짜입니다.")
        return value


class StatusIn(BaseModel):
    status: StatusValue


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
                    "INSERT INTO tasks (title, description, status, scheduled_date, created_at, updated_at) "
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    (body.title, body.description, STATUS_TODO, body.scheduled_date, now, now),
                )
            task = {
                "id": cur.lastrowid,
                "title": body.title,
                "description": body.description,
                "status": STATUS_TODO,
                "scheduled_date": body.scheduled_date,
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


@app.patch("/api/tasks/{task_id}")
def update_task(task_id: int, body: TaskIn):
    # 제목 · 설명 · 예정일을 모두 받아 바꾼다(전체 값 방식). 등록과 같은 검증을 쓴다.
    # 상태는 바꾸지 못한다 (D-008). 요청에 status 가 있어도 무시한다.
    now = datetime.now().isoformat(timespec="seconds")
    try:
        conn = connect()
        try:
            with conn:
                conn.execute(
                    "UPDATE tasks SET title = ?, description = ?, scheduled_date = ?, updated_at = ? WHERE id = ?",
                    (body.title, body.description, body.scheduled_date, now, task_id),
                )
            row = conn.execute(f"SELECT {TASK_COLUMNS} FROM tasks WHERE id = ?", (task_id,)).fetchone()
        finally:
            conn.close()
    except sqlite3.Error:
        log.exception("카드 수정 실패")
        raise HTTPException(status_code=500, detail="카드를 수정하지 못했습니다.")
    if row is None:
        raise HTTPException(status_code=404, detail="카드를 찾을 수 없습니다.")
    return dict(row)


@app.patch("/api/tasks/{task_id}/status")
def change_status(task_id: int, body: StatusIn):
    # 상태와 고친 시각만 바꾼다. 제목 · 설명 · 예정일은 건드리지 않는다 (D-008).
    # 현재 상태와 상관없이 세 값 중 아무 값으로나 바꿀 수 있다 (D-010).
    now = datetime.now().isoformat(timespec="seconds")
    try:
        conn = connect()
        try:
            with conn:
                conn.execute(
                    "UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?",
                    (body.status, now, task_id),
                )
            row = conn.execute(f"SELECT {TASK_COLUMNS} FROM tasks WHERE id = ?", (task_id,)).fetchone()
        finally:
            conn.close()
    except sqlite3.Error:
        log.exception("상태 변경 실패")
        raise HTTPException(status_code=500, detail="상태를 바꾸지 못했습니다.")
    if row is None:
        raise HTTPException(status_code=404, detail="카드를 찾을 수 없습니다.")
    return dict(row)


@app.delete("/api/tasks/{task_id}", status_code=204)
def delete_task(task_id: int):
    # 저장소에서 완전히 지운다. 되돌릴 수 없다 (D-013). 삭제 전 확인은 화면의 일이다 (D-024).
    try:
        conn = connect()
        try:
            with conn:
                deleted = conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,)).rowcount
        finally:
            conn.close()
    except sqlite3.Error:
        log.exception("카드 삭제 실패")
        raise HTTPException(status_code=500, detail="카드를 삭제하지 못했습니다.")
    if deleted == 0:
        raise HTTPException(status_code=404, detail="카드를 찾을 수 없습니다.")
    log.info("카드 삭제 완료 (id=%s)", task_id)


@app.get("/api/tasks")
def list_tasks(month: str = Query(pattern=MONTH_PATTERN)):
    # 그 달에 예정일이 있는 카드 전부. 쪽 나누기 없이 날짜순, 같은 날은 등록순 (D-022).
    # 날짜가 YYYY-MM-DD 문자열이라 사전순 비교가 날짜순과 같다.
    try:
        conn = connect()
        try:
            rows = conn.execute(
                f"SELECT {TASK_COLUMNS} FROM tasks "
                "WHERE scheduled_date >= ? AND scheduled_date <= ? "
                "ORDER BY scheduled_date, id",
                (f"{month}-01", f"{month}-31"),
            ).fetchall()
        finally:
            conn.close()
    except sqlite3.Error:
        log.exception("카드 목록 조회 실패")
        raise HTTPException(status_code=500, detail="카드 목록을 불러오지 못했습니다.")
    return {"items": [dict(row) for row in rows]}
