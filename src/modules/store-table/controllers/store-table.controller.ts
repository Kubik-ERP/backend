import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Put,
  UseGuards,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { StoreTableService } from '../services/store-table.service';
import { CreateAccountStoreConfigurationDto } from '../dtos/store-table.dto';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';

@ApiTags('StoreTable')
@ApiBearerAuth()
@UseGuards(AuthPermissionGuard)
@Controller('store-tables')
export class StoreTableController {
  constructor(private readonly storeTableService: StoreTableService) {}

  @HttpCode(200)
  @RequirePermissions(
    'process_unpaid_invoice',
    'check_out_sales',
    'table_management',
  )
  @Get()
  async getAll(
    @Req() req: ICustomRequestHeaders,
    @Headers('x-store-id') storeId: string,
  ) {
    if (!storeId) throw new BadRequestException('x-store-id wajib');
    const ownerId = req.user.ownerId;
    const result = await this.storeTableService.findAll(storeId, ownerId);
    return {
      message: 'Success get all store tables',
      result: toCamelCase(result),
    };
  }

  @HttpCode(200)
  @RequirePermissions('table_management')
  @Post()
  async create(
    @Req() req: ICustomRequestHeaders,
    @Body() dto: CreateAccountStoreConfigurationDto,
    @Headers('x-store-id') storeId: string,
  ) {
    if (!storeId) throw new BadRequestException('x-store-id wajib');
    const ownerId = req.user.ownerId;
    const result = await this.storeTableService.createConfiguration(
      dto,
      storeId,
      ownerId,
    );
    return {
      message: 'Store tables created successfully',
      result: toCamelCase(result),
    };
  }

  @HttpCode(200)
  @RequirePermissions('table_management')
  @Put()
  async update(
    @Req() req: ICustomRequestHeaders,
    @Body() dto: CreateAccountStoreConfigurationDto,
    @Headers('x-store-id') storeId: string,
  ) {
    if (!storeId) throw new BadRequestException('x-store-id wajib');
    const ownerId = req.user.ownerId;
    const result = await this.storeTableService.update(dto, storeId, ownerId);
    return {
      message: 'Store table updated successfully',
      result: toCamelCase(result),
    };
  }

  @HttpCode(200)
  @RequirePermissions('table_management')
  @Put('change-table-status')
  async updateStatusOverride(
    @Headers('x-store-id') storeId: string,
    @Body()
    body: {
      table_id: string;
      status_override: 'available' | 'occupied';
    },
  ) {
    if (!storeId) throw new BadRequestException('x-store-id wajib');
    if (!body.table_id) throw new BadRequestException('table_id wajib');

    const { status_override } = body;
    const result = await this.storeTableService.updateTableOverrideStatus(
      storeId,
      body.table_id,
      status_override,
    );

    return {
      message: 'Table status updated successfully',
      result: toCamelCase(result)
    };
  }
}
