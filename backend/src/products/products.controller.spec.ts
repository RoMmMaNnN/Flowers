import { GUARDS_METADATA } from "@nestjs/common/constants";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ProductsController } from "./products.controller";

describe("ProductsController authentication", () => {
  const controller = ProductsController.prototype;
  type ControllerMethod = keyof ProductsController;

  it.each(["create", "update", "remove", "uploadImage", "deleteImage"] as ControllerMethod[])(
    "%s requires the JWT guard",
    (method) => {
      const guards = Reflect.getMetadata(GUARDS_METADATA, controller[method]);
      expect(guards).toContain(JwtAuthGuard);
    },
  );

  it.each(["findAll", "findOne"] as ControllerMethod[])("%s remains public", (method) => {
    expect(Reflect.getMetadata(GUARDS_METADATA, controller[method])).toBeUndefined();
  });
});