import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";

jest.mock("bcrypt", () => ({
  compare: jest.fn(),
}));

describe("AuthService", () => {
  const admin = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "admin@example.com",
    passwordHash: "hashed-password",
  };
  const prisma = {
    admin: {
      findUnique: jest.fn(),
    },
  };
  const jwtService = {
    signAsync: jest.fn(),
  } as unknown as JwtService;
  const service = new AuthService(prisma as never, jwtService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns an access token for valid credentials", async () => {
    prisma.admin.findUnique.mockResolvedValue(admin);
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
    jwtService.signAsync = jest.fn().mockResolvedValue("signed-token");

    await expect(
      service.login({ email: admin.email, password: "correct-password" }),
    ).resolves.toEqual({ accessToken: "signed-token" });
    expect(bcrypt.compare).toHaveBeenCalledWith(
      "correct-password",
      admin.passwordHash,
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: admin.id,
      email: admin.email,
    });
  });

  it("rejects an unknown email without checking a password", async () => {
    prisma.admin.findUnique.mockResolvedValue(null);
    const compare = jest.mocked(bcrypt.compare);

    await expect(
      service.login({ email: admin.email, password: "wrong-password" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(compare).not.toHaveBeenCalled();
  });

  it("rejects an incorrect password", async () => {
    prisma.admin.findUnique.mockResolvedValue(admin);
    jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      service.login({ email: admin.email, password: "wrong-password" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("does not return the password hash", async () => {
    prisma.admin.findUnique.mockResolvedValue(admin);
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
    jwtService.signAsync = jest.fn().mockResolvedValue("signed-token");

    const result = await service.login({
      email: admin.email,
      password: "correct-password",
    });
    expect(result).toEqual({ accessToken: "signed-token" });
    expect(result).not.toHaveProperty("passwordHash");
  });
});