import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { isUUID } from "class-validator";
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

  create(data: CreateProductDto) {
    this.log("listing.create.started", {
      title: data.title,
      pricePence: data.pricePence ?? null,
      isAvailable: data.isAvailable ?? true,
    });
    return this.prisma.product.create({ data, include: this.imageInclude }).then((product) => {
      this.log("listing.create.completed", { listingId: product.id, pricePence: product.pricePence });
      return product;
    });
  }

  findAll(includeHidden = false) {
    return this.prisma.product.findMany({
      ...(includeHidden ? {} : { where: { isVisible: true } }),
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: this.imageInclude,
    }).then((products) => {
      this.log("listing.collection.completed", { includeHidden, listingCount: products.length, imageCount: products.reduce((count, product) => count + product.images.length, 0) });
      return products;
    });
  }

  findPublicOne(id: string) {
    return this.findOne(id, false);
  }

  async findOne(id: string, includeHidden = true) {
    this.log("listing.read.started", { listingId: id, includeHidden });
    const product = await this.prisma.product.findUnique({
      where: includeHidden ? { id } : { id, isVisible: true },
      include: this.imageInclude,
    });
    if (!product) {
      throw new NotFoundException(`Product with id '${id}' not found`);
    }
    this.log("listing.read.completed", { listingId: id, imageCount: product.images.length });
    return product;
  }

  async update(id: string, data: UpdateProductDto) {
    this.log("listing.update.started", {
      listingId: id,
      fields: Object.keys(data),
      pricePence: data.pricePence ?? null,
    });
    await this.findOne(id);
    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: data as Prisma.ProductUpdateInput,
        include: this.imageInclude,
      });
      this.log("listing.update.completed", { listingId: id, pricePence: product.pricePence, imageCount: product.images.length });
      return product;
    } catch (error) {
      this.logError("listing.update.failed", error, { listingId: id });
      this.throwNotFoundForMissingProduct(error, id);
      throw error;
    }
  }

  async remove(id: string) {
    this.log("listing.delete.started", { listingId: id });
    const product = await this.findOne(id);
    for (const image of product.images) {
      try {
        await this.storage.deleteImage(image.storagePath);
      } catch (error) {
        // Storage and PostgreSQL cannot share a transaction; retain DB rows and report partial cleanup for reconciliation.
        this.logger.warn(`Product deletion stopped after partial storage cleanup; product ${id} retains image rows and cleanup failed for ${image.storagePath}`);
        throw new InternalServerErrorException("Product was not deleted because image cleanup failed", { cause: error });
      }
    }

    try {
      return await this.prisma.product.delete({ where: { id }, include: this.imageInclude });
    } catch (error) {
      this.logger.error(`Product database deletion failed after storage cleanup for product ${id}`);
      this.throwNotFoundForMissingProduct(error, id);
      throw new InternalServerErrorException("Product storage was cleaned but database deletion failed; retry or reconcile the product", { cause: error });
    }
  }

  async uploadImages(id: string, files: Express.Multer.File[]) {
    this.log("listing.images.upload.started", { listingId: id, fileCount: files.length });
    const product = await this.findOne(id);
    const uploaded: Array<{ fileName: string; imageUrl: string }> = [];
    const failed: Array<{ fileName: string; message: string }> = [];

    for (const file of files) {
      let storedImage: { path: string; publicUrl: string } | undefined;
      try {
        storedImage = await this.storage.uploadImage(file);
        this.log("listing.image.storage.completed", { listingId: id, path: storedImage.path, publicUrl: storedImage.publicUrl });
        await this.createImageRecordSerialised(id, storedImage);
        this.log("listing.image.database.completed", { listingId: id, path: storedImage.path });
        uploaded.push({ fileName: file.originalname, imageUrl: storedImage.publicUrl });
      } catch (error) {
        this.logError("listing.image.upload.failed", error, { listingId: id, path: storedImage?.path });
        if (storedImage) {
          try {
            await this.storage.deleteImage(storedImage.path);
          } catch (cleanupError) {
            this.logger.error(`Uploaded image cleanup failed; orphaned storage path requires reconciliation: ${storedImage.path}`);
            failed.push({ fileName: file.originalname, message: `Database insert failed and storage cleanup also failed for ${storedImage.path}` });
            continue;
          }
        }
        failed.push({ fileName: file.originalname, message: error instanceof Error ? error.message : "Upload failed" });
      }
    }

    return { product: await this.findOne(id), uploaded, failed };
  }

  async deleteImage(id: string, imageId: string) {
    this.log("listing.image.delete.started", { listingId: id, imageId });
    const product = await this.findOne(id);
    const image = product.images.find((candidate) => candidate.id === imageId);
    if (!image) {
      throw new NotFoundException(`Image with id '${imageId}' not found`);
    }

    try {
      await this.storage.deleteImage(image.storagePath);
    } catch (error) {
      this.logError("listing.image.delete.storage.failed", error, { listingId: id, imageId, path: image.storagePath });
      throw new InternalServerErrorException("Image was not deleted because storage cleanup failed", { cause: error });
    }

    try {
      await this.prisma.productImage.delete({ where: { id: imageId } });
    } catch (error) {
      this.logError("listing.image.delete.database.failed", error, { listingId: id, imageId, path: image.storagePath });
      throw new InternalServerErrorException("Image storage was deleted but its database record remains; reconcile before retrying", { cause: error });
    }

    await this.normalizeImageOrder(id);
    this.log("listing.image.delete.completed", { listingId: id, imageId });
    return this.findOne(id);
  }

  async deleteAllImages(id: string) {
    this.log("listing.images.delete_all.started", { listingId: id });
    const product = await this.findOne(id);
    const deletedImageIds: string[] = [];
    const failed: Array<{ imageId: string; storagePath: string; message: string }> = [];

    for (const image of product.images) {
      try {
        await this.storage.deleteImage(image.storagePath);
      } catch (error) {
        failed.push({ imageId: image.id, storagePath: image.storagePath, message: "Storage deletion failed; database record retained" });
        continue;
      }

      try {
        await this.prisma.productImage.delete({ where: { id: image.id } });
        deletedImageIds.push(image.id);
      } catch (error) {
        this.logger.error(`Image database deletion failed after storage cleanup for ${image.storagePath}`);
        failed.push({ imageId: image.id, storagePath: image.storagePath, message: "Storage was deleted but database record remains" });
      }
    }

    if (deletedImageIds.length) {
      await this.normalizeImageOrder(id);
    }
    this.log("listing.images.delete_all.completed", { listingId: id, deletedCount: deletedImageIds.length, failedCount: failed.length });
    return { product: await this.findOne(id), deletedImageIds, failed };
  }

  async reorderImages(id: string, imageIds: string[]) {
    this.log("listing.images.reorder.started", { listingId: id, imageCount: imageIds?.length });
    this.assertValidImageOrderInput(imageIds);
    const product = await this.findOne(id);
    if (imageIds.length !== product.images.length || new Set(imageIds).size !== imageIds.length || imageIds.some((imageId) => !product.images.some((image) => image.id === imageId))) {
      throw new BadRequestException("imageIds must contain every image for this product exactly once");
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "products" WHERE "id" = ${id} FOR UPDATE`;
      const temporaryOffset = product.images.length + 1;
      await Promise.all(imageIds.map((imageId, index) => transaction.productImage.update({ where: { id: imageId }, data: { sortOrder: temporaryOffset + index } })));
      await Promise.all(imageIds.map((imageId, index) => transaction.productImage.update({ where: { id: imageId }, data: { sortOrder: index } })));
    });
    this.log("listing.images.reorder.completed", { listingId: id, imageCount: imageIds.length });
    return this.findOne(id);
  }

  private async createImageRecordSerialised(id: string, storedImage: { path: string; publicUrl: string }) {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "products" WHERE "id" = ${id} FOR UPDATE`;
      const lastImage = await transaction.productImage.findFirst({ where: { productId: id }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
      await transaction.productImage.create({ data: { productId: id, imageUrl: storedImage.publicUrl, storagePath: storedImage.path, sortOrder: (lastImage?.sortOrder ?? -1) + 1 } });
    });
  }

  private async normalizeImageOrder(id: string) {
    const images = await this.prisma.productImage.findMany({ where: { productId: id }, orderBy: { sortOrder: "asc" } });
    if (!images.length) return;
    await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "products" WHERE "id" = ${id} FOR UPDATE`;
      const temporaryOffset = images.length + 1;
      await Promise.all(images.map((image, index) => transaction.productImage.update({ where: { id: image.id }, data: { sortOrder: temporaryOffset + index } })));
      await Promise.all(images.map((image, index) => transaction.productImage.update({ where: { id: image.id }, data: { sortOrder: index } })));
    });
  }

  private assertValidImageOrderInput(imageIds: unknown): asserts imageIds is string[] {
    if (!Array.isArray(imageIds) || imageIds.some((imageId) => typeof imageId !== "string" || !isUUID(imageId, "4"))) {
      throw new BadRequestException("imageIds must be an array of UUID strings");
    }
  }

  private readonly imageInclude = { images: { orderBy: { sortOrder: "asc" as const } } };

  private log(event: string, details: Record<string, unknown>) {
    this.logger.log(JSON.stringify({ event, ...details }));
  }

  private logError(event: string, error: unknown, details: Record<string, unknown>) {
    this.logger.error(
      JSON.stringify({ event, ...details, error: error instanceof Error ? error.message : String(error) }),
      error instanceof Error ? error.stack : undefined,
    );
  }

  private throwNotFoundForMissingProduct(error: unknown, id: string): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new NotFoundException(`Product with id '${id}' not found`);
    }
  }
}
