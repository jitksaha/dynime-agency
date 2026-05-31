import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class ListOrdersDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsNumberString() page?: string;
  @IsOptional() @IsNumberString() limit?: string;
  @IsOptional() @IsString() q?: string;
}
