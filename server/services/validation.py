"""Server-side validation of submission data against a form template."""
import re
from datetime import datetime
from models import FormTemplate, FormField, ShowHideRule


def _get_visible_fields(template: dict, data: dict) -> set[str]:
    """Compute which fields are visible: show target when source op value; else hide target."""
    visible = {f["key"] for f in template.get("fields", [])}
    for rule in template.get("rules", []):
        target = rule.get("targetFieldKey")
        source = rule.get("sourceFieldKey")
        op = rule.get("operator")
        val = rule.get("value")
        source_val = data.get(source)
        if op == "equals":
            match = source_val == val
        elif op == "notEquals":
            match = source_val != val
        elif op == "in":
            match = source_val in (val if isinstance(val, list) else [val])
        else:
            match = False
        if match:
            visible.add(target)
        else:
            visible.discard(target)
    return visible


def validate_submission(template: dict, data: dict) -> list[dict]:
    """
    Validate submission data against the form template.
    Returns list of errors: [{"field": key, "message": "..."}].
    """
    errors = []
    visible = _get_visible_fields(template, data)
    fields = template.get("fields", [])

    for f in fields:
        key = f.get("key")
        if key not in visible:
            continue
        required = f.get("required", False)
        value = data.get(key)
        ftype = f.get("type", "text")
        v = f.get("validations") or {}

        if required and (value is None or value == "" or (isinstance(value, list) and len(value) == 0)):
            errors.append({"field": key, "message": f"{f.get('label', key)} is required"})
            continue

        if value is None or value == "":
            continue

        if ftype == "number":
            try:
                n = float(value) if not isinstance(value, (int, float)) else value
            except (TypeError, ValueError):
                errors.append({"field": key, "message": v.get("message") or "Must be a number"})
                continue
            if v.get("min") is not None and n < v["min"]:
                errors.append({"field": key, "message": v.get("message") or f"Must be at least {v['min']}"})
            if v.get("max") is not None and n > v["max"]:
                errors.append({"field": key, "message": v.get("message") or f"Must be at most {v['max']}"})

        if ftype == "text":
            s = str(value)
            if v.get("minLength") is not None and len(s) < v["minLength"]:
                errors.append({"field": key, "message": v.get("message") or f"Min length {v['minLength']}"})
            if v.get("maxLength") is not None and len(s) > v["maxLength"]:
                errors.append({"field": key, "message": v.get("message") or f"Max length {v['maxLength']}"})
            if v.get("pattern"):
                if not re.match(v["pattern"], s):
                    errors.append({"field": key, "message": v.get("message") or "Invalid format"})

        if ftype == "date":
            if not isinstance(value, str):
                errors.append({"field": key, "message": "Invalid date"})
            else:
                try:
                    datetime.fromisoformat(value.replace("Z", "+00:00")[:10])
                except Exception:
                    errors.append({"field": key, "message": v.get("message") or "Invalid date"})

        if ftype == "select":
            opts = f.get("options", [])
            if opts and value not in opts:
                errors.append({"field": key, "message": v.get("message") or "Invalid option"})

        if ftype == "multiselect":
            opts = f.get("options", [])
            vals = value if isinstance(value, list) else [value]
            if opts and any(v not in opts for v in vals):
                errors.append({"field": key, "message": v.get("message") or "Invalid option(s)"})

        if ftype == "boolean":
            if value not in (True, False, "true", "false", 1, 0):
                errors.append({"field": key, "message": "Must be true or false"})

    return errors
