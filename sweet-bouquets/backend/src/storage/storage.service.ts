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
    this.log("storage.image.processing.started", {
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });
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
    } catch (error) {
      this.logError("storage.image.processing.failed", error, {
        mimeType: file.mimetype,
        sizeBytes: file.size,
      });
      throw new BadRequestException("Uploaded file is not a valid image");
    }

    const path = `products/${randomUUID()}.webp`;
    this.log("storage.image.upload.started", { path, sizeBytes: processedImage.length });
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(path, processedImage, {
        contentType: "image/webp",
        upsert: false,
      });

    if (error) {
      this.logError("storage.image.upload.failed", error, { path });
      throw new InternalServerErrorException("Image storage is unavailable");
    }

    const { data } = this.client.storage.from(this.bucket).getPublicUrl(path);
    if (!data.publicUrl) {
      const error = new Error("Supabase returned an empty public image URL");
      this.logError("storage.image.url.failed", error, { path });
      throw new InternalServerErrorException("Image URL could not be created");
    }
    this.log("storage.image.upload.completed", { path, publicUrl: data.publicUrl });
    return { path, publicUrl: data.publicUrl };
  }

  async deleteImage(imageUrlOrPath: string): Promise<void> {
    const path = this.getStoragePath(imageUrlOrPath);
    if (!path) {
      this.logger.warn(`storage.image.delete.skipped invalid path: ${this.redactUrl(imageUrlOrPath)}`);
      return;
    }

    this.log("storage.image.delete.started", { path });
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([path]);
    if (error) {
      this.logError("storage.image.delete.failed", error, { path });
      throw new InternalServerErrorException("Image storage is unavailable");
    }
    this.log("storage.image.delete.completed", { path });
  }

  private log(event: string, details: Record<string, unknown>) {
    this.logger.log(JSON.stringify({ event, ...details }));
  }

  private logError(event: string, error: unknown, details: Record<string, unknown>) {
    this.logger.error(
      JSON.stringify({ event, ...details, error: error instanceof Error ? error.message : String(error) }),
      error instanceof Error ? error.stack : undefined,
    );
  }

  private redactUrl(value: string) {
    try {
      const url = new URL(value);
      return `${url.origin}${url.pathname}`;
    } catch {
      return value.slice(0, 160);
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