import { AppBaseEntity } from '../../../common/entities/base.entity';

export class BrandEntity extends AppBaseEntity {
  brand_name: string;
  notes?: string;
}
