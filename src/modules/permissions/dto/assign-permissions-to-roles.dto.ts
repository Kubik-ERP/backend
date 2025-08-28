import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsObject } from 'class-validator';

export class AssignPermissionsToRolesDto {
  @ApiProperty({
    description: 'The permissions to assign to roles',
    example: [
      {
        id: '63b52e8e-3817-4ab4-b60e-d6c0f5daab80',
        roles: [
          '85434992-6af6-40ed-944f-a646e5d64bff',
          '5b30c8cf-a61e-4c22-9671-92885759a97c',
          '17c42aef-3d3c-4791-8b16-8b5eeb615319',
        ],
      },
    ],
  })
  @IsArray()
  @IsNotEmpty()
  @IsObject({ each: true })
  permissions: {
    id: string;
    roles: string[];
  }[];
}
