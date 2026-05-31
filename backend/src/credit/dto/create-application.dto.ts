import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateApplicationDto {
  @IsNumber() requested_limit!: number;
  @IsOptional() @IsNumber() business_revenue?: number;
  @IsOptional() @IsString() business_age?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() notes?: string;
}
