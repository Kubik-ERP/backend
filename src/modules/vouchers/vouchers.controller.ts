import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Put,
  Delete,
} from '@nestjs/common';
import { toCamelCase } from '../../common/helpers/object-transformer.helper';
import { VouchersService } from './vouchers.service';
import { ApiBearerAuth, ApiHeader, ApiOperation } from '@nestjs/swagger';
import { AuthenticationJWTGuard } from '../../common/guards/authentication-jwt.guard';
import { VouchersListDto } from './dto/vouchers-list.dto';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { VouchersActiveDto } from './dto/vouchers-active';
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @ApiOperation({ summary: 'Get active vouchers' })
  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get('active')
  async findActive(
    @Query() query: VouchersActiveDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    try {
      const vouchers = await this.vouchersService.findActive(query, req);
      return {
        statusCode: 200,
        message: 'Vouchers fetched successfully',
        result: toCamelCase(vouchers),
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: error.message,
        result: null,
      };
    }
  }

  @ApiOperation({ summary: 'Get all vouchers' })
  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get()
  async findAll(
    @Query() query: VouchersListDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    try {
      const vouchers = await this.vouchersService.findAll(query, req);
      return {
        statusCode: 200,
        message: 'Vouchers fetched successfully',
        result: toCamelCase(vouchers),
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: error.message,
        result: null,
      };
    }
  }

  @ApiOperation({ summary: 'Get voucher by id' })
  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get(':id')
  async findOne(@Req() req: ICustomRequestHeaders, @Param('id') id: string) {
    try {
      const voucher = await this.vouchersService.findOne(id, req);
      return {
        statusCode: 200,
        message: 'Voucher fetched successfully',
        result: toCamelCase(voucher),
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: error.message,
        result: null,
      };
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create Voucher' })
  @ApiBearerAuth()
  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  async create(
    @Req() req: ICustomRequestHeaders,
    @Body() createVoucherDto: CreateVoucherDto,
  ) {
    const newVoucher = await this.vouchersService.create(createVoucherDto, req);

    return {
      statusCode: 201,
      message: 'Voucher created successfully',
      result: toCamelCase(newVoucher),
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update Voucher' })
  @ApiBearerAuth()
  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  async update(
    @Param('id') id: string,
    @Req() req: ICustomRequestHeaders,
    @Body() updateVoucherDto: UpdateVoucherDto,
  ) {
    const updatedVoucher = await this.vouchersService.update(
      id,
      updateVoucherDto,
      req,
    );

    return {
      statusCode: 200,
      message: 'Voucher updated successfully',
      result: toCamelCase(updatedVoucher),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete Voucher' })
  @ApiBearerAuth()
  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  async remove(@Param('id') id: string, @Req() req: ICustomRequestHeaders) {
    try {
      await this.vouchersService.remove(id, req);
      return {
        statusCode: 200,
        message: 'Voucher deleted successfully',
        result: null,
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: error.message,
        result: null,
      };
    }
  }
}
