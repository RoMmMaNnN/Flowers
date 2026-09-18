import "dotenv/config";
import * as bcrypt from "bcrypt";
import { isEmail } from "class-validator";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be configured");
  }
  if (!isEmail(email)) {
    throw new Error("ADMIN_EMAIL must be a valid email address");
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters long");
  }

  const existingAdmin = await prisma.admin.findUnique({ where: { email } });
  if (existingAdmin) {
    console.log(`Admin ${email} already exists`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.admin.create({ data: { email, passwordHash } });
  console.log(`Admin ${email} created successfully`);
}

createAdmin()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Admin creation failed",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());