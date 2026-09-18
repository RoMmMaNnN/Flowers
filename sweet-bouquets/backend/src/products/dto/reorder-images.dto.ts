import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsDefined, IsUUID } from "class-validator";

export class ReorderImagesDto {
  @ApiProperty({ type: [String], format: "uuid" })
  @IsDefined()
  @IsArray()
  @IsUUID("4", { each: true })
  imageIds!: string[];
}