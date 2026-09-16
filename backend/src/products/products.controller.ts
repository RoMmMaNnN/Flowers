import {
  Body,
  Controller,
  Delete,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ImageMimeTypeValidator } from "../storage/image-file.validator";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductsService } from "./products.service";

@ApiTags("products")
@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Create a product" })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "List visible products" })
  findAll() {
    return this.productsService.findAll();
  }

  @Get("admin")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "List all products for admins" })
  findAllForAdmin() {
    return this.productsService.findAll(true);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a product" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBadRequestResponse({ description: "Invalid product UUID" })
  @ApiNotFoundResponse({ description: "Product not found" })
  findOne(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.productsService.findOne(id);
  }

  @Post(":id/image")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("image", { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["image"],
      properties: { image: { type: "string", format: "binary" } },
    },
  })
  @ApiOperation({ summary: "Upload a product image" })
  @ApiParam({ name: "id", format: "uuid" })
  uploadImage(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new ImageMimeTypeValidator(),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.productsService.uploadImage(id, file);
  }

  @Delete(":id/image")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Delete a product image" })
  @ApiParam({ name: "id", format: "uuid" })
  deleteImage(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.productsService.deleteImage(id);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update a product" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBadRequestResponse({ description: "Invalid UUID or request body" })
  @ApiNotFoundResponse({ description: "Product not found" })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Delete a product" })
  @ApiParam({ name: "id", format: "uuid" })
  @ApiBadRequestResponse({ description: "Invalid product UUID" })
  @ApiNotFoundResponse({ description: "Product not found" })
  remove(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.productsService.remove(id);
  }
}