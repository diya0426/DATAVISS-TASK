# Approach: Dynamic Forms and Charts

## 1. Dynamic form rendering and rules

**Rendering from metadata:** The public form is rendered entirely from the form document stored in MongoDB: `title`, `slug`, `fields` (each with `key`, `label`, `type`, `required`, `options`, `validations`), and `rules`. The React public page fetches the form by slug from `/api/public/forms/:slug` and has no form-specific code: it iterates over `form.fields`, and for each field type (`text`, `number`, `select`, `multiselect`, `date`, `boolean`) renders the appropriate input. Labels, keys, options, and validation constraints all come from the API.

**Show/hide rules:** Rules are stored as `{ targetFieldKey, sourceFieldKey, operator, value }`. Semantics: “Show **target** when **source** matches condition.” Operators: `equals`, `notEquals`, `in` (value is a list). On the client, `evaluateVisibleFields(form, data)` recomputes visibility whenever `data` changes: it starts with all fields visible, then for each rule, if the condition is true the target stays visible, otherwise it is hidden. So visibility is live as the user types. On submit, the same rule engine runs on the server in `validate_submission()` so that only visible fields are required/validated and the server rejects invalid or rule-inconsistent payloads.

**Validation:** Client-side validation in `validation.js` mirrors the server (required, min/max, minLength/maxLength, pattern, option checks). Server-side validation in `services/validation.py` uses the same visibility logic and then applies type-specific rules so that the server remains the source of truth and cannot be bypassed.

---

## 2. How chart configurations translate to queries/aggregations

Charts are defined generically: **formId**, **chartType** (bar, line, pie), **dimension** (field key to group by), **measure** (field key or `_count`), **aggregation** (count, sum, avg, min, max), **filters**, and optional **timeBucket** + **timeFieldKey** (date field for day/week/month bucketing).

**Pipeline construction:** `services/chart_aggregation.py` builds a MongoDB aggregation pipeline:

1. **$match:** Restrict to `formId` and apply filters. Filters support: `eq` (equality), `in` (value in list), `range` (min/max for numbers), `dateRange` (from/to for dates). Filter values are applied to `data.<fieldKey>`.

2. **$group:** The group key is `{ dimension: "$data.<dimension>" }`, with optional `time` when time bucketing is set. For time, the chosen date field is normalized to a date (string ISO dates supported via `$dateFromString`), then `$dateToString` with format `%Y-%m-%d`, `%Y-W%V`, or `%Y-%m` for day/week/month. The accumulator is count (`$sum: 1`) or, for numeric measures, `$sum`/`$avg`/`$min`/`$max` on `$data.<measure>` (with safe numeric conversion).

3. **$sort:** By time and/or dimension for stable ordering.

The API endpoint `GET /api/charts/:id/data` runs this pipeline against the `submissions` collection and returns `{ chartType, data: [ { label, dimension, time, value } ], title }`. The frontend then maps this array to the charting library (Recharts) by chart type (bar/line/pie) without any field-specific logic.

---

## 3. Keeping the solution generic and maintainable

- **No hardcoded field names:** Form structure is entirely in the database. The form designer only knows field *types* and the generic field schema (key, label, type, options, validations). The chart builder only knows “dimension” and “measure” as field keys stored in the chart document; the aggregation uses `data.<dimension>` and `data.<measure>` dynamically.

- **Single aggregation path:** One pipeline builder handles all chart configs. Adding a new chart is just saving another document with a different formId/dimension/measure/filters/timeBucket; no new backend code. New field types in forms only require: (1) adding the type to the form designer UI and public renderer, and (2) any type-specific validation and (if needed) aggregation handling (e.g. ensuring numeric aggregation only on number fields is already achieved by using the same generic pipeline with the chosen measure key).

- **Clear separation:** Public form fetch and submit are separate from admin form CRUD. Chart “definitions” are stored documents; “chart data” is computed on demand from submissions. So changing form fields or adding new forms does not require code changes in the charting path—only the stored chart definition’s dimension/measure need to refer to valid keys.

- **Consistent errors:** The API uses HTTP status codes (401, 403, 404, 422) and a consistent `detail` shape (e.g. `{ message, errors: [ { field, message } ] }` for validation), so the client can distinguish client vs server errors and display field-level messages without special cases per endpoint.
