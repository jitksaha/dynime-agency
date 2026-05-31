import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSubscriptionDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsBoolean() auto_renew?: boolean;
  @IsOptional() @IsString() current_period_end?: string;
  @IsOptional() @IsString() notes?: string;
}
