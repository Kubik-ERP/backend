import {
  Controller,
  Get,
  HttpStatus,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation } from '@nestjs/swagger';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { UsersService } from '../services/users.service';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { UserStaffsDto } from '../dtos/user-staffs.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Get all users (owner + staff) in store' })
  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @ApiBearerAuth()
  @Get('staffs')
  async findWithStaff(
    @Req() req: ICustomRequestHeaders,
    @Query() query: UserStaffsDto,
  ) {
    const { store_ids } = query;
    try {
      const result = await this.usersService.findWithStaff(req, store_ids);
      return {
        statusCode: 200,
        message: 'Users fetched successfully',
        result: toCamelCase(result),
      };
    } catch (error) {
      return {
        statusCode: error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message,
        result: null,
      };
    }
  }
}
