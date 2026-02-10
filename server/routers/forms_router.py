from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Query

from database import get_database
from auth import get_current_user, AdminOnly, AdminOrContributor
from models import FormCreate, FormUpdate, FormPublish

router = APIRouter(prefix="/forms", tags=["Forms"])


def _serialize_form(doc: dict) -> dict:
    doc["id"] = str(doc["_id"])
    doc["_id"] = str(doc["_id"])
    return doc


# ============================
# LIST FORMS (Admin / Contributor)
# ============================
@router.get(
    "",
    response_model=list[dict],
    dependencies=[Depends(AdminOrContributor)],
)
async def list_forms(
    status_filter: str | None = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user),
):
    db = await get_database()

    q = {}
    if status_filter in ("draft", "published"):
        q["status"] = status_filter

    cursor = db.forms.find(q).sort("updatedAt", -1)

    out = []
    async for doc in cursor:
        out.append(_serialize_form(doc))

    return out


# ============================
# CREATE FORM (Admin only)
# ============================
@router.post(
    "",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(AdminOnly)],
)
async def create_form(
    body: FormCreate,
    current_user: dict = Depends(get_current_user),
):
    db = await get_database()

    existing = await db.forms.find_one({"slug": body.slug})
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Form with this slug already exists",
        )

    doc = {
        "title": body.title,
        "slug": body.slug,
        "status": "draft",
        "fields": [],
        "rules": [],
        "updatedAt": datetime.utcnow(),
        "publishedAt": None,
    }

    result = await db.forms.insert_one(doc)
    doc["_id"] = result.inserted_id

    return _serialize_form(doc)


# ============================
# GET FORM BY ID
# ============================
@router.get(
    "/{form_id}",
    response_model=dict,
    dependencies=[Depends(AdminOrContributor)],
)
async def get_form(
    form_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = await get_database()

    if not ObjectId.is_valid(form_id):
        raise HTTPException(status_code=404, detail="Form not found")

    doc = await db.forms.find_one({"_id": ObjectId(form_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Form not found")

    return _serialize_form(doc)


# ============================
# UPDATE FORM (Admin only)
# ============================
@router.patch(
    "/{form_id}",
    response_model=dict,
    dependencies=[Depends(AdminOnly)],
)
async def update_form(
    form_id: str,
    body: FormUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = await get_database()

    if not ObjectId.is_valid(form_id):
        raise HTTPException(status_code=404, detail="Form not found")

    doc = await db.forms.find_one({"_id": ObjectId(form_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Form not found")

    if doc.get("status") == "published":
        raise HTTPException(
            status_code=400,
            detail="Cannot edit a published form; unpublish first",
        )

    upd = {"updatedAt": datetime.utcnow()}

    if body.title is not None:
        upd["title"] = body.title

    if body.slug is not None:
        other = await db.forms.find_one(
            {"slug": body.slug, "_id": {"$ne": ObjectId(form_id)}}
        )
        if other:
            raise HTTPException(status_code=400, detail="Slug already in use")
        upd["slug"] = body.slug

    if body.fields is not None:
        upd["fields"] = [f.model_dump() for f in body.fields]

    if body.rules is not None:
        upd["rules"] = [r.model_dump() for r in body.rules]

    await db.forms.update_one(
        {"_id": ObjectId(form_id)},
        {"$set": upd},
    )

    doc = await db.forms.find_one({"_id": ObjectId(form_id)})
    return _serialize_form(doc)


# ============================
# PUBLISH / UNPUBLISH FORM (Admin only)
# ============================
@router.post(
    "/{form_id}/publish",
    response_model=dict,
    dependencies=[Depends(AdminOnly)],
)
async def publish_form(
    form_id: str,
    body: FormPublish,
    current_user: dict = Depends(get_current_user),
):
    db = await get_database()

    if not ObjectId.is_valid(form_id):
        raise HTTPException(status_code=404, detail="Form not found")

    doc = await db.forms.find_one({"_id": ObjectId(form_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Form not found")

    now = datetime.utcnow()

    if body.publish:
        if not doc.get("fields"):
            raise HTTPException(
                status_code=400,
                detail="Add at least one field before publishing",
            )

        await db.forms.update_one(
            {"_id": ObjectId(form_id)},
            {
                "$set": {
                    "status": "published",
                    "publishedAt": now,
                    "updatedAt": now,
                }
            },
        )
    else:
        await db.forms.update_one(
            {"_id": ObjectId(form_id)},
            {
                "$set": {
                    "status": "draft",
                    "publishedAt": None,
                    "updatedAt": now,
                }
            },
        )

    doc = await db.forms.find_one({"_id": ObjectId(form_id)})
    return _serialize_form(doc)


# ============================
# DELETE FORM (Admin only)
# ============================
@router.delete(
    "/{form_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(AdminOnly)],
)
async def delete_form(
    form_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = await get_database()

    if not ObjectId.is_valid(form_id):
        raise HTTPException(status_code=404, detail="Form not found")

    res = await db.forms.delete_one({"_id": ObjectId(form_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Form not found")
