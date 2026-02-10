import csv
import io
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from database import get_database
from auth import get_current_user, AdminOrContributor
from models import SubmissionResponse

router = APIRouter()


def _serialize(doc):
    doc["id"] = str(doc["_id"])
    doc["_id"] = str(doc["_id"])
    if doc.get("createdAt"):
        doc["createdAt"] = doc["createdAt"].isoformat() + "Z"
    return doc


def _build_filter(form_id: str, filter_data: str | None):
    q = {"formId": form_id}
    if filter_data:
        try:
            import json
            data_filter = json.loads(filter_data)
            for k, v in data_filter.items():
                if isinstance(v, list):
                    q[f"data.{k}"] = {"$in": v}
                else:
                    q[f"data.{k}"] = v
        except Exception:
            pass
    return q


@router.get("", response_model=dict)
async def list_submissions(
    form_id: str = Query(..., alias="formId"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
    filter_query: str | None = Query(None, alias="filter"),
    current_user: dict = Depends(get_current_user),
    _=Depends(AdminOrContributor),
):
    db = await get_database()
    if not ObjectId.is_valid(form_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid formId")
    q = _build_filter(form_id, filter_query)
    skip = (page - 1) * page_size
    total = await db.submissions.count_documents(q)
    cursor = db.submissions.find(q).sort("createdAt", -1).skip(skip).limit(page_size)
    items = []
    async for doc in cursor:
        items.append(_serialize(doc))
    return {"items": items, "total": total, "page": page, "pageSize": page_size}


@router.get("/export")
async def export_submissions_csv(
    form_id: str = Query(..., alias="formId"),
    current_user: dict = Depends(get_current_user),
    _=Depends(AdminOrContributor),
):
    db = await get_database()
    if not ObjectId.is_valid(form_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid formId")
    form = await db.forms.find_one({"_id": ObjectId(form_id)})
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found")
    keys = [f["key"] for f in form.get("fields", [])]
    keys = ["id", "createdAt"] + keys
    cursor = db.submissions.find({"formId": form_id}).sort("createdAt", -1)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(keys)
    async for doc in cursor:
        row = [str(doc["_id"]), doc.get("createdAt").isoformat() + "Z" if doc.get("createdAt") else ""]
        for k in keys[2:]:
            v = doc.get("data", {}).get(k)
            if isinstance(v, list):
                v = ",".join(str(x) for x in v)
            row.append("" if v is None else str(v))
        writer.writerow(row)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=submissions_{form_id}.csv"},
    )
