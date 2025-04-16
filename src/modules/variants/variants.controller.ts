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
import { VariantsService } from './variants.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Controller('variants')
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Post()
  async create(@Body() createVariantDto: CreateVariantDto) {
    try {
      const newVariant = await this.variantsService.create(createVariantDto);
      return {
        statusCode: 201,
        message: 'Variant created successfully',
        result: newVariant,
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
      const variants = await this.variantsService.findAll();
      return { statusCode: 200, message: 'Success', result: variants };
    } catch (error) {
      console.error('Error fetching variants:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch variants',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('idOrName') idOrName: string) {
    try {
      const variant = await this.variantsService.findOne(idOrName);
      if (!variant) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'variant not found' },
          HttpStatus.NOT_FOUND,
        );
      }
      return { statusCode: 200, message: 'Success', result: variant };
    } catch (error) {
      console.error('Error finding variant:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch variant',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateVariantDto: UpdateVariantDto,
  ) {
    try {
      const updatedVariant = await this.variantsService.update(
        id,
        updateVariantDto,
      );

      if (!updatedVariant) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'Variant not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        statusCode: 200,
        message: 'variant updated successfully',
        result: updatedVariant,
      };
    } catch (error) {
      console.error('Error updating variant:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to update variant',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const deletedVariant = await this.variantsService.remove(id);

      if (!deletedVariant) {
        throw new HttpException(
          { statusCode: HttpStatus.NOT_FOUND, message: 'Variant not found' },
          HttpStatus.NOT_FOUND,
        );
      }

      return { statusCode: 200, message: 'Variant deleted successfully' };
    } catch (error) {
      console.error('Error deleting Variant:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to delete Variant',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
