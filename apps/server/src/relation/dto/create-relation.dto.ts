import { IsString, IsOptional, IsNumber, IsDateString, Min, Max } from 'class-validator';

export class CreateRelationDto {
  @IsString()
  userId: string;

  @IsString()
  sourceId: string;

  @IsString()
  targetId: string;

  @IsString()
  type: string;

  @IsOptional()
  properties?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;
}
