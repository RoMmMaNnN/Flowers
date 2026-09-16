import { NotFoundException } from "@nestjs/common";
import { Product } from "@prisma/client";
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

describe("ProductsService", () => {
  const prisma = {
    product: {
      create: jest.fn(),
      findMany: jest.fn(),
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

  it("creates a product", async () => {
    prisma.product.create.mockResolvedValue(product);
    const data = { title: product.title, description: product.description };
    await expect(service.create(data)).resolves.toBe(product);
    expect(prisma.product.create).toHaveBeenCalledWith({ data });
  });

  it("finds visible products in display order", async () => {
    prisma.product.findMany.mockResolvedValue([product]);
    await expect(service.findAll()).resolves.toEqual([product]);
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { isVisible: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
  });

  it("finds one existing product", async () => {
    prisma.product.findUnique.mockResolvedValue(product);
    await expect(service.findOne(product.id)).resolves.toBe(product);
  });

  it("throws when a product is not found", async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    await expect(service.findOne(product.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("updates a product", async () => {
    prisma.product.findUnique.mockResolvedValue(product);
    prisma.product.update.mockResolvedValue({ ...product, isVisible: false });
    await expect(service.update(product.id, { isVisible: false })).resolves.toMatchObject({
      isVisible: false,
    });
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: product.id },
      data: { isVisible: false },
    });
  });

  it("deletes a product", async () => {
    prisma.product.findUnique.mockResolvedValue(product);
    prisma.product.delete.mockResolvedValue(product);
    await expect(service.remove(product.id)).resolves.toBe(product);
    expect(prisma.product.delete).toHaveBeenCalledWith({
      where: { id: product.id },
    });
  });
});