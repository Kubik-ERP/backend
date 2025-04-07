import {
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation } from '@nestjs/swagger';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { StoresService } from 'src/modules/stores/services/stores.service';

@Controller('dashboard')
export class DashboardController {
  //constructor(private readonly _storeService: StoresService) {}
  @UseGuards(AuthenticationJWTGuard)
  @Get('/')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get Dashboard Data',
  })
  public async getDashboardData(@Req() req: ICustomRequestHeaders) {
    return {
      result: {
        false: true,
      },
      message: 'anjayy',
    };
  }
}
