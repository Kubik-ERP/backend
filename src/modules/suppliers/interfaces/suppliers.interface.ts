export interface ISupplier {
  id: string;
  supplier_name: string;
  contact_person: string;
  phone_number: string;
  email?: string | null;
  address?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_name?: string | null;
  tax_identification_number?: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export interface ICreateSupplier {
  supplier_name: string;
  contact_person: string;
  phone_number: string;
  email?: string | null;
  address?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_name?: string | null;
  tax_identification_number?: string | null;
}

export interface IUpdateSupplier {
  supplier_name?: string;
  contact_person?: string;
  phone_number?: string;
  email?: string | null;
  address?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_name?: string | null;
  tax_identification_number?: string | null;
}

export interface ISuppliersListFilter {
  page: number;
  pageSize: number;
  search?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}
