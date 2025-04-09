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
import {
  convertFromUnixTimestamp,
  formatDate,
} from 'src/common/helpers/common.helpers';

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
      const result = await this._storeService.getAllStores(req.user.id);
      let response: any = [];
      result.map((store) => {
        response.push({
          id: store.id,
          name: store.name,
          email: store.email,
          phone_number: store.phone_number,
          business_type: store.business_type,
          photo: store.photo,
          address: store.address,
          city: store.city,
          postal_code: store.postal_code,
          building: store.building,
          created_at: formatDate(store.created_at),
          updated_at: formatDate(store.updated_at),
        });
      });
      return {
        result: response,
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
  @Get('/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get store by ID' })
  public async getStoreById(@Param('id') id: string) {
    try {
      const result = await this._storeService.getStoreById(id);
      const response = {
        id: result.id,
        name: result.name,
        email: result.email,
        phone_number: result.phone_number,
        business_type: result.business_type,
        photo: result.photo,
        address: result.address,
        city: result.city,
        postal_code: result.postal_code,
        building: result.building,
        created_at: formatDate(result.created_at),
        updated_at: formatDate(result.updated_at),
      };
      return {
        result: response,
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
