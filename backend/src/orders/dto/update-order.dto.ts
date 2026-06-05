import { IsOptional, IsString, IsNumber, IsArray, IsObject, IsDateString } from 'class-validator';

export class UpdateOrderDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsNumber() refunded_amount?: number;
  @IsOptional() @IsNumber() refunded_tax_amount?: number;
  @IsOptional() @IsDateString() refunded_at?: string;
  @IsOptional() @IsString() refund_reason?: string;

  // Expanded for manual invoice editing
  @IsOptional() @IsString() customer_name?: string;
  @IsOptional() @IsString() customer_email?: string;
  @IsOptional() @IsString() user_id?: string;
  @IsOptional() @IsArray() items?: any[];
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsNumber() subtotal?: number;
  @IsOptional() @IsNumber() discount_amount?: number;
  @IsOptional() @IsNumber() total?: number;
  @IsOptional() @IsString() payment_gateway?: string;
  @IsOptional() @IsObject() billing_address?: any;
  @IsOptional() @IsObject() service_brief?: any;
}
