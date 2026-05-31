import { IsEnum, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';

export type VerificationType = 'kyc' | 'kyb' | 'aml';

export class CreateSessionDto {
  @IsEnum(['kyc', 'kyb', 'aml'])
  type: VerificationType;

  /** Admin only: create a session for another user */
  @IsOptional()
  @IsUUID()
  target_user_id?: string;

  /** Browser redirect URL after Didit flow completes */
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

  /** Context: which order triggered this request */
  @IsOptional()
  @IsUUID()
  order_id?: string;
}
