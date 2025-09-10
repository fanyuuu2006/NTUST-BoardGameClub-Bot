/**
 * 檢查值是否為物件（不包含 null）
 * @param value 要檢查的值
 * @returns 如果值是物件則返回 true，否則返回 false
 */
export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * 深度比較兩個值是否相等
 * 支援原始型別、陣列、物件和 Date 物件的比較
 * @param value1 第一個值
 * @param value2 第二個值
 * @returns 如果兩個值深度相等則返回 true，否則返回 false
 */
export const isEqual = <T>(value1: T, value2: T): boolean => {
  // 嚴格相等檢查（包含 NaN 的情況）
  if (Object.is(value1, value2)) return true;

  // 型別檢查
  if (typeof value1 !== typeof value2) return false;

  // Date 物件比較
  if (value1 instanceof Date && value2 instanceof Date) {
    return value1.getTime() === value2.getTime();
  }

  // 陣列比較
  if (Array.isArray(value1) && Array.isArray(value2)) {
    if (value1.length !== value2.length) return false;
    return value1.every((v, i) => isEqual(v, value2[i]));
  }

  // 物件比較
  if (isObject(value1) && isObject(value2)) {
    const keys1 = Object.keys(value1);
    const keys2 = Object.keys(value2);
    if (keys1.length !== keys2.length) return false;

    const set2 = new Set(keys2);
    for (const key of keys1) {
      if (!set2.has(key) || !isEqual(value1[key], value2[key])) return false;
    }
    return true;
  }

  return false;
};

/**
 * 檢查兩個日期是否為同一天
 * @param d1 第一個日期
 * @param d2 第二個日期
 * @returns 如果是同一天則返回 true，否則返回 false
 */
export const isSameDay = (d1: Date, d2: Date): boolean => {
  // 輸入驗證
  if (!(d1 instanceof Date) || !(d2 instanceof Date)) {
    throw new Error("Both parameters must be Date objects");
  }

  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return false;
  }

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

/**
 * 標準化字串（去除空白並轉為小寫）
 * @param str 要標準化的字串
 * @returns 標準化後的字串
 */
export const normalize = (str: string): string => {
  if (typeof str !== "string") {
    throw new Error("Parameter must be a string");
  }
  return str.trim().toLowerCase();
};
