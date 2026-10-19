import logging
from itertools import count

from fastapi import FastAPI, Query
from pydantic import BaseModel, Field, field_validator

MAX_LENGTH = 300

app = FastAPI(title="메모 작성")
log = logging.getLogger("uvicorn.error")

# 서버 메모리 저장소. 등록 순서대로 쌓이며, 서버를 다시 시작하면 사라진다.
memos: list[dict] = []
next_id = count(1)


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
    memo = {"id": next(next_id), "content": body.content}
    memos.append(memo)
    log.info("메모 등록 완료 (id=%s)", memo["id"])
    return memo


@app.get("/memos")
def list_memos(offset: int = Query(0, ge=0), limit: int = Query(5, ge=1, le=5)):
    newest_first = memos[::-1]
    items = newest_first[offset : offset + limit]
    return {"items": items, "has_more": offset + limit < len(newest_first)}
