import { IsOptional, IsString } from 'class-validator';

export class CreateTicketDto {
  @IsString() subject!: string;
  @IsString() category!: string;
  @IsString() priority!: string;
  @IsString() message!: string;
  @IsOptional() @IsString() order_id?: string;
}
