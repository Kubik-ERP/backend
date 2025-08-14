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
import { CreateLoyaltySettingDto } from './dto/create-loyalty-setting.dto';
import { LoyaltyProductItemQueryDto } from './dto/loyalty-product-items-query.dto';
import { UpdateLoyaltySettingDto } from './dto/update-loyalty-setting.dto';
import { LoyaltySettingsService } from './loyalty-settings.service';

@Controller('loyalty-settings')
export class LoyaltySettingsController {
  constructor(
    private readonly loyaltySettingsService: LoyaltySettingsService,
  ) {}

  @ApiOperation({ summary: 'Create Loyalty Setting' })
  @ApiBearerAuth()
  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Post()
  async create(
    @Body() createLoyaltySettingDto: CreateLoyaltySettingDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const data = await this.loyaltySettingsService.create(
      createLoyaltySettingDto,
      req,
    );
    return {
      message: 'Loyalty setting created successfully',
      result: toCamelCase(data),
    };
  }

  @ApiOperation({ summary: 'Get All Loyalty Settings' })
  @ApiBearerAuth()
  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Get()
  async findAll(@Req() req: ICustomRequestHeaders) {
    const data = await this.loyaltySettingsService.findAll(req);
    return {
      message: 'Loyalty settings retrieved successfully',
      result: toCamelCase(data),
    };
  }

  @ApiOperation({ summary: 'Get All Loyalty Product Settings' })
  @ApiBearerAuth()
  @UseGuards(AuthenticationJWTGuard)
  @Get(':id/product')
  async findAllProductSettings(
    @Query() query: LoyaltyProductItemQueryDto,
    @Param('id') id: string,
  ) {
    const data = await this.loyaltySettingsService.findAllProductSettings(
      query,
      id,
    );
    return {
      message: 'Loyalty product settings retrieved successfully',
      result: toCamelCase(data),
    };
  }

  @Get(':storeId')
  findOne(@Param('storeId') storeId: string) {
    return this.loyaltySettingsService.findOne(+storeId);
  }

  @ApiOperation({ summary: 'Update Loyalty Setting' })
  @ApiBearerAuth()
  @UseGuards(AuthenticationJWTGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateLoyaltySettingDto: UpdateLoyaltySettingDto,
  ) {
    const data = await this.loyaltySettingsService.update(
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
    return this.loyaltySettingsService.remove(+id);
  }
}
