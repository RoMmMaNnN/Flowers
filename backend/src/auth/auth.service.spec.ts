import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";

jest.mock("bcrypt", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
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
      create: jest.fn(),
    },
  };
  const jwtService = {
    signAsync: jest.fn(),
  } as unknown as JwtService;
  const configService = {
    get: jest.fn(),
  } as unknown as ConfigService;
  const service = new AuthService(prisma as never, jwtService, configService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates the initial admin when configured and missing", async () => {
    configService.get = jest.fn((key: string) =>
      key === "ADMIN_EMAIL" ? admin.email : "correct-password",
    );
    prisma.admin.findUnique.mockResolvedValue(null);
    jest.mocked(bcrypt.hash).mockResolvedValue("hashed-password" as never);

    await service.ensureInitialAdmin();

    expect(bcrypt.hash).toHaveBeenCalledWith("correct-password", 12);
    expect(prisma.admin.create).toHaveBeenCalledWith({
      data: { email: admin.email, passwordHash: "hashed-password" },
    });
  });

  it("does not overwrite an existing initial admin", async () => {
    configService.get = jest.fn((key: string) =>
      key === "ADMIN_EMAIL" ? admin.email : "correct-password",
    );
    prisma.admin.findUnique.mockResolvedValue({ id: admin.id });

    await service.ensureInitialAdmin();

    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(prisma.admin.create).not.toHaveBeenCalled();
  });

  it("skips bootstrap when credentials are missing", async () => {
    configService.get = jest.fn().mockReturnValue(undefined);

    await service.ensureInitialAdmin();

    expect(prisma.admin.findUnique).not.toHaveBeenCalled();
    expect(prisma.admin.create).not.toHaveBeenCalled();
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