import { ApiProperty } from '@nestjs/swagger';
import { Dedication, Role, Seniority } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class TeamMemberDto {
  @ApiProperty({ enum: Role }) @IsEnum(Role) role: Role;
  @ApiProperty({ enum: Seniority }) @IsEnum(Seniority) seniority: Seniority;
  @ApiProperty({ minimum: 1, maximum: 10 })
  @IsInt()
  @Min(1)
  @Max(10)
  count: number;
  @ApiProperty({ enum: Dedication }) @IsEnum(Dedication) dedication: Dedication;
}

export class UpdateTeamDto {
  @ApiProperty({ type: [TeamMemberDto] })
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  team: TeamMemberDto[];
}
