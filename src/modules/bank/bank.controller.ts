import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  Put,
  Req,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { BankService } from './bank.service';
import { AttachUserBankDto, CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto, UpdateUserBankDto } from './dto/update-bank.dto';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthPermissionGuard } from '../../common/guards/auth-permission.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { toCamelCase } from '../../common/helpers/object-transformer.helper';

@Controller('bank')
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Post('/')
  @ApiOperation({ summary: 'Create a new bank' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('accounts')
  @ApiBearerAuth()
  async create(@Body() dto: CreateBankDto) {
    try {
      const result = await this.bankService.create(dto);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Bank created successfully',
        result: toCamelCase(result),
      };
    } catch (error) {
      throw new HttpException(
        'Failed to create bank',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/')
  @ApiOperation({ summary: 'Get all banks' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('accounts')
  @ApiBearerAuth()
  async findAll() {
    try {
      const result = await this.bankService.findAll();
      return {
        statusCode: HttpStatus.OK,
        message: 'Banks retrieved successfully',
        result: toCamelCase(result),
      };
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve banks',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('/bank-id/:id')
  @ApiOperation({ summary: 'Get bank by ID' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('accounts')
  @ApiBearerAuth()
  async findOne(@Param('id') id: string) {
    try {
      const result = await this.bankService.findOne(id);
      return {
        statusCode: HttpStatus.OK,
        message: 'Bank retrieved successfully',
        result: toCamelCase(result),
      };
    } catch (error) {
      throw new HttpException('Bank not found', HttpStatus.NOT_FOUND);
    }
  }
  @Delete('/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete bank by ID' })
  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('accounts')
  @ApiBearerAuth()
  async remove(@Param('id') id: string) {
    try {
      await this.bankService.remove(id);
    } catch (error) {
      throw new HttpException(
        'Failed to delete bank',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('accounts')
  @Post('/attach')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Attach a bank to the authenticated user' })
  async attachBankToUser(
    @Req() req: ICustomRequestHeaders,
    @Body() dto: AttachUserBankDto,
  ) {
    try {
      const result = await this.bankService.attachBankToUser(req.user.id, dto);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Bank attached to user successfully',
        result: toCamelCase(result),
      };
    } catch (error) {
      throw new HttpException(
        'Failed to attach bank',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('accounts')
  @Get('/user-banks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all banks for the authenticated user' })
  async getUserBanks(@Req() req: ICustomRequestHeaders) {
    try {
      const result = await this.bankService.getUserBanks(req.user.id);
      return {
        statusCode: HttpStatus.OK,
        message: 'User banks retrieved successfully',
        result: toCamelCase(result),
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get user banks',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('accounts')
  @Put('/user-banks/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user bank by ID' })
  async updateUserBank(
    @Param('id') id: string,
    @Req() req: ICustomRequestHeaders,
    @Body() dto: UpdateUserBankDto,
  ) {
    try {
      const result = await this.bankService.updateUserBank(
        id,
        req.user.id,
        dto,
      );
      return {
        statusCode: HttpStatus.OK,
        message: 'User bank updated successfully',
        result: toCamelCase(result),
      };
    } catch (error) {
      throw new HttpException(
        'Failed to update user bank',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
