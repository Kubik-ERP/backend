export interface IInventoryCategory {
  id: string;
  name: string;
  notes?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface IInventoryCategoryFilter {
  search?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface IInventoryCategoryListResponse {
  items: IInventoryCategory[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
