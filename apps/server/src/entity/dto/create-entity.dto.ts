import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateEntityDto {
  @IsString()
  userId: string;

  @IsString()
  type: string;

  @IsString()
  name: string;

  @IsOptional()
  properties?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;
}
