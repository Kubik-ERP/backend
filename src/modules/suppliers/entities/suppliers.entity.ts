import { AppBaseEntity } from '../../../common/entities/base.entity';

export class Supplier extends AppBaseEntity {
  id: string;
  supplier_name: string;
  contact_person: string;
  phone_number: string;
  email?: string;
  address?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  tax_identification_number?: string;
  created_at: Date;
  updated_at: Date;
}
