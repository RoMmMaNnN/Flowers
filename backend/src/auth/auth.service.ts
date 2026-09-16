import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

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