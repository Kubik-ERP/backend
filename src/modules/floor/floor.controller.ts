import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FloorService } from './floor.service';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';
import { UpdateCategoryDto } from '../categories/dto/update-category.dto';

@Controller('floor')
export class FloorController {
  constructor(private readonly floorService: FloorService) {}

  @Post()
  async create(@Body() createFloorDto: CreateFloorDto) {
    try {
      const newCategory = await this.floorService.create(createFloorDto);
      return {
        statusCode: 201,
        message: 'Floor created successfully',
        result: newCategory,
      };
    } catch (error) {
      return {
        statusCode: 500,
        message: error.message,
        result: null,
      };
    }
  }

  @Get()
  async findAll() {
    try {
      const categories = await this.floorService.findAll();
      return { statusCode: 200, message: 'Success', result: categories };
    } catch (error) {
      console.error('Error fetching Floor:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch Floor',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':idOrName')
  async findOne(@Param('idOrName') idOrName: string) {
    try {
      const floor = await this.floorService.findOne(idOrName);
      if (!floor) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'Floor not found' },
          HttpStatus.NOT_FOUND,
        );
      }
      return { statusCode: 200, message: 'Success', result: floor };
    } catch (error) {
      console.error('Error finding floor:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch floor',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateFloorDto: UpdateFloorDto,
  ) {
    try {
      const updatedFloor = await this.floorService.update(id, updateFloorDto);

      if (!updatedFloor) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'Floor not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        statusCode: 200,
        message: 'Floor updated successfully',
        result: updatedFloor,
      };
    } catch (error) {
      console.error('Error updating Floor:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to update Floor',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const deleteFloor = await this.floorService.remove(id);

      if (!deleteFloor) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'Floor not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      return { statusCode: 200, message: 'Floor deleted successfully' };
    } catch (error) {
      console.error('Error deleting Floor:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to delete Floor',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
