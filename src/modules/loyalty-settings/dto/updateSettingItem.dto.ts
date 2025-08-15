import { PartialType } from '@nestjs/swagger';
import { AddProductLoyaltySettings } from './create-loyalty-setting.dto';

export class UpdateSettingItemDto extends PartialType(
  AddProductLoyaltySettings,
) {}
