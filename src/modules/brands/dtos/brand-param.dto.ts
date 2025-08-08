import { IsUUID } from 'class-validator';
import { ParamIdDto } from 'src/common/dtos/param-id.dto';

export class BrandParamDto extends ParamIdDto {
  @IsUUID()
  id: string;
}
