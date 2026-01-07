import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { BayarindService, StoreFiles } from './bayarind.service';
import { RegisterBayarindDto } from './dto/create-store.dto';

@ApiTags('Bayarind Integration')
@Controller('bayarind')
export class BayarindController {
  constructor(private readonly bayarindService: BayarindService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register existing store to Bayarind (Update bayarindStoreId)',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'idCardImage', maxCount: 1 },
      { name: 'businessImage', maxCount: 1 },
      { name: 'selfie', maxCount: 1 },
    ]),
  )
  async registerMerchant(
    @Body() dto: RegisterBayarindDto,
    @UploadedFiles() files: StoreFiles,
  ) {
    const result = await this.bayarindService.registerStore(dto, files);
    return {
      message: 'Brands retrieved successfully',
      result: toCamelCase(result),
    };
  }
}
