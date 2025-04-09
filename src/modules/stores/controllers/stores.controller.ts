import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateStoreDto } from '../dtos/request.dto';
import { StoresService } from '../services/stores.service';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import {
  convertFromUnixTimestamp,
  formatDate,
} from 'src/common/helpers/common.helpers';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { diskStorage } from 'multer';
import { ImageUploadInterceptor } from 'src/common/interceptors/image-upload.interceptor';

@Controller('store')
@ApiTags('Stores')
export class StoresController {
  constructor(private readonly _storeService: StoresService) {}

  @UseGuards(AuthenticationJWTGuard)
  @Post('/')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create store' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'Form data for creating a store, including file upload and nested business hours',
    schema: {
      type: 'object',
      properties: {
        storeName: { type: 'string', example: 'Toko Maju Jaya' },
        email: {
          type: 'string',
          format: 'email',
          example: 'tokomaju@example.com',
        },
        phoneNumber: { type: 'string', example: '6281234567890' },
        businessType: {
          type: 'string',
          enum: ['Restaurant', 'Retail'],
          example: 'Retail',
        },
        streetAddress: { type: 'string', example: 'Jl. Kebon Jeruk No. 88' },
        city: { type: 'string', example: 'Jakarta' },
        postalCode: { type: 'string', example: '11530' },
        building: { type: 'string', example: 'Ruko Blok A' },
        businessHours: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              day: {
                type: 'string',
                enum: [
                  'Monday',
                  'Tuesday',
                  'Wednesday',
                  'Thursday',
                  'Friday',
                  'Saturday',
                  'Sunday',
                ],
                example: 'Monday',
              },
              openTime: {
                type: 'string',
                format: 'time',
                example: '09:00:00',
              },
              closeTime: {
                type: 'string',
                format: 'time',
                example: '18:00:00',
              },
            },
          },
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file to upload (photo/logo)',
        },
      },
      required: [
        'storeName',
        'email',
        'phoneNumber',
        'businessType',
        'streetAddress',
        'city',
        'businessHours',
        'file',
      ],
    },
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(ImageUploadInterceptor('file'))
  public async createStore(
    @Req() req: ICustomRequestHeaders,
    @Body() body: CreateStoreDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      const relativePath = file ? `/public/images/${file.filename}` : undefined;

      await this._storeService.createStore(
        { ...body, photo: relativePath },
        req.user.id,
      );

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
  @Put('/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update store by ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Form data for creating a store (including file upload)',
    schema: {
      type: 'object',
      properties: {
        storeName: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phoneNumber: { type: 'string' },
        businessType: { type: 'string', enum: ['Restaurant', 'Retail'] },
        streetAddress: { type: 'string' },
        city: { type: 'string' },
        postalCode: { type: 'string' },
        building: { type: 'string' },
        businessHours: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              day: {
                type: 'string',
                enum: [
                  'Monday',
                  'Tuesday',
                  'Wednesday',
                  'Thursday',
                  'Friday',
                  'Saturday',
                  'Sunday',
                ],
              },
              openTime: { type: 'string', format: 'time' },
              closeTime: { type: 'string', format: 'time' },
            },
          },
        },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: [
        'storeName',
        'email',
        'phoneNumber',
        'businessType',
        'streetAddress',
        'city',
        'businessHours',
      ],
    },
  })
  @UseInterceptors(ImageUploadInterceptor('file'))
  public async updateStore(
    @Param('id') id: string,
    @Req() req: ICustomRequestHeaders,
    @Body() body: CreateStoreDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      const relativePath = file ? `/public/images/${file.filename}` : undefined;

      await this._storeService.updateStore(id, req.user.id, {
        ...body,
        photo: relativePath,
      });

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
