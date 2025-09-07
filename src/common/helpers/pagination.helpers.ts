import { convertFromUnixTimestamp } from './common.helpers';

export const formatPaginatedResult = <T>(
  data: any,
  count: number = 0,
  page: number = 1,
  perPage: number = 10,
) => {
  const transformedData = data.map((item: any) => {
    const newItem: any = {};

    for (const key in item) {
      const value = item[key];

      if (
        (key === 'created_at' ||
          key === 'updated_at' ||
          key === 'createdAt' ||
          key === 'updatedAt') &&
        value != null
      ) {
        try {
          newItem[key] = convertFromUnixTimestamp(BigInt(value));
        } catch {
          newItem[key] = value;
        }
      } else if (typeof value === 'bigint') {
        newItem[key] = Number(value);
      } else {
        newItem[key] = value;
      }
    }

    return newItem;
  });

  return {
    items: transformedData,
    meta: {
      total: count,
      totalPages: Math.ceil(count / perPage),
      currentPage: page,
      perPage,
    },
  };
};

/**
 * Get total pages
 *
 * @param total - Total items
 * @param pageSize - Item per page
 * @returns Total pages
 */
export const getTotalPages = (total: number, pageSize: number) => {
  return Math.ceil(total / pageSize);
};

/**
 * Get offset
 *
 * @param page - Current page
 * @param pageSize - Item per page
 * @returns Offset
 */
export const getOffset = (page: number, pageSize: number) => {
  return (page - 1) * pageSize;
};
