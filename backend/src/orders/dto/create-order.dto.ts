import { IsOptional, IsString, IsNumber, IsArray, IsObject } from 'class-validator';

export class CreateOrderDto {
  @IsOptional() @IsString() customer_name?: string;
  @IsString() customer_email: string;
  @IsOptional() @IsString() user_id?: string;
  @IsArray() items: any[];
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsNumber() subtotal?: number;
  @IsOptional() @IsNumber() discount_amount?: number;
  @IsOptional() @IsNumber() total?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() payment_gateway?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsObject() billing_address?: any;
  @IsOptional() @IsObject() service_brief?: any;
  @IsOptional() @IsString() referral_code?: string;
}
