import { PartialType } from '@nestjs/swagger';
import { CreateDeviceCodeDto } from './create-device-code.dto';

export class UpdateDeviceCodeDto extends PartialType(CreateDeviceCodeDto) {}
