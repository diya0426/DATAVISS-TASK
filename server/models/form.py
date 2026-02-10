from pydantic import BaseModel, Field
from typing import Literal, Any
from datetime import datetime

FieldType = Literal["text", "number", "select", "multiselect", "date", "boolean"]


class FieldValidation(BaseModel):
    min: int | float | None = None
    max: int | float | None = None
    minLength: int | None = None
    maxLength: int | None = None
    pattern: str | None = None  # regex
    message: str | None = None


class FormField(BaseModel):
    key: str
    label: str
    type: FieldType
    required: bool = False
    order: int = 0
    options: list[str] = []  # for select, multiselect
    validations: FieldValidation | None = None


class ShowHideRule(BaseModel):
    targetFieldKey: str  # field to show/hide
    sourceFieldKey: str
    operator: Literal["equals", "in", "notEquals"]
    value: Any  # single value or list for "in"


class FormTemplate(BaseModel):
    title: str
    slug: str
    status: Literal["draft", "published"] = "draft"
    fields: list[FormField] = []
    rules: list[ShowHideRule] = []
    updatedAt: datetime | None = None
    publishedAt: datetime | None = None


class FormCreate(BaseModel):
    title: str
    slug: str


class FormUpdate(BaseModel):
    title: str | None = None
    slug: str | None = None
    fields: list[FormField] | None = None
    rules: list[ShowHideRule] | None = None


class FormPublish(BaseModel):
    publish: bool  # true = publish, false = unpublish
