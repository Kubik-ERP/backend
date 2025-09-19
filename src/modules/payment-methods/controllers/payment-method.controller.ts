import {
  Body,
  Controller,
  Delete,
  Get,
  ParseBoolPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { payment_methods } from '@prisma/client';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { ImageUploadInterceptor } from 'src/common/interceptors/image-upload.interceptor';
import { StorageService } from 'src/modules/storage-service/services/storage-service.service';
import { v4 as uuidv4 } from 'uuid';
import { CreatePaymentMethodDto } from '../dtos/payment-method.dto';
import { PaymentMethodService } from '../services/payment-method.service';

@Controller('payment/method')
export class PaymentMethodController {
  constructor(
    private readonly paymentMethodService: PaymentMethodService,
    private readonly storageService: StorageService,
  ) {}

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('payment_method_configuration')
  @ApiBearerAuth()
  @Post('')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(ImageUploadInterceptor('image'))
  @ApiOperation({
    summary: 'Create a new payment method',
  })
  public async paymentMethodAdd(
    @Body() requestBody: CreatePaymentMethodDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let relativePath = '';
    if (file) {
      const result = await this.storageService.uploadImage(
        file.buffer,
        file.originalname,
      );
      relativePath = result.filename;
    }
    const paymentMethod: payment_methods = {
      id: uuidv4(),
      name: requestBody.name,
      icon_name: requestBody.iconName,
      sort_no: requestBody.sortNo,
      is_available: true,
      image_url: relativePath || '',
    };
    await this.paymentMethodService.createPaymentMethod(paymentMethod);
    return {
      message: 'Payment Method successfully created',
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('payment_method_configuration')
  @ApiBearerAuth()
  @Put('')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(ImageUploadInterceptor('image'))
  @ApiOperation({
    summary: 'Update the current payment method by ID',
  })
  public async paymentMethodUpdate(
    @Query('id') id: string,
    @Body() requestBody: CreatePaymentMethodDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let relativePath = '';
    if (file) {
      const result = await this.storageService.uploadImage(
        file.buffer,
        file.originalname,
      );
      relativePath = result.filename;
    }
    const paymentMethod: payment_methods = {
      id: id,
      name: requestBody.name,
      icon_name: requestBody.iconName,
      sort_no: requestBody.sortNo,
      is_available: requestBody.isAvailable,
      image_url: relativePath || '',
    };
    await this.paymentMethodService.updatePaymentMethodById(paymentMethod);
    return {
      message: 'Payment Method successfully updated',
    };
  }

  @UseGuards(AuthenticationJWTGuard)
  // @UseGuards(AuthPermissionGuard)
  // @RequirePermissions(
  //   'payment_method_configuration',
  //   'check_out_sales',
  //   'process_unpaid_invoice',
  // )
  @ApiBearerAuth()
  @Get('')
  @ApiOperation({
    summary: 'Get list of the payment methods',
  })
  @ApiQuery({
    name: 'isSelfOrder',
    required: false,
    description: 'Filter for self-order payment methods',
    type: Boolean,
    example: false,
  })
  public async paymentMethodList(
    @Query('isSelfOrder', new ParseBoolPipe({ optional: true }))
    isSelfOrder = false,
  ) {
    const response =
      await this.paymentMethodService.findAllPaymentMethod(isSelfOrder);

    return {
      result: toCamelCase(response),
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('payment_method_configuration')
  @ApiBearerAuth()
  @Delete('')
  @ApiOperation({
    summary: 'Delete a payment method by ID',
  })
  public async paymentMethodRemove(@Query('id') id: string) {
    await this.paymentMethodService.deletePaymentMethodById(id);

    return {
      message: 'Payment Method successfully deleted',
    };
  }
}
