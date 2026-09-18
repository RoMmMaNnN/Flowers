import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
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
import { ReorderImagesDto } from "./dto/reorder-images.dto";
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
    return this.productsService.findPublicOne(id);
  }

  @Post(":id/images")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor("images", 12, { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["images"],
      properties: { images: { type: "array", items: { type: "string", format: "binary" } } },
    },
  })
  @ApiOperation({ summary: "Upload a product image" })
  @ApiParam({ name: "id", format: "uuid" })
  uploadImages(
    @Param("id", new ParseUUIDPipe()) id: string,
    @UploadedFiles()
    files: Express.Multer.File[],
  ) {
    if (!files?.length || files.some((file) => file.size > 5 * 1024 * 1024 || !new ImageMimeTypeValidator().isValid(file))) {
      throw new BadRequestException("Each image must be a JPEG, PNG, or WebP no larger than 5 MB");
    }
    return this.productsService.uploadImages(id, files);
  }

  @Delete(":id/images/:imageId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Delete a product image" })
  @ApiParam({ name: "id", format: "uuid" })
  deleteImage(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("imageId", new ParseUUIDPipe()) imageId: string,
  ) {
    return this.productsService.deleteImage(id, imageId);
  }

  @Delete(":id/images")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  deleteAllImages(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.productsService.deleteAllImages(id);
  }

  @Patch(":id/images/order")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  reorderImages(@Param("id", new ParseUUIDPipe()) id: string, @Body() dto: ReorderImagesDto) {
    return this.productsService.reorderImages(id, dto.imageIds);
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