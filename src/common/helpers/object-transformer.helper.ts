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
