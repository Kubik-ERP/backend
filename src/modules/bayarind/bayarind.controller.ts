import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { BayarindService, StoreFiles } from './bayarind.service';
import { RegisterBayarindDto } from './dto/create-store.dto';
import { ListBankDto } from './dto/list-bank.dto';

@ApiTags('Bayarind Integration')
@Controller('bayarind')
export class BayarindController {
  constructor(private readonly bayarindService: BayarindService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register existing store to Bayarind (Update bayarindStoreId)',
  })
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'idCardImage', maxCount: 1 },
      { name: 'businessImage', maxCount: 1 },
      { name: 'selfie', maxCount: 1 },
    ]),
  )
  async registerMerchant(
    @Body() dto: RegisterBayarindDto,
    @UploadedFiles() files: StoreFiles,
    @Req() req: ICustomRequestHeaders,
  ) {
    const result = await this.bayarindService.registerStore(dto, files, req);
    return {
      message: 'Brands retrieved successfully',
      result: toCamelCase(result),
    };
  }

  @Get('business-types')
  @ApiOperation({
    summary: 'Get Bayarind Business Types',
  })
  async getBusinessTypes() {
    const result = await this.bayarindService.getBusinessTypes();
    return {
      message: 'Business types retrieved successfully',
      result: toCamelCase(result),
    };
  }

  @Get('list-bank-accounts')
  @ApiOperation({
    summary: 'Get Bayarind Store Bank Accounts',
  })
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  async getStoreBankAccounts(@Req() req: ICustomRequestHeaders) {
    const result = await this.bayarindService.getRegisterdBankAccounts(req);
    return {
      message: 'Store bank accounts retrieved successfully',
      result: toCamelCase(result),
    };
  }

  @Get('provinces')
  @ApiOperation({
    summary: 'Get Bayarind Provinces',
  })
  async getProvinces() {
    const result = await this.bayarindService.getProvinces();
    return {
      message: 'Provinces retrieved successfully',
      result: toCamelCase(result),
    };
  }

  @Get('cities/:provinceId')
  @ApiOperation({
    summary: 'Get Bayarind Cities',
  })
  async getCities(@Param('provinceId') provinceId: string) {
    const result = await this.bayarindService.getCities(7, provinceId);
    return {
      message: 'Cities retrieved successfully',
      result: toCamelCase(result),
    };
  }

  @Get('districts/:cityId')
  @ApiOperation({
    summary: 'Get Bayarind Districts',
  })
  async getDistricts(@Param('cityId') cityId: string) {
    const result = await this.bayarindService.getDistricts(7, cityId);
    return {
      message: 'Districts retrieved successfully',
      result: toCamelCase(result),
    };
  }

  @Get('subdistricts/:districtId')
  @ApiOperation({
    summary: 'Get Bayarind Subdistricts',
  })
  async getSubdistricts(@Param('districtId') districtId: string) {
    const result = await this.bayarindService.getSubdistricts(7, districtId);
    return {
      message: 'Subdistricts retrieved successfully',
      result: toCamelCase(result),
    };
  }

  @Get('banks')
  @ApiOperation({
    summary: 'Get Bayarind Banks',
  })
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  async getBanks(@Query() dto: ListBankDto, @Req() req: ICustomRequestHeaders) {
    const result = await this.bayarindService.getListBanks(dto, req);
    return {
      message: 'Banks retrieved successfully',
      result: toCamelCase(result),
    };
  }
}
