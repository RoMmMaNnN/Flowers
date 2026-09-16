import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateProductDto {
  @ApiProperty({ example: "Chocolate Rose" })
  @IsString()
  title!: string;

  @ApiProperty({ example: "A sweet bouquet made with chocolate." })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ example: "https://example.com/image.jpg" })
  @IsOptional()
  @IsString()
  imageUrl?: string;

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