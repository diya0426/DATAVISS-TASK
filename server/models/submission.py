from pydantic import BaseModel
from typing import Any
from datetime import datetime


class SubmissionCreate(BaseModel):
    formId: str
    data: dict[str, Any]


class SubmissionInDB(SubmissionCreate):
    id: str | None = None
    createdAt: datetime | None = None


class SubmissionResponse(BaseModel):
    id: str
    formId: str
    data: dict[str, Any]
    createdAt: datetime
