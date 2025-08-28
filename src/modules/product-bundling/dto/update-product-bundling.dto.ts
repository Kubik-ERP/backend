import { PartialType } from '@nestjs/swagger';
import { CreateProductBundlingDto } from './create-product-bundling.dto';

export class UpdateProductBundlingDto extends PartialType(
  CreateProductBundlingDto,
) {}
