import { Body, Controller, Get, Post } from '@nestjs/common';
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
  public async upsertCharge(@Body() query: UpsertChargeDto) {
    const response = await this.chargeService.upsertCharge(query);
    return {
      result: toCamelCase(response),
    };
  }

  @Get('')
  @ApiOperation({
    summary: 'Fetch charge list',
  })
  public async chargeList() {
    const response = await this.chargeService.chargeList();
    return {
      result: toCamelCase(response),
    };
  }
}
