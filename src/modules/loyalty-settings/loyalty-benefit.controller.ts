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
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { CreateBenefitDto } from './dto/create-benefit.dto';
import { LoyaltyProductItemQueryDto } from './dto/loyalty-product-items-query.dto';
import { UpdateLoyaltySettingDto } from './dto/update-loyalty-setting.dto';
import { LoyaltyBenefitService } from './loyalty-benefit.service';

@Controller('loyalty-benefit')
export class LoyaltyBenefitController {
  constructor(private readonly loyaltyBenefitService: LoyaltyBenefitService) {}

  @ApiOperation({ summary: 'Create Loyalty Benefit' })
  @ApiBearerAuth()
  @UseGuards(AuthenticationJWTGuard)
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
  @UseGuards(AuthenticationJWTGuard)
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

  @Get(':storeId')
  findOne(@Param('storeId') storeId: string) {
    return this.loyaltyBenefitService.findOne(+storeId);
  }

  @ApiOperation({ summary: 'Update Loyalty Setting' })
  @ApiBearerAuth()
  @UseGuards(AuthenticationJWTGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateLoyaltySettingDto: UpdateLoyaltySettingDto,
  ) {
    const data = await this.loyaltyBenefitService.update(
      id,
      updateLoyaltySettingDto,
    );
    return {
      message: 'Loyalty setting updated successfully',
      result: toCamelCase(data),
    };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.loyaltyBenefitService.remove(+id);
  }
}
