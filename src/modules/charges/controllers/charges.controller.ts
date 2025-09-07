import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { UpsertChargeDto } from '../dtos/charges.dto';
import { ChargesService } from '../services/charges.service';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';

@Controller('charges')
export class ChargesController {
  constructor(private readonly chargeService: ChargesService) {}

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('tax_and_service_charge_configuration')
  @ApiBearerAuth()
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

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('tax_and_service_charge_configuration')
  @ApiBearerAuth()
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
