import { BadRequestException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ProductsService } from "./products.service";

const firstImage = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", imageUrl: "https://example.test/one.webp", storagePath: "products/one.webp", sortOrder: 0 };
const secondImage = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", imageUrl: "https://example.test/two.webp", storagePath: "products/two.webp", sortOrder: 1 };
const product = { id: "11111111-1111-4111-8111-111111111111", title: "Chocolate Rose", description: "A sweet bouquet.", pricePence: 2499, isAvailable: true, isVisible: true, sortOrder: 0, images: [firstImage, secondImage] };

const createPrisma = () => {
  const transaction = {
    $queryRaw: jest.fn(),
    productImage: {
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  return {
    product: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    productImage: { create: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    transaction,
    $transaction: jest.fn(async (callback: (client: typeof transaction) => Promise<unknown>) => callback(transaction)),
  };
};

describe("ProductsService", () => {
  const prisma = createPrisma();
  const storage = { uploadImage: jest.fn(), deleteImage: jest.fn() };
  const service = new ProductsService(prisma as never, storage as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.product.findUnique.mockResolvedValue(product);
    prisma.productImage.findMany.mockResolvedValue([]);
    prisma.transaction.productImage.findFirst.mockResolvedValue({ sortOrder: 1 });
  });

  it("creates products with price and availability", async () => {
    prisma.product.create.mockResolvedValue(product);
    const data = { title: product.title, description: product.description, pricePence: 2499, isAvailable: true };
    await expect(service.create(data)).resolves.toBe(product);
  });

  it("finds visible products in display order", async () => {
    prisma.product.findMany.mockResolvedValue([product]);
    await expect(service.findAll()).resolves.toEqual([product]);
    expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isVisible: true }, include: { images: { orderBy: { sortOrder: "asc" } } } }));
  });

  it("uses a visibility predicate for the public single-product lookup", async () => {
    await expect(service.findPublicOne(product.id)).resolves.toBe(product);
    expect(prisma.product.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: product.id, isVisible: true } }));
  });

  it("does not return a hidden product publicly", async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    await expect(service.findPublicOne(product.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("allows internal lookup and updates for hidden products", async () => {
    const hiddenProduct = { ...product, isVisible: false };
    prisma.product.findUnique.mockResolvedValue(hiddenProduct);
    prisma.product.update.mockResolvedValue(hiddenProduct);
    await expect(service.update(product.id, { isAvailable: false })).resolves.toBe(hiddenProduct);
    expect(prisma.product.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: product.id } }));
  });

  it("rejects malformed service-level reorder input", async () => {
    await expect(service.reorderImages(product.id, undefined as never)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.reorderImages(product.id, ["not-a-uuid"])).rejects.toBeInstanceOf(BadRequestException);
  });

  it("reorders through a temporary offset so unique ordering is preserved", async () => {
    await service.reorderImages(product.id, [secondImage.id, firstImage.id]);
    expect(prisma.transaction.productImage.update).toHaveBeenCalledWith(expect.objectContaining({ data: { sortOrder: 3 } }));
    expect(prisma.transaction.productImage.update).toHaveBeenCalledWith(expect.objectContaining({ data: { sortOrder: 0 } }));
  });

  it("deletes an image only after Storage succeeds", async () => {
    await service.deleteImage(product.id, firstImage.id);
    expect(storage.deleteImage).toHaveBeenCalledWith(firstImage.storagePath);
    expect(prisma.productImage.delete).toHaveBeenCalledWith({ where: { id: firstImage.id } });
  });

  it("retains the database row when Storage deletion fails", async () => {
    storage.deleteImage.mockRejectedValue(new Error("storage unavailable"));
    await expect(service.deleteImage(product.id, firstImage.id)).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(prisma.productImage.delete).not.toHaveBeenCalled();
  });

  it("surfaces a database failure after successful Storage deletion", async () => {
    prisma.productImage.delete.mockRejectedValue(new Error("database unavailable"));
    await expect(service.deleteImage(product.id, firstImage.id)).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(storage.deleteImage).toHaveBeenCalledWith(firstImage.storagePath);
  });

  it("reports partial delete-all failures", async () => {
    storage.deleteImage.mockImplementation(async (path: string) => {
      if (path === secondImage.storagePath) throw new Error("storage unavailable");
    });
    prisma.productImage.delete.mockResolvedValue({});
    const result = await service.deleteAllImages(product.id);
    expect(result.deletedImageIds).toEqual([firstImage.id]);
    expect(result.failed).toEqual([expect.objectContaining({ imageId: secondImage.id })]);
  });

  it("reports product deletion failure after Storage cleanup", async () => {
    prisma.product.delete.mockRejectedValue(new Error("database unavailable"));
    await expect(service.remove(product.id)).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(storage.deleteImage).toHaveBeenCalledTimes(2);
  });
});
