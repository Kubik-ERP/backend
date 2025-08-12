export interface IStorageLocation {
  id: string;
  name: string;
  notes?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface IStorageLocationFilter {
  search?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface IStorageLocationListResponse {
  items: IStorageLocation[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
