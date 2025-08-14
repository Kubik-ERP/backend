export interface IBrand {
  id: string;
  brand_name: string;
  notes?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface IBrandWithStore extends IBrand {
  store_id: string;
}

export interface IBrandFilter {
  search?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface IBrandListResponse {
  data: IBrand[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
