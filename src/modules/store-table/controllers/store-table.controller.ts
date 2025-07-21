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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { StoreTableService } from '../services/store-table.service';
import { CreateAccountStoreConfigurationDto } from '../dtos/store-table.dto';

@ApiTags('StoreTable')
@ApiBearerAuth()
@UseGuards(AuthenticationJWTGuard)
@Controller('store-tables')
export class StoreTableController {
  constructor(private readonly storeTableService: StoreTableService) {}

  @HttpCode(200)
  @Get()
  async getAll(@Headers('x-store-id') storeId: string) {
    if (!storeId) throw new BadRequestException('x-store-id wajib');
    const result = await this.storeTableService.findAll(storeId);
    return { message: 'Success get all store tables', result };
  }

  @HttpCode(200)
  @Post()
  async create(
    @Body() dto: CreateAccountStoreConfigurationDto,
    @Headers('x-store-id') storeId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!storeId || !userId)
      throw new BadRequestException('x-store-id dan x-user-id wajib');
    const result = await this.storeTableService.createConfiguration(
      dto,
      storeId,
      userId,
    );
    return { message: 'Store tables created successfully', result };
  }

  @HttpCode(200)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: CreateAccountStoreConfigurationDto,
    @Headers('x-store-id') storeId: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!storeId || !userId)
      throw new BadRequestException('x-store-id dan x-user-id wajib');
    const result = await this.storeTableService.update(
      id,
      dto,
      storeId,
      userId,
    );
    return { message: 'Store table updated successfully', result };
  }

  @HttpCode(200)
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Headers('x-store-id') storeId: string,
  ) {
    if (!storeId) throw new BadRequestException('x-store-id wajib');
    const result = await this.storeTableService.delete(id, storeId);
    return { message: 'Store table deleted successfully', result };
  }
}
