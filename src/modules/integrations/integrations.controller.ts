import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
} from '@nestjs/swagger';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { AuthPermissionGuard } from 'src/common/guards/auth-permission.guard';
import { ImageUploadInterceptor } from 'src/common/interceptors/image-upload.interceptor';
import { StorageService } from '../storage-service/services/storage-service.service';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly storageService: StorageService,
  ) {}

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('payment_method_configuration')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiOperation({
    summary: 'Get all integrations',
  })
  @Get()
  async findAll(@Req() req: ICustomRequestHeaders) {
    const data = await this.integrationsService.findAll(req);
    return {
      message: 'Integrations retrieved successfully',
      result: data,
    };
  }

  @UseGuards(AuthPermissionGuard)
  @RequirePermissions('payment_method_configuration')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @UseInterceptors(ImageUploadInterceptor('image'))
  @ApiOperation({
    summary: 'Update an existing integration',
  })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateIntegrationDto: UpdateIntegrationDto,
    @Req() req: ICustomRequestHeaders,
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
    const data = await this.integrationsService.update(
      id,
      {
        ...updateIntegrationDto,
        image: relativePath || undefined,
      },
      req,
    );
    return {
      message: 'Integration updated successfully',
      result: data,
    };
  }
}
