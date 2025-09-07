import { PartialType } from '@nestjs/swagger';
import { CreateStockOpnameDto } from './create-stock-opname.dto';

export class UpdateStockOpnameDto extends PartialType(CreateStockOpnameDto) {}
