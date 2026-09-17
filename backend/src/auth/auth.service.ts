import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { isEmail } from "class-validator";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async ensureInitialAdmin(): Promise<void> {
    const email = this.configService.get<string>("ADMIN_EMAIL")?.trim();
    const password = this.configService.get<string>("ADMIN_PASSWORD");

    if (!email || !password) {
      this.logger.warn(
        "ADMIN_EMAIL and ADMIN_PASSWORD are not configured; initial admin was not created",
      );
      return;
    }

    if (!isEmail(email)) {
      this.logger.warn("ADMIN_EMAIL is invalid; initial admin was not created");
      return;
    }

    if (password.length < 8) {
      this.logger.warn(
        "ADMIN_PASSWORD is too short; initial admin was not created",
      );
      return;
    }

    const existingAdmin = await this.prisma.admin.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingAdmin) {
      this.logger.log(`Initial admin already exists: ${email}`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.admin.create({
      data: { email, passwordHash },
    });
    this.logger.log(`Initial admin created: ${email}`);
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const admin = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });
    const passwordMatches = admin
      ? await bcrypt.compare(dto.password, admin.passwordHash)
      : false;

    if (!admin || !passwordMatches) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const accessToken = await this.jwtService.signAsync({
      sub: admin.id,
      email: admin.email,
    });
    return { accessToken };
  }

  async validateAdmin(id: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id },
      select: { id: true, email: true },
    });
    if (!admin) {
      throw new UnauthorizedException("Invalid authentication token");
    }
    return admin;
  }
}