import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateMessageDto {
  @IsString() message!: string;
  @IsOptional() @IsBoolean() is_internal?: boolean;
}
