import {
    Body,
    Controller,
    HttpCode,
    HttpException,
    HttpStatus,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateStoreDto } from '../dtos/request.dto';
import { StoresService } from '../services/stores.service';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';

@Controller('store')
@ApiTags('Authentication')
export class StoresController {
    constructor(private readonly _storeService: StoresService) { }

    @UseGuards(AuthenticationJWTGuard)
    @Post('/')
    //@HttpCode(200)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Create store',
    })
    public async createStore(
        @Req() req: ICustomRequestHeaders,
        @Body() body: CreateStoreDto,
    ) {
        try {
            await this._storeService.createStore(body, req.user.id);

            return {
                message: 'Store created successfully',
            };
        } catch (error) {
            console.log(error)
            throw new HttpException(
                'Internal Server Error',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
