import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { UpsertChargeDto } from '../dtos/charges.dto';
import { ChargesService } from '../services/charges.service';

@Controller('charges')
export class ChargesController {
  constructor(private readonly chargeService: ChargesService) {}

  @Post('/upsert')
  @ApiOperation({
    summary: 'Update or insert charge',
  })
  public async invoiceList(@Body() query: UpsertChargeDto) {
    const response = await this.chargeService.upsertCharge(query);
    return {
      result: toCamelCase(response),
    };
  }
}
