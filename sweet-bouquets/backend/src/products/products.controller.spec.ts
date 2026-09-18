import { GUARDS_METADATA } from "@nestjs/common/constants";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { ReorderImagesDto } from "./dto/reorder-images.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ProductsController } from "./products.controller";

describe("ProductsController authentication", () => {
  const controller = ProductsController.prototype;
  type ControllerMethod = keyof ProductsController;

  it.each(["create", "update", "remove", "uploadImages", "deleteImage", "deleteAllImages", "reorderImages"] as ControllerMethod[])(
    "%s requires the JWT guard",
    (method) => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, controller[method]);
      expect(guards).toContain(JwtAuthGuard);
    },
  );

  it.each(["findAll", "findOne"] as ControllerMethod[])("%s remains public", (method) => {
    expect(Reflect.getMetadata(GUARDS_METADATA, controller[method])).toBeUndefined();
  });

  it.each([{}, { imageIds: "not-an-array" }, { imageIds: ["not-a-uuid"] }])(
    "rejects malformed reorder payloads with HTTP 400 validation errors",
    async (payload) => {
      const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
      await expect(pipe.transform(payload, { type: "body", metatype: ReorderImagesDto })).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});