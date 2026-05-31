import { IsString, MaxLength, MinLength } from 'class-validator';

export class UploadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  key!: string;
}
