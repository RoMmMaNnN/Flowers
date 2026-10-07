import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateProductDto {
  @ApiProperty({ example: "Chocolate Rose" })
  @IsString()
  title!: string;

  @ApiProperty({ example: "A sweet bouquet made with chocolate." })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ example: 2499, description: "Price in pence" })
  @IsOptional()
  @IsInt()
  @Min(0)
  pricePence?: number | null;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}