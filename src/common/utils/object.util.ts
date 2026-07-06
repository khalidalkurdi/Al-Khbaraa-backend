export type EmptyFilterable = unknown;

/**
 * Returns a shallow copy of the object without keys whose values are
 * `undefined`, `null`, empty strings, or empty arrays.
 * Useful to prevent optional fields from overwriting existing data with empty values.
 */
export function omitEmpty<T extends Record<string, EmptyFilterable>>(
  obj: T,
): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    if (Array.isArray(value) && value.length === 0) {
      continue;
    }
    result[key as keyof T] = value as T[keyof T];
  }

  return result;
}
