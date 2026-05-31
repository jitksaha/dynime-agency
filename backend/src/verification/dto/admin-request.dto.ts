import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class AdminRequestDto {
  @IsUUID()
  user_id: string;

  @IsEnum(['kyc', 'kyb', 'aml'])
  type: 'kyc' | 'kyb' | 'aml';

  /** The order that triggered this verification request */
  @IsOptional()
  @IsUUID()
  order_id?: string;

  /** Frontend origin so the Didit callback redirects correctly */
  @IsOptional()
  @IsString()
  frontend_origin?: string;

  /** KYB only */
  @IsOptional()
  @IsString()
  company_name?: string;

  @IsOptional()
  @IsString()
  registration_number?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  business_type?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  tax_id?: string;
}
