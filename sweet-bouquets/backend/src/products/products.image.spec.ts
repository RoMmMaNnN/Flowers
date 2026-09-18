import { MaxFileSizeValidator } from "@nestjs/common";
import { ImageMimeTypeValidator } from "../storage/image-file.validator";
import { ProductsService } from "./products.service";

const file = (mimetype: string, originalname = "bouquet.jpg", size = 1024) => ({ mimetype, originalname, size, buffer: Buffer.from("image") }) as Express.Multer.File;

describe("Product image validation", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s", (mimetype) => expect(new ImageMimeTypeValidator().isValid(file(mimetype))).toBe(true));
  it.each(["application/pdf", "image/svg+xml"])("rejects %s", (mimetype) => expect(new ImageMimeTypeValidator().isValid(file(mimetype))).toBe(false));
  it("rejects files larger than 5 MB", () => expect(new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }).isValid(file("image/jpeg", "large.jpg", 5 * 1024 * 1024 + 1))).toBe(false));
});

describe("ProductsService image operations", () => {
  const transaction = {
    $queryRaw: jest.fn(),
    productImage: { create: jest.fn(), findFirst: jest.fn() },
  };
  const prisma = {
    product: { findUnique: jest.fn() },
    productImage: { findMany: jest.fn() },
    $transaction: jest.fn(async (callback: (client: typeof transaction) => Promise<unknown>) => callback(transaction)),
  };
  const storage = { uploadImage: jest.fn(), deleteImage: jest.fn() };
  const service = new ProductsService(prisma as never, storage as never);
  const product = { id: "11111111-1111-4111-8111-111111111111", images: [] };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.product.findUnique.mockResolvedValue(product);
    prisma.productImage.findMany.mockResolvedValue([]);
    transaction.productImage.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ sortOrder: 0 });
  });

  it("assigns unique ordered sortOrder values to multi-image uploads", async () => {
    storage.uploadImage
      .mockResolvedValueOnce({ path: "products/one.webp", publicUrl: "https://example.test/one.webp" })
      .mockResolvedValueOnce({ path: "products/two.webp", publicUrl: "https://example.test/two.webp" });
    const result = await service.uploadImages(product.id, [file("image/jpeg", "one.jpg"), file("image/png", "two.png")]);
    expect(result.uploaded).toHaveLength(2);
    expect(transaction.productImage.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: expect.objectContaining({ sortOrder: 0 }) }));
    expect(transaction.productImage.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: expect.objectContaining({ sortOrder: 1 }) }));
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it("reports successful and failed Storage uploads individually", async () => {
    storage.uploadImage.mockResolvedValueOnce({ path: "products/one.webp", publicUrl: "https://example.test/one.webp" }).mockRejectedValueOnce(new Error("storage unavailable"));
    const result = await service.uploadImages(product.id, [file("image/jpeg", "one.jpg"), file("image/png", "two.png")]);
    expect(result.uploaded).toHaveLength(1);
    expect(result.failed).toEqual([{ fileName: "two.png", message: "storage unavailable" }]);
  });

  it("cleans up Storage when the database insert fails", async () => {
    const storedImage = { path: "products/orphan.webp", publicUrl: "https://example.test/orphan.webp" };
    storage.uploadImage.mockResolvedValue(storedImage);
    transaction.productImage.create.mockRejectedValue(new Error("database unavailable"));
    await expect(service.uploadImages(product.id, [file("image/jpeg")])).resolves.toMatchObject({ failed: [{ fileName: "bouquet.jpg" }] });
    expect(storage.deleteImage).toHaveBeenCalledWith(storedImage.path);
  });

  it("reports failed cleanup when both database insert and Storage cleanup fail", async () => {
    const storedImage = { path: "products/orphan.webp", publicUrl: "https://example.test/orphan.webp" };
    storage.uploadImage.mockResolvedValue(storedImage);
    transaction.productImage.create.mockRejectedValue(new Error("database unavailable"));
    storage.deleteImage.mockRejectedValue(new Error("cleanup unavailable"));
    const result = await service.uploadImages(product.id, [file("image/jpeg")]);
    expect(result.failed[0].message).toContain(storedImage.path);
  });
});
