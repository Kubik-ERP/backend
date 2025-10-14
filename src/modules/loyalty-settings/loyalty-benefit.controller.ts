import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation } from '@nestjs/swagger';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { CreateBenefitDto } from './dto/create-benefit.dto';
import { LoyaltyProductItemQueryDto } from './dto/loyalty-product-items-query.dto';
import { UpdateBenefitDto } from './dto/update-benefit.dto';
import { LoyaltyBenefitService } from './loyalty-benefit.service';

@Controller('loyalty-benefit')
export class LoyaltyBenefitController {
  constructor(private readonly loyaltyBenefitService: LoyaltyBenefitService) {}

  @ApiOperation({ summary: 'Create Loyalty Benefit' })
  @ApiBearerAuth()
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('general_loyalty_point_configuration')
  @Post(':settingId')
  async create(
    @Param('settingId') settingId: string,
    @Body() createBenefitDto: CreateBenefitDto,
  ) {
    const data = await this.loyaltyBenefitService.create(
      createBenefitDto,
      settingId,
    );
    return {
      message: 'Loyalty benefit created successfully',
      result: toCamelCase(data),
    };
  }

  @ApiOperation({ summary: 'Get All Loyalty Benefits' })
  @ApiBearerAuth()
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('general_loyalty_point_configuration')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Get()
  async findAll(
    @Req() req: ICustomRequestHeaders,
    @Query() query: LoyaltyProductItemQueryDto,
  ) {
    const data = await this.loyaltyBenefitService.findAll(req, query);
    return {
      message: 'Loyalty benefits retrieved successfully',
      result: toCamelCase(data),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('general_loyalty_point_configuration')
  @ApiBearerAuth()
  @Get(':storeId')
  findOne(@Param('storeId') storeId: string) {
    return this.loyaltyBenefitService.findOne(+storeId);
  }

  @ApiOperation({ summary: 'Update Loyalty Setting' })
  @ApiBearerAuth()
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('general_loyalty_point_configuration')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBenefitDto: UpdateBenefitDto,
  ) {
    const data = await this.loyaltyBenefitService.update(id, updateBenefitDto);
    return {
      message: 'Loyalty setting updated successfully',
      result: toCamelCase(data),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('general_loyalty_point_configuration')
  @ApiBearerAuth()
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.loyaltyBenefitService.remove(id);
    return {
      message: 'Loyalty benefit removed successfully',
      result: toCamelCase(data),
    };
  }
}
