import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../auth.service";
import { JwtStrategy } from "./jwt.strategy";

describe("JwtStrategy", () => {
  const admin = { id: "admin-id", email: "admin@example.com" };
  const authService = {
    validateAdmin: jest.fn(),
  } as unknown as AuthService;
  const configService = {
    get: jest.fn().mockReturnValue("test-secret"),
  } as unknown as ConfigService;
  const strategy = new JwtStrategy(configService, authService);

  beforeEach(() => jest.clearAllMocks());

  it("accepts a valid payload and loads the admin", async () => {
    authService.validateAdmin = jest.fn().mockResolvedValue(admin);
    await expect(
      strategy.validate({ sub: admin.id, email: admin.email }),
    ).resolves.toBe(admin);
    expect(authService.validateAdmin).toHaveBeenCalledWith(admin.id);
  });

  it("rejects a payload without the required claims", async () => {
    await expect(
      strategy.validate({ sub: "", email: admin.email }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a token whose admin no longer exists", async () => {
    authService.validateAdmin = jest
      .fn()
      .mockRejectedValue(new UnauthorizedException());
    await expect(
      strategy.validate({ sub: admin.id, email: admin.email }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});