import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Put,
  UseGuards,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { StoreTableService } from '../services/store-table.service';
import { CreateAccountStoreConfigurationDto } from '../dtos/store-table.dto';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';

@ApiTags('StoreTable')
@ApiBearerAuth()
@UseGuards(AuthenticationJWTGuard)
@Controller('store-tables')
export class StoreTableController {
  constructor(private readonly storeTableService: StoreTableService) {}

  @HttpCode(200)
  @Get()
  async getAll(
    @Req() req: ICustomRequestHeaders,
    @Headers('x-store-id') storeId: string,
  ) {
    if (!storeId) throw new BadRequestException('x-store-id wajib');
    const userId = req.user.id;
    const result = await this.storeTableService.findAll(storeId, userId);
    return {
      message: 'Success get all store tables',
      result: toCamelCase(result),
    };
  }

  @HttpCode(200)
  @Post()
  async create(
    @Req() req: ICustomRequestHeaders,
    @Body() dto: CreateAccountStoreConfigurationDto,
    @Headers('x-store-id') storeId: string,
  ) {
    if (!storeId) throw new BadRequestException('x-store-id wajib');
    const userId = req.user.id;
    const result = await this.storeTableService.createConfiguration(
      dto,
      storeId,
      userId,
    );
    return {
      message: 'Store tables created successfully',
      result: toCamelCase(result),
    };
  }

  @HttpCode(200)
  @Put(':id')
  async update(
    @Req() req: ICustomRequestHeaders,
    @Param('id') id: string,
    @Body() dto: CreateAccountStoreConfigurationDto,
    @Headers('x-store-id') storeId: string,
  ) {
    if (!storeId) throw new BadRequestException('x-store-id wajib');
    const userId = req.user.id;
    const result = await this.storeTableService.update(
      id,
      dto,
      storeId,
      userId,
    );
    return {
      message: 'Store table updated successfully',
      result: toCamelCase(result),
    };
  }

  @HttpCode(200)
  @Delete(':id')
  async delete(
    @Req() req: ICustomRequestHeaders,
    @Param('id') id: string,
    @Headers('x-store-id') storeId: string,
  ) {
    if (!storeId) throw new BadRequestException('x-store-id wajib');
    const userId = req.user.id;
    const result = await this.storeTableService.delete(id, storeId, userId);
    return {
      message: 'Store table deleted successfully',
      result: toCamelCase(result),
    };
  }
}
