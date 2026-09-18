import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { randomUUID } from "node:crypto";

const MAX_IMAGE_DIMENSION = 2000;
const WEBP_QUALITY = 82;

export interface StoredImage {
  path: string;
  publicUrl: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor(configService: ConfigService) {
    const url = configService.get<string>("SUPABASE_URL");
    const serviceRoleKey = configService.get<string>(
      "SUPABASE_SERVICE_ROLE_KEY",
    );
    this.bucket =
      configService.get<string>("SUPABASE_STORAGE_BUCKET") ?? "sweet-bouquets";

    if (!url || !serviceRoleKey) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured",
      );
    }

    this.client = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async uploadImage(file: Express.Multer.File): Promise<StoredImage> {
    let processedImage: Buffer;
    try {
      processedImage = await sharp(file.buffer)
        .rotate()
        .resize({
          width: MAX_IMAGE_DIMENSION,
          height: MAX_IMAGE_DIMENSION,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch {
      throw new BadRequestException("Uploaded file is not a valid image");
    }

    const path = `products/${randomUUID()}.webp`;
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(path, processedImage, {
        contentType: "image/webp",
        upsert: false,
      });

    if (error) {
      this.logger.error("Supabase image upload failed");
      throw new InternalServerErrorException("Image storage is unavailable");
    }

    const { data } = this.client.storage.from(this.bucket).getPublicUrl(path);
    return { path, publicUrl: data.publicUrl };
  }

  async deleteImage(imageUrlOrPath: string): Promise<void> {
    const path = this.getStoragePath(imageUrlOrPath);
    if (!path) {
      return;
    }

    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([path]);
    if (error) {
      this.logger.error("Supabase image deletion failed");
      throw new InternalServerErrorException("Image storage is unavailable");
    }
  }

  private getStoragePath(imageUrlOrPath: string): string | null {
    if (imageUrlOrPath.startsWith("products/")) {
      return imageUrlOrPath;
    }

    try {
      const url = new URL(imageUrlOrPath);
      const prefix = `/storage/v1/object/public/${this.bucket}/`;
      return url.pathname.startsWith(prefix)
        ? decodeURIComponent(url.pathname.slice(prefix.length))
        : null;
    } catch {
      return null;
    }
  }
}