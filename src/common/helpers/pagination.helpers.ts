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

      if ((key === 'created_at' || key === 'updated_at' || key === 'createdAt' || key === 'updatedAt') && value != null) {
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
