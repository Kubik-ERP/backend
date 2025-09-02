import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentRoundingSettingService } from '../services/payment-rounding-setting.service';
import {
  CreateOrUpdatePaymentRoundingSettingDto,
  PaymentRoundingSettingResponseDto,
} from '../dtos';
import { AuthenticationJWTGuard } from '../../../common/guards/authentication-jwt.guard';
import { toCamelCase } from '../../../common/helpers/object-transformer.helper';

@ApiTags('Payment Rounding Settings')
@Controller('payment-rounding-setting')
export class PaymentRoundingSettingController {
  constructor(
    private readonly paymentRoundingSettingService: PaymentRoundingSettingService,
  ) {}

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Post()
  @ApiOperation({
    summary: 'Create or update payment rounding setting',
    description:
      'Creates new setting if not exists, updates if exists for the store',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment rounding setting created or updated successfully',
    type: PaymentRoundingSettingResponseDto,
  })
  async createOrUpdate(
    @Body() dto: CreateOrUpdatePaymentRoundingSettingDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    try {
      const storeId = req.store_id;

      if (!storeId) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Store ID is required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.paymentRoundingSettingService.createOrUpdate(
        dto,
        storeId,
      );

      return {
        statusCode: 200,
        message: 'Payment rounding setting saved successfully',
        result: toCamelCase(result),
      };
    } catch (error) {
      console.error('Error saving payment rounding setting:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to save payment rounding setting',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(AuthenticationJWTGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Get()
  @ApiOperation({
    summary: 'Get payment rounding setting by store ID',
    description: 'Retrieve payment rounding setting for the specified store',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment rounding setting retrieved successfully',
    type: PaymentRoundingSettingResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Payment rounding setting not found',
  })
  async getByStoreId(@Req() req: ICustomRequestHeaders) {
    try {
      const storeId = req.store_id;

      if (!storeId) {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Store ID is required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result =
        await this.paymentRoundingSettingService.getByStoreId(storeId);

      if (!result) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Payment rounding setting not found for this store',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        statusCode: 200,
        message: 'Payment rounding setting retrieved successfully',
        result: toCamelCase(result),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error retrieving payment rounding setting:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve payment rounding setting',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
