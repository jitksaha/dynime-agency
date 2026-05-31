import { IsString, MaxLength, MinLength } from 'class-validator';

export class ObjectKeyQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  key!: string;
}

export class ListPrefixQueryDto {
  @IsString()
  @MaxLength(1024)
  prefix = '';
}
