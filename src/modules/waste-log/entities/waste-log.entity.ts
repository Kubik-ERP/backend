import { AppBaseEntity } from '../../../common/entities/base.entity';

export class WasteLog extends AppBaseEntity {
  wasteLogId: string;
  batchId?: string;
  storeId: string;
}

export class WasteLogItem extends AppBaseEntity {
  wasteLogItemId: string;
  wasteLogId: string;
  inventoryItemId: string;
  category?: string;
  quantity: number;
  uom?: string;
  notes?: string;
  photoUrl?: string;
}
