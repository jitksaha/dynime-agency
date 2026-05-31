import { IsOptional, IsString } from 'class-validator';

export class UpdateOrderDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() notes?: string;
}
