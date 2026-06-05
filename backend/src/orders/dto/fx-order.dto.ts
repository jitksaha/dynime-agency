import { IsOptional, IsString, IsNumber, IsDateString, IsNotEmpty } from 'class-validator';

export class CreateFxOrderDto {
  @IsOptional()
  @IsDateString()
  order_date?: string;

  @IsNotEmpty()
  @IsString()
  base_currency: string;

  @IsNotEmpty()
  @IsNumber()
  base_amount: number;

  @IsNotEmpty()
  @IsString()
  quote_currency: string;

  @IsNotEmpty()
  @IsNumber()
  quote_amount: number;

  @IsOptional()
  @IsNumber()
  cost_rate_usd?: number;

  @IsOptional()
  @IsNumber()
  sell_rate_usd?: number;

  @IsOptional()
  @IsNumber()
  cost_usd?: number;

  @IsOptional()
  @IsNumber()
  revenue_usd?: number;

  @IsOptional()
  @IsNumber()
  fee_usd?: number;

  @IsOptional()
  @IsNumber()
  profit_usd?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  counterparty_name?: string;

  @IsOptional()
  @IsString()
  counterparty_contact?: string;

  @IsOptional()
  @IsString()
  payment_method_in?: string;

  @IsOptional()
  @IsString()
  payment_method_out?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateFxOrderDto {
  @IsOptional()
  @IsDateString()
  order_date?: string;

  @IsOptional()
  @IsString()
  base_currency?: string;

  @IsOptional()
  @IsNumber()
  base_amount?: number;

  @IsOptional()
  @IsString()
  quote_currency?: string;

  @IsOptional()
  @IsNumber()
  quote_amount?: number;

  @IsOptional()
  @IsNumber()
  cost_rate_usd?: number;

  @IsOptional()
  @IsNumber()
  sell_rate_usd?: number;

  @IsOptional()
  @IsNumber()
  cost_usd?: number;

  @IsOptional()
  @IsNumber()
  revenue_usd?: number;

  @IsOptional()
  @IsNumber()
  fee_usd?: number;

  @IsOptional()
  @IsNumber()
  profit_usd?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  counterparty_name?: string;

  @IsOptional()
  @IsString()
  counterparty_contact?: string;

  @IsOptional()
  @IsString()
  payment_method_in?: string;

  @IsOptional()
  @IsString()
  payment_method_out?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
