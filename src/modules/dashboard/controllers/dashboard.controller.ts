import {
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation } from '@nestjs/swagger';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { UsersService } from 'src/modules/users/services/users.service';
import { DashboardService } from '../services/dashboard.service';
import dashboardRequestDto from '../dtos/dashboard.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly _userService: UsersService,
    private readonly _dashboardService: DashboardService,
  ) {}

  @UseGuards(AuthenticationJWTGuard)
  @Get('/')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get Dashboard Data',
  })
  public async getDashboardData(
    @Req() req: ICustomRequestHeaders,
    @Query() q: dashboardRequestDto,
  ) {
    const date = new Date(q.date);
    const storeId = q.storeId;
    const result = await this._dashboardService.getDashboardData(storeId, date);

    return {
      result,
      message: 'Succesfully get dashboard data',
    };
  }
}
