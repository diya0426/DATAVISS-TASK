from pydantic import BaseModel
from typing import Literal, Any
from datetime import datetime

ChartType = Literal["bar", "line", "pie"]
Aggregation = Literal["count", "sum", "avg", "min", "max"]
TimeBucket = Literal["day", "week", "month"]


class ChartFilter(BaseModel):
    fieldKey: str
    operator: Literal["eq", "in", "range", "dateRange"]
    value: Any  # single value, list, or { min, max } for range


class ChartConfig(BaseModel):
    formId: str
    chartType: ChartType
    dimension: str  # field key to group by
    measure: str  # field key for aggregation (or "_count" for count)
    aggregation: Aggregation = "count"
    filters: list[ChartFilter] = []
    timeBucket: TimeBucket | None = None
    timeFieldKey: str | None = None  # date field for time bucketing
    title: str = ""


class ChartCreate(ChartConfig):
    pass


class ChartInDB(ChartConfig):
    id: str | None = None
    createdAt: datetime | None = None


class ChartResponse(BaseModel):
    id: str
    formId: str
    chartType: str
    dimension: str
    measure: str
    aggregation: str
    filters: list[dict]
    timeBucket: str | None
    timeFieldKey: str | None
    title: str
    createdAt: datetime
