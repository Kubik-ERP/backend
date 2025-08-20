import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation } from '@nestjs/swagger';
import { AuthenticationJWTGuard } from 'src/common/guards/authentication-jwt.guard';
import { toCamelCase } from 'src/common/helpers/object-transformer.helper';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { QueryFacility } from './dto/query-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { FacilitiesService } from './facilities.service';

@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @ApiOperation({ summary: 'Create Store Facilities' })
  @ApiBearerAuth()
  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Post()
  async create(
    @Body() createFacilityDto: CreateFacilityDto,
    @Req() req: ICustomRequestHeaders,
  ) {
    const data = await this.facilitiesService.create(createFacilityDto, req);
    return {
      message: 'Facility created successfully',
      result: toCamelCase(data),
    };
  }

  @ApiOperation({ summary: 'Get Store Facilities' })
  @ApiBearerAuth()
  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Get()
  async findAll(
    @Req() req: ICustomRequestHeaders,
    @Query() query: QueryFacility,
  ) {
    const data = await this.facilitiesService.findAll(query, req);
    return {
      message: 'Facilities retrieved successfully',
      result: toCamelCase(data),
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.facilitiesService.findOne(+id);
    return {
      message: 'Facility retrieved successfully',
      result: toCamelCase(data),
    };
  }

  @ApiOperation({ summary: 'Update Store Facilities' })
  @ApiBearerAuth()
  @UseGuards(AuthenticationJWTGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateFacilityDto: UpdateFacilityDto,
  ) {
    const data = await this.facilitiesService.update(id, updateFacilityDto);
    return {
      message: 'Facility updated successfully',
      result: toCamelCase(data),
    };
  }

  @ApiOperation({ summary: 'Delete Store Facilities' })
  @ApiBearerAuth()
  @UseGuards(AuthenticationJWTGuard)
  @ApiHeader({
    name: 'X-STORE-ID',
    description: 'Store ID associated with this request',
    required: true,
    schema: { type: 'string' },
  })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.facilitiesService.remove(id);
    return {
      message: 'Facility deleted successfully',
      result: toCamelCase(data),
    };
  }
}
