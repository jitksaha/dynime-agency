import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewApplicationDto {
  @IsIn(['approved', 'rejected', 'info_requested']) status!: string;
  @IsOptional() @IsString() admin_notes?: string;
}
