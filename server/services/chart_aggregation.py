"""
Generic chart data aggregation from submissions.
Builds MongoDB aggregation pipeline from chart config (dimension, measure, filters, time bucket).
"""
from datetime import datetime
from bson import ObjectId


def _date_expr(field_path: str) -> dict:
    """Convert string or date to date for grouping."""
    return {
        "$cond": {
            "if": {"$eq": [{"$type": field_path}, "string"]},
            "then": {"$dateFromString": {"dateString": field_path, "onError": None, "onNull": None}},
            "else": field_path,
        }
    }


def _match_stage(form_id: str, filters: list[dict]) -> dict:
    """Build $match for formId and optional filters (eq, in, range, dateRange)."""
    q = {"formId": form_id}
    for f in filters or []:
        key = f.get("fieldKey")
        op = f.get("operator")
        val = f.get("value")
        if not key:
            continue
        field_path = f"data.{key}"
        if op == "eq":
            q[field_path] = val
        elif op == "in":
            q[field_path] = {"$in": val if isinstance(val, list) else [val]}
        elif op == "range":
            if isinstance(val, dict):
                if "min" in val:
                    q.setdefault(field_path, {})["$gte"] = val["min"]
                if "max" in val:
                    q.setdefault(field_path, {})["$lte"] = val["max"]
        elif op == "dateRange":
            if isinstance(val, dict):
                if "from" in val:
                    q.setdefault(field_path, {})["$gte"] = datetime.fromisoformat(val["from"].replace("Z", "+00:00"))
                if "to" in val:
                    q.setdefault(field_path, {})["$lte"] = datetime.fromisoformat(val["to"].replace("Z", "+00:00"))
    return {"$match": q}


def _project_group_key(time_bucket: str | None, time_field_key: str | None, dimension: str) -> dict:
    """$group key: optionally date bucketing + dimension."""
    key = {"dimension": {"$ifNull": [f"$data.{dimension}", "N/A"]}}
    if time_bucket and time_field_key:
        dt = _date_expr(f"$data.{time_field_key}")
        if time_bucket == "day":
            key["time"] = {"$dateToString": {"format": "%Y-%m-%d", "date": dt}}
        elif time_bucket == "week":
            key["time"] = {"$dateToString": {"format": "%Y-W%V", "date": dt}}
        elif time_bucket == "month":
            key["time"] = {"$dateToString": {"format": "%Y-%m", "date": dt}}
    return key


def _group_accumulator(aggregation: str, measure: str) -> dict:
    if aggregation == "count" or measure == "_count":
        return {"$sum": 1}
    field = f"$data.{measure}" if measure != "_count" else None
    if aggregation == "sum":
        return {"$sum": {"$toDouble": {"$ifNull": [field, 0]}}}
    if aggregation == "avg":
        return {"$avg": {"$toDouble": {"$ifNull": [field, 0]}}}
    if aggregation == "min":
        return {"$min": field}
    if aggregation == "max":
        return {"$max": field}
    return {"$sum": 1}


def build_pipeline(form_id: str, dimension: str, measure: str, aggregation: str,
                   filters: list[dict], time_bucket: str | None, time_field_key: str | None):
    """Return MongoDB aggregation pipeline stages for the chart."""
    stages = [
        _match_stage(form_id, filters),
        {"$group": {
            "_id": _project_group_key(time_bucket, time_field_key, dimension),
            "value": _group_accumulator(aggregation, measure),
        }},
        {"$sort": {"_id.time": 1, "_id.dimension": 1}},
    ]
    return stages


async def run_aggregation(coll, pipeline) -> list[dict]:
    """Run pipeline and return list of { _id: { dimension?, time? }, value }."""
    out = []
    async for doc in coll.aggregate(pipeline):
        out.append({
            "label": doc["_id"].get("time") or doc["_id"].get("dimension"),
            "dimension": doc["_id"].get("dimension"),
            "time": doc["_id"].get("time"),
            "value": doc["value"],
        })
    return out
