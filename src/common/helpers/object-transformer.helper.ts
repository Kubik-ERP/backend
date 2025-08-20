function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((v) => toCamelCase(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce(
      (acc, key) => {
        const camelKey = snakeToCamel(key);
        const value = obj[key];

        if (value instanceof Date) {
          acc[camelKey] = value.toISOString();
        } else if (typeof value === 'bigint') {
          acc[camelKey] = parseFloat(value.toString());
        } else if (value instanceof Number) {
          acc[camelKey] = parseFloat(value.toString());
        } else {
          acc[camelKey] = toCamelCase(value);
        }

        return acc;
      },
      {} as Record<string, any>,
    );
  }
  return obj;
}

export function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function isDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((v) => toSnakeCase(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce(
      (acc, key) => {
        const snakeKey = camelToSnake(key);
        const value = obj[key];

        if (value instanceof Date) {
          acc[snakeKey] = value;
        } else if (typeof value === 'string' && isDateString(value)) {
          acc[snakeKey] = new Date(value);
        } else if (typeof value === 'bigint') {
          acc[snakeKey] = parseFloat(value.toString());
        } else if (value instanceof Number) {
          acc[snakeKey] = parseFloat(value.toString());
        } else {
          acc[snakeKey] = toSnakeCase(value);
        }

        return acc;
      },
      {} as Record<string, any>,
    );
  }
  return obj;
}

export function toPlainItem(item: any) {
  if (!item) return item;
  const price = item.price_per_unit;
  const priceNumber =
    price && typeof price === 'object' && typeof price.toNumber === 'function'
      ? price.toNumber()
      : price;
  return { ...item, price_per_unit: priceNumber };
}
