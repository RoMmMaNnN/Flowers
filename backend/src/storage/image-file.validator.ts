import { FileValidator } from "@nestjs/common";

export class ImageMimeTypeValidator extends FileValidator {
  constructor() {
    super({});
  }

  isValid(file?: Express.Multer.File): boolean {
    return Boolean(
      file && /^image\/(jpeg|png|webp)$/.test(file.mimetype),
    );
  }

  buildErrorMessage(): string {
    return "Only JPEG, PNG, and WebP images are allowed";
  }
}