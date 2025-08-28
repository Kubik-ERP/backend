import {
  Controller,
  Get,
  ParseDatePipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation } from '@nestjs/swagger';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get('summary')
  @ApiOperation({
    summary: 'Get summary data for the main dashboard within a date range.',
  })
  async getDashboardSummary(
    @Query('startDate', new ParseDatePipe()) startDate: Date,
    @Query('endDate', new ParseDatePipe()) endDate: Date,
    @Req() req: ICustomRequestHeaders,
  ) {
    const data = await this.dashboardService.getDashboardSummary(
      startDate,
      endDate,
      req,
    );
    return {
      message: 'Dashboard summary retrieved successfully',
      result: toCamelCase(data),
    };
  }
}
