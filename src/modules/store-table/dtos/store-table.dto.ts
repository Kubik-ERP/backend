import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum TableShape {
  SQUARE = 'SQUARE',
  RECTANGLE = 'RECTANGLE',
  ROUND = 'ROUND',
}

export class CreateAccountStoreTableDto {
  @ApiProperty()
  @IsString()
  floorName: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  seats: number;

  @ApiProperty({ enum: TableShape })
  @IsEnum(TableShape)
  shape: TableShape;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  width: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  height: number;

  @ApiProperty()
  @IsNumber()
  positionX: number;

  @ApiProperty()
  @IsNumber()
  positionY: number;

  @ApiProperty()
  @IsBoolean()
  isEnableQrCode: boolean;
}

export class CreateAccountStoreFloorDto {
  @ApiProperty()
  @IsString()
  floorName: string;

  @ApiProperty({
    type: [CreateAccountStoreTableDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAccountStoreTableDto)
  tables?: CreateAccountStoreTableDto[];
}

export class CreateAccountStoreConfigurationDto {
  @ApiProperty({ type: [CreateAccountStoreFloorDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAccountStoreFloorDto)
  configurations: CreateAccountStoreFloorDto[];
}
