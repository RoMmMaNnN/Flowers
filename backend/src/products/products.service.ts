import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Prisma, Product } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  create(data: CreateProductDto): Promise<Product> {
    return this.prisma.product.create({ data });
  }

  findAll(includeHidden = false): Promise<Product[]> {
    return this.prisma.product.findMany({
      ...(includeHidden ? {} : { where: { isVisible: true } }),
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with id '${id}' not found`);
    }
    return product;
  }

  async update(id: string, data: UpdateProductDto): Promise<Product> {
    await this.findOne(id);
    try {
      return await this.prisma.product.update({
        where: { id },
        data: data as Prisma.ProductUpdateInput,
      });
    } catch (error) {
      this.throwNotFoundForMissingProduct(error, id);
      throw error;
    }
  }

  async remove(id: string): Promise<Product> {
    const product = await this.findOne(id);
    if (product.imageUrl) {
      await this.storage.deleteImage(product.imageUrl);
    }

    try {
      return await this.prisma.product.delete({ where: { id } });
    } catch (error) {
      this.throwNotFoundForMissingProduct(error, id);
      throw error;
    }
  }

  async uploadImage(
    id: string,
    file: Express.Multer.File,
  ): Promise<Product> {
    const product = await this.findOne(id);
    const storedImage = await this.storage.uploadImage(file);

    let updatedProduct: Product;
    try {
      updatedProduct = await this.prisma.product.update({
        where: { id },
        data: { imageUrl: storedImage.publicUrl },
      });
    } catch (error) {
      try {
        await this.storage.deleteImage(storedImage.path);
      } catch {
        this.logger.error("Failed to clean up an image after database update failure");
      }
      this.throwNotFoundForMissingProduct(error, id);
      throw error;
    }

    if (product.imageUrl) {
      try {
        await this.storage.deleteImage(product.imageUrl);
      } catch {
        this.logger.warn("Failed to clean up the replaced product image");
      }
    }

    return updatedProduct;
  }

  async deleteImage(id: string): Promise<Product> {
    const product = await this.findOne(id);
    if (!product.imageUrl) {
      return product;
    }

    await this.storage.deleteImage(product.imageUrl);
    try {
      return await this.prisma.product.update({
        where: { id },
        data: { imageUrl: null },
      });
    } catch (error) {
      this.throwNotFoundForMissingProduct(error, id);
      throw error;
    }
  }

  private throwNotFoundForMissingProduct(error: unknown, id: string): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new NotFoundException(`Product with id '${id}' not found`);
    }
  }
}