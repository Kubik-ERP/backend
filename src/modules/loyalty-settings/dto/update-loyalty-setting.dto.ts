import { PartialType } from '@nestjs/swagger';
import { CreateLoyaltySettingDto } from './create-loyalty-setting.dto';

export class UpdateLoyaltySettingDto extends PartialType(
  CreateLoyaltySettingDto,
) {}
