from bson import ObjectId
from fastapi import APIRouter, HTTPException, status
from database import get_database
from services.validation import validate_submission

router = APIRouter()


def _serialize_form(doc):
    doc["id"] = str(doc["_id"])
    doc["_id"] = str(doc["_id"])
    return doc


@router.get("/forms/{slug}", response_model=dict)
async def get_published_form(slug: str):
    db = await get_database()
    doc = await db.forms.find_one({"slug": slug, "status": "published"})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found or not published")
    return _serialize_form(doc)


@router.post("/forms/{slug}/submit", response_model=dict)
async def submit_form(slug: str, body: dict):
    db = await get_database()
    form = await db.forms.find_one({"slug": slug, "status": "published"})
    if not form:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Form not found or not published")

    data = body.get("data", body)

    # ✅ 1. Validate FIRST
    errors = validate_submission(form, data)
    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Validation failed", "errors": errors},
        )

    # ✅ 2. Convert date fields AFTER validation
    from datetime import datetime
    for field in form.get("fields", []):
        key = field.get("key")
        if field.get("type") == "date" and key in data:
            value = data.get(key)
            if isinstance(value, str) and value:
                data[key] = datetime.fromisoformat(value)

    doc = {
        "formId": str(form["_id"]),
        "data": data,
        "createdAt": datetime.utcnow(),
    }

    r = await db.submissions.insert_one(doc)
    return {
        "success": True,
        "submissionId": str(r.inserted_id),
        "message": "Thank you for your submission.",
    }
