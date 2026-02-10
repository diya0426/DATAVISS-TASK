/**
 * Evaluate which fields are visible given form rules and current data.
 * Rules: show target when source op value; else hide target.
 */
export function evaluateVisibleFields(form, data) {
  const allKeys = new Set((form.fields || []).map((f) => f.key));
  const visible = new Set(allKeys);
  (form.rules || []).forEach((rule) => {
    const sourceVal = data[rule.sourceFieldKey];
    const val = rule.value;
    let match = false;
    if (rule.operator === 'equals') match = sourceVal === val;
    else if (rule.operator === 'notEquals') match = sourceVal !== val;
    else if (rule.operator === 'in') match = Array.isArray(val) ? val.includes(sourceVal) : val === sourceVal;
    if (match) visible.add(rule.targetFieldKey);
    else visible.delete(rule.targetFieldKey);
  });
  return visible;
}
