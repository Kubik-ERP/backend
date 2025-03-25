import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateStoreDto } from '../dtos/request.dto';
import { StoresService } from '../services/stores.service';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';

@Controller('store')
@ApiTags('Stores')
export class StoresController {
  constructor(private readonly _storeService: StoresService) {}

  @ApiBody({ type: CreateStoreDto })
  @UseGuards(AuthenticationJWTGuard)
  @Post('/')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create store',
  })
  public async createStore(
    @Req() req: ICustomRequestHeaders,
    @Body() body: CreateStoreDto,
  ) {
    try {
      await this._storeService.createStore(body, req.user.id);

      return {
        message: 'Store created successfully',
      };
    } catch (error) {
      console.log(error);
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(AuthenticationJWTGuard)
  @Get('/')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all stores' })
  public async getAllStores(@Req() req: ICustomRequestHeaders) {
    try {
      return await this._storeService.getAllStores(req.user.id);
    } catch (error) {
      console.log(error);
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(AuthenticationJWTGuard)
  @Get('/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get store by ID' })
  public async getStoreById(@Param('id') id: string) {
    try {
      return await this._storeService.getStoreById(id);
    } catch (error) {
      console.log(error);
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiBody({ type: CreateStoreDto })
  @Put('/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update store by ID' })
  public async updateStore(
    @Param('id') id: string,
    @Req() req: ICustomRequestHeaders,
    @Body() body: CreateStoreDto,
  ) {
    try {
      await this._storeService.updateStore(id, req.user.id, body);
      return { message: 'Store updated successfully' };
    } catch (error) {
      console.log(error);
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(AuthenticationJWTGuard)
  @Delete('/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete store by ID' })
  public async deleteStore(
    @Req() req: ICustomRequestHeaders,
    @Param('id') id: string,
  ) {
    try {
      await this._storeService.deleteStore(id, req.user.id);
      return { message: 'Store deleted successfully' };
    } catch (error) {
      console.log(error);
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
