from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Query
from database import get_database
from auth import get_current_user, AdminOrContributor
from models import ChartCreate, ChartResponse, ChartConfig
from services.chart_aggregation import build_pipeline, run_aggregation

router = APIRouter()


def _serialize(doc):
    doc["id"] = str(doc["_id"])
    doc["_id"] = str(doc["_id"])
    if doc.get("createdAt"):
        doc["createdAt"] = doc["createdAt"].isoformat() + "Z"
    return doc


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_chart(
    body: ChartCreate,
    current_user: dict = Depends(get_current_user),
    _=Depends(AdminOrContributor),
):
    db = await get_database()
    form = await db.forms.find_one({"_id": ObjectId(body.formId)})
    if not form:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Form not found")
    doc = {
        "formId": body.formId,
        "chartType": body.chartType,
        "dimension": body.dimension,
        "measure": body.measure,
        "aggregation": body.aggregation,
        "filters": [f.model_dump() for f in body.filters],
        "timeBucket": body.timeBucket,
        "timeFieldKey": body.timeFieldKey,
        "title": body.title or "",
        "createdAt": datetime.utcnow(),
    }
    r = await db.charts.insert_one(doc)
    doc["_id"] = r.inserted_id
    return _serialize(doc)


@router.get("", response_model=list[dict])
async def list_charts(
    form_id: str | None = Query(None, alias="formId"),
    current_user: dict = Depends(get_current_user),
    _=Depends(AdminOrContributor),
):
    db = await get_database()
    q = {}
    if form_id:
        q["formId"] = form_id
    cursor = db.charts.find(q).sort("createdAt", -1)
    out = []
    async for doc in cursor:
        out.append(_serialize(doc))
    return out


@router.get("/dashboard", response_model=list[dict])
async def dashboard_charts(
    current_user: dict = Depends(get_current_user),
    _=Depends(AdminOrContributor),
):
    return await list_charts(None, current_user, _)


@router.get("/{chart_id}", response_model=dict)
async def get_chart(
    chart_id: str,
    current_user: dict = Depends(get_current_user),
    _=Depends(AdminOrContributor),
):
    db = await get_database()
    if not ObjectId.is_valid(chart_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chart not found")
    doc = await db.charts.find_one({"_id": ObjectId(chart_id)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chart not found")
    return _serialize(doc)


@router.get("/{chart_id}/data", response_model=dict)
async def get_chart_data(
    chart_id: str,
    current_user: dict = Depends(get_current_user),
    _=Depends(AdminOrContributor),
):
    db = await get_database()
    if not ObjectId.is_valid(chart_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chart not found")
    chart = await db.charts.find_one({"_id": ObjectId(chart_id)})
    if not chart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chart not found")
    pipeline = build_pipeline(
        chart["formId"],
        chart["dimension"],
        chart["measure"],
        chart.get("aggregation", "count"),
        chart.get("filters", []),
        chart.get("timeBucket"),
        chart.get("timeFieldKey"),
    )
    data = await run_aggregation(db.submissions, pipeline)
    return {"chartId": chart_id, "chartType": chart.get("chartType"), "data": data, "title": chart.get("title", "")}


@router.delete("/{chart_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chart(
    chart_id: str,
    current_user: dict = Depends(get_current_user),
    _=Depends(AdminOrContributor),
):
    db = await get_database()
    if not ObjectId.is_valid(chart_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chart not found")
    res = await db.charts.delete_one({"_id": ObjectId(chart_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chart not found")
