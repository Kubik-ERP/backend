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
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  BusinessHoursDto,
  CreateStoreDto,
  UpdateProfileDto,
} from '../dtos/request.dto';
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
import { StorageService } from 'src/modules/storage-service/services/storage-service.service';
import { PinGuard } from 'src/common/guards/authentication-pin.guard';
import { toCamelCase } from '../../../common/helpers/object-transformer.helper';
import { UpdateProductDto } from '../../products/dto/update-product.dto';

@Controller('store')
@ApiTags('Stores')
export class StoresController {
  constructor(
    private readonly _storeService: StoresService,
    private readonly storageService: StorageService,
  ) {}

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
  @UseGuards(PinGuard)
  @UseInterceptors(ImageUploadInterceptor('file'))
  @UsePipes(new ValidationPipe({ transform: true }))
  public async createStore(
    @Req() req: ICustomRequestHeaders,
    @Body() body: CreateStoreDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      let relativePath = undefined;
      if (file) {
        const result = await this.storageService.uploadImage(
          file.buffer,
          file.originalname,
        );
        relativePath = result.filename;
      }
      //const relativePath = file ? `/public/images/${file.filename}` : undefined;

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
  @UseGuards(PinGuard)
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
      let relativePath = undefined;
      if (file) {
        const result = await this.storageService.uploadImage(
          file.buffer,
          file.originalname,
        );
        relativePath = result.filename;
      }

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
  @Get('/store/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get store by ID' })
  public async getStoreById(@Param('id') id: string) {
    try {
      const result = await this._storeService.getStoreById(id);
      const groupedOperationalHours = result.operational_hours.reduce(
        (acc: any, item: any) => {
          const day = item.days;
          if (!acc[day]) {
            acc[day] = {
              days: day,
              times: [],
            };
          }
          acc[day].times.push({
            openTime: item.open_time,
            closeTime: item.close_time,
          });
          return acc;
        },
        {},
      );
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
        operationalHours: Object.values(groupedOperationalHours),
      };
      return {
        result: toCamelCase(response),
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
  @UseGuards(PinGuard)
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

  @Get('/profile')
  @ApiOperation({ summary: 'Get store(s) by user ID' })
  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @UseGuards(PinGuard)
  public async getStoreByUser(@Req() req: ICustomRequestHeaders) {
    try {
      const userId = req.user.id;
      const result = await this._storeService.getStoreByUserId(userId);

      return {
        result,
      };
    } catch (error) {
      console.log(error);
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('/updateProfile/:id')
  @ApiOperation({ summary: 'Update Profile For User' })
  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @UseGuards(PinGuard)
  @UseInterceptors(ImageUploadInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  public async updateProfile(
    @Param('id') id: number,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      if (file) {
        const result = await this.storageService.uploadImage(
          file.buffer,
          file.originalname,
        );

        updateProfileDto.picture_url = `/${result.bucket}/${result.filename}`;
      }

      const result = await this._storeService.updateProfile(
        id,
        updateProfileDto,
      );

      return {
        result,
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
  @Get('/operational-hours')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get operational hours by store ID' })
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiOperation({
    summary: 'Fetch Operational Hours By Store',
  })
  public async getOperationalHoursByStore(
    @Req() req: ICustomRequestHeaders,
  ): Promise<any> {
    try {
      const formattedHours =
        await this._storeService.getOperationalHoursByStore(req);
      return { result: toCamelCase(formattedHours) };
    } catch (error) {
      console.error(error);
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(AuthenticationJWTGuard)
  @Put(':id/operational-hours')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update operational hours for store' })
  @UseGuards(PinGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  public async updateOperationalHours(
    @Param('id') id: string,
    @Req() req: ICustomRequestHeaders,
    @Body() body: { businessHours: BusinessHoursDto[] },
  ) {
    try {
      await this._storeService.updateOperationalHours(
        req,
        req.user.id,
        body.businessHours,
      );

      return {
        message: 'Operational hours updated successfully',
      };
    } catch (error) {
      console.log(error);
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
