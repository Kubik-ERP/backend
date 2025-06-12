import {
  Controller,
  Post,
  Body,
  Query,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { InvoiceService } from '../services/invoices.service';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import {
  GetInvoiceSettingDto,
  SettingInvoiceDto,
} from '../dtos/setting-invoice.dto';
import { empty } from '@prisma/client/runtime/library';
import { StoresService } from 'src/modules/stores/services/stores.service';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { ImageUploadInterceptor } from 'src/common/interceptors/image-upload.interceptor';
import { StorageService } from 'src/modules/storage-service/services/storage-service.service';

@Controller('invoice')
export class InvoiceSettingController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly storeService: StoresService,
    private readonly storageService: StorageService,
  ) {}

  @Put('setting')
  @ApiOperation({
    summary: 'Set Invoice Setting',
  })
  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(ImageUploadInterceptor('companyLogo'))
  async set(
    @Body() body: SettingInvoiceDto,
    @Req() req: IRequestUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    let relativePath = '';
    if (file) {
      const result = await this.storageService.uploadImage(
        file.buffer,
        file.originalname,
      );
      relativePath = `/${result.bucket}/${result.filename}`;
    }
    const validateStore = await this.storeService.validateStore(
      body.storeId,
      req.id,
    );
    if (!validateStore) {
      throw new Error(
        'Store not found or you do not have access to this store',
      );
    }

    const status = await this.invoiceService.updateInvoiceSetting(body);
    return {
      result: {
        status: status,
      },
    };
  }

  @Get('setting')
  @ApiOperation({ summary: 'Get Invoice Setting' })
  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  async getData(@Query() q: GetInvoiceSettingDto, @Req() req: IRequestUser) {
    const validateStore = await this.storeService.validateStore(
      q.storeId,
      req.id,
    );
    if (!validateStore) {
      throw new Error(
        'Store not found or you do not have access to this store',
      );
    }

    const response = await this.invoiceService.getInvoiceSetting(q, req.id);
    if (response.length === 0) {
      return {
        result: new SettingInvoiceDto(),
      };
    }
    return { result: response };
  }
}
