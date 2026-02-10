/**
 * Client-side validation for a single field (mirrors server rules).
 */
export function validateField(field, value) {
  const required = field.required;
  const v = field.validations || {};
  if (required && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
    return `${field.label || field.key} is required`;
  }
  if (value === undefined || value === null || value === '') return null;

  if (field.type === 'number') {
    const n = Number(value);
    if (Number.isNaN(n)) return v.message || 'Must be a number';
    if (v.min != null && n < v.min) return v.message || `Min ${v.min}`;
    if (v.max != null && n > v.max) return v.message || `Max ${v.max}`;
  }

  if (field.type === 'text') {
    const s = String(value);
    if (v.minLength != null && s.length < v.minLength) return v.message || `Min length ${v.minLength}`;
    if (v.maxLength != null && s.length > v.maxLength) return v.message || `Max length ${v.maxLength}`;
    if (v.pattern) {
      try {
        if (!new RegExp(v.pattern).test(s)) return v.message || 'Invalid format';
      } catch (_) {}
    }
  }

  if (field.type === 'select' && field.options?.length && !field.options.includes(value)) {
    return v.message || 'Invalid option';
  }
  if (field.type === 'multiselect' && field.options?.length) {
    const arr = Array.isArray(value) ? value : [value];
    if (arr.some((x) => !field.options.includes(x))) return v.message || 'Invalid option(s)';
  }

  return null;
}
