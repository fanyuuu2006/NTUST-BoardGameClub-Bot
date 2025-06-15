export const isObject = (value: unknown): value is object =>
  typeof value === "object" && value !== null;

export const isEqual = <T>(value1: T, value2: T): boolean => {
  if (typeof value1 !== typeof value2) return false;

  if (Array.isArray(value1) && Array.isArray(value2)) {
    if (value1.length !== value2.length) return false;
    return value1.every((v, i) => isEqual(v, value2[i]));
  }

  if (isObject(value1) && isObject(value2)) {
    const keys1 = Object.keys(value1);
    const keys2 = Object.keys(value2);
    if (keys1.length !== keys2.length) return false;
    return keys1.every((key) =>
      isEqual(
        (value1 as Record<string, unknown>)[key],
        (value2 as Record<string, unknown>)[key]
      )
    );
  }

  return value1 === value2;
};

export const isSameDay = (d1: Date, d2: Date): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const normalize = (str: string): string => str.trim().toLowerCase();
