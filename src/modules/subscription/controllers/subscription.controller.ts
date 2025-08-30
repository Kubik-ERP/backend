import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { SubscriptionService } from '../services/subscription.service';
import { CreateSubsPackageDto } from '../dtos/create.dto';
import { UUID } from 'crypto';
import { ApiHeader } from '@nestjs/swagger';
import { CreateSubscriptionDto } from '../dtos/subs.dto';

@Controller('subscription')
@ApiHeader({
  name: 'x-server-key',
  description: 'Custom API Key',
})
export class SubscriptionController {
  constructor(private readonly _service: SubscriptionService) {}

  @Get()
  @HttpCode(200)
  async getSubscriptions() {
    const result = await this._service.getSubscriptions();
    return {
      message: 'Successfully retrieve data',
      result,
    };
  }

  @Post()
  @HttpCode(200)
  async createSubscription(@Body() body: CreateSubsPackageDto) {
    try {
      const result = await this._service.createSubscription(body);
      return {
        message: 'Successfully create data',
        result,
      };
    } catch (error) {
      return {
        message: 'Failed to create data',
        error,
      };
    }
  }

  @Put('/:id')
  @HttpCode(200)
  async updateSubscription(
    @Param('id') id: UUID,
    @Body() body: CreateSubsPackageDto,
  ) {
    const result = await this._service.updateSubscription(id, body);
    return {
      message: 'Successfully update data',
      result,
    };
  }

  @Delete('/:id')
  @HttpCode(200)
  async deleteSubscription(@Param('id') id: UUID) {
    const result = await this._service.deleteSubscription(id);
    return {
      message: 'Successfully delete data',
      result,
    };
  }

  @Get('/list-permission')
  @HttpCode(200)
  async getPermissionLists() {
    const result = await this._service.getPermissionLists();
    return {
      message: 'Successfully retrieve data',
      result,
    };
  }

  @Post('/assign-subscription')
  @HttpCode(200)
  async assignSubscription(@Body() body: CreateSubscriptionDto) {
    try {
      const result = await this._service.assignSubscription(
        body.email,
        body.subscriptionId,
        body.expiredAt,
        body.quantity,
      );
      return {
        message: 'Successfully assign subscription',
        result,
      };
    } catch (error) {
      return {
        message: 'Failed to assign subscription',
        error,
      };
    }
  }

  @Get('/user-subscription-history/:email')
  @HttpCode(200)
  async getUserSubscriptionHistory(@Param('email') email: string) {
    const result = await this._service.getUserSubscriptionHistory(email);
    return {
      message: 'Successfully retrieve data',
      result,
    };
  }
}
