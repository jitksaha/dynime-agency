import { IsOptional, IsString } from 'class-validator';

export class ClaimOrderDto {
  @IsString() invoice!: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
}
