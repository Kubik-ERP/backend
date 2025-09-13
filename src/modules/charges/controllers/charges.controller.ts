import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation } from '@nestjs/swagger';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { UpsertChargeDto } from '../dtos/charges.dto';
import { ChargesService } from '../services/charges.service';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';

@Controller('charges')
export class ChargesController {
  constructor(private readonly chargeService: ChargesService) {}

  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('tax_and_service_charge_configuration')
  @ApiBearerAuth()
  @Post('/upsert')
  @ApiOperation({
    summary: 'Update or insert charge',
  })
  public async upsertCharge(
    @Body() query: UpsertChargeDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const response = await this.chargeService.upsertCharge(query, req);
    return {
      result: toCamelCase(response),
    };
  }

  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('tax_and_service_charge_configuration')
  @ApiBearerAuth()
  @Get('')
  @ApiOperation({
    summary: 'Fetch charge list',
  })
  public async chargeList(@Req() req: ICustomRequestHeaders) {
    const response = await this.chargeService.chargeList(req);
    return {
      result: toCamelCase(response),
    };
  }
}
