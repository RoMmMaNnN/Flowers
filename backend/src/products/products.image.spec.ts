import { MaxFileSizeValidator } from "@nestjs/common";
import { NotFoundException } from "@nestjs/common";
import { Product } from "@prisma/client";
import { ImageMimeTypeValidator } from "../storage/image-file.validator";
import { ProductsService } from "./products.service";

const product = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Chocolate Rose",
  description: "A sweet bouquet made with chocolate.",
  imageUrl: null,
  isVisible: true,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies Product;

const file = (mimetype: string, size = 1024) =>
  ({ mimetype, size, buffer: Buffer.from("image") }) as Express.Multer.File;

describe("Product image validation", () => {
  const typeValidator = new ImageMimeTypeValidator();
  const sizeValidator = new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 });

  it.each(["image/jpeg", "image/png", "image/webp"])(
    "accepts %s",
    (mimetype) => {
      expect(typeValidator.isValid(file(mimetype))).toBe(true);
    },
  );

  it.each(["application/pdf", "image/svg+xml", "application/octet-stream"])(
    "rejects %s",
    (mimetype) => {
      expect(typeValidator.isValid(file(mimetype))).toBe(false);
    },
  );

  it("rejects files larger than 5 MB", () => {
    expect(sizeValidator.isValid(file("image/jpeg", 5 * 1024 * 1024 + 1))).toBe(
      false,
    );
  });
});

describe("ProductsService image operations", () => {
  const prisma = {
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const storage = {
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
  };
  const service = new ProductsService(prisma as never, storage as never);

  beforeEach(() => jest.clearAllMocks());

  it("returns 404 when uploading for a missing product", async () => {
    prisma.product.findUnique.mockResolvedValue(null);

    await expect(service.uploadImage(product.id, file("image/jpeg"))).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(storage.uploadImage).not.toHaveBeenCalled();
  });

  it("updates imageUrl after a successful upload", async () => {
    prisma.product.findUnique.mockResolvedValue(product);
    storage.uploadImage.mockResolvedValue({
      path: "products/new.webp",
      publicUrl: "https://storage.example/new.webp",
    });
    prisma.product.update.mockResolvedValue({
      ...product,
      imageUrl: "https://storage.example/new.webp",
    });

    await expect(service.uploadImage(product.id, file("image/jpeg"))).resolves.toMatchObject({
      imageUrl: "https://storage.example/new.webp",
    });
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: product.id },
      data: { imageUrl: "https://storage.example/new.webp" },
    });
  });

  it("does not update the database when upload fails", async () => {
    prisma.product.findUnique.mockResolvedValue(product);
    storage.uploadImage.mockRejectedValue(new Error("storage unavailable"));

    await expect(service.uploadImage(product.id, file("image/jpeg"))).rejects.toThrow(
      "storage unavailable",
    );
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it("cleans up the old image only after replacing it in the database", async () => {
    const existingProduct = { ...product, imageUrl: "products/old.webp" };
    prisma.product.findUnique.mockResolvedValue(existingProduct);
    storage.uploadImage.mockResolvedValue({
      path: "products/new.webp",
      publicUrl: "https://storage.example/new.webp",
    });
    prisma.product.update.mockResolvedValue({
      ...existingProduct,
      imageUrl: "https://storage.example/new.webp",
    });

    await service.uploadImage(product.id, file("image/png"));
    expect(storage.deleteImage).toHaveBeenCalledWith("products/old.webp");
    expect(prisma.product.update.mock.invocationCallOrder[0]).toBeLessThan(
      storage.deleteImage.mock.invocationCallOrder[0],
    );
  });

  it("leaves a product without an image unchanged", async () => {
    prisma.product.findUnique.mockResolvedValue(product);

    await expect(service.deleteImage(product.id)).resolves.toBe(product);
    expect(storage.deleteImage).not.toHaveBeenCalled();
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it("removes an existing image before clearing imageUrl", async () => {
    const existingProduct = { ...product, imageUrl: "products/old.webp" };
    prisma.product.findUnique.mockResolvedValue(existingProduct);
    prisma.product.update.mockResolvedValue({ ...existingProduct, imageUrl: null });

    await expect(service.deleteImage(product.id)).resolves.toMatchObject({
      imageUrl: null,
    });
    expect(storage.deleteImage).toHaveBeenCalledWith("products/old.webp");
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: product.id },
      data: { imageUrl: null },
    });
  });

  it("does not clear imageUrl when storage deletion fails", async () => {
    const existingProduct = { ...product, imageUrl: "products/old.webp" };
    prisma.product.findUnique.mockResolvedValue(existingProduct);
    storage.deleteImage.mockRejectedValue(new Error("storage unavailable"));

    await expect(service.deleteImage(product.id)).rejects.toThrow(
      "storage unavailable",
    );
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it("does not delete the product when image cleanup fails", async () => {
    const existingProduct = { ...product, imageUrl: "products/old.webp" };
    prisma.product.findUnique.mockResolvedValue(existingProduct);
    storage.deleteImage.mockRejectedValue(new Error("storage unavailable"));

    await expect(service.remove(product.id)).rejects.toThrow(
      "storage unavailable",
    );
    expect(prisma.product.delete).not.toHaveBeenCalled();
  });
});