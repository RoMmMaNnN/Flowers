import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { StorageService } from "./storage.service";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));
jest.mock("sharp", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("StorageService", () => {
  const upload = jest.fn();
  const remove = jest.fn();
  const getPublicUrl = jest.fn();
  const from = jest.fn().mockReturnValue({ upload, remove, getPublicUrl });

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue({ storage: { from } });
  });

  const service = () =>
    new StorageService({
      get: (key: string) =>
        ({
          SUPABASE_URL: "https://project.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
          SUPABASE_STORAGE_BUCKET: "sweet-bouquets",
        })[key],
    } as unknown as ConfigService);

  it("processes and uploads images as WebP", async () => {
    const toBuffer = jest.fn().mockResolvedValue(Buffer.from("processed-webp"));
    const webp = jest.fn().mockReturnValue({ toBuffer });
    const resize = jest.fn().mockReturnValue({ webp });
    const rotate = jest.fn().mockReturnValue({ resize });
    (sharp as unknown as jest.Mock).mockReturnValue({ rotate });
    upload.mockResolvedValue({ error: null });
    getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://project.supabase.co/image.webp" },
    });

    const result = await service().uploadImage({
      buffer: Buffer.from("source"),
    } as Express.Multer.File);

    expect(resize).toHaveBeenCalledWith({
      width: 2000,
      height: 2000,
      fit: "inside",
      withoutEnlargement: true,
    });
    expect(webp).toHaveBeenCalledWith({ quality: 82 });
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^products\/[0-9a-f-]+\.webp$/),
      Buffer.from("processed-webp"),
      { contentType: "image/webp", upsert: false },
    );
    expect(result.publicUrl).toBe("https://project.supabase.co/image.webp");
  });

  it("rejects bytes that Sharp cannot process as an image", async () => {
    const toBuffer = jest.fn().mockRejectedValue(new Error("invalid image"));
    const webp = jest.fn().mockReturnValue({ toBuffer });
    const resize = jest.fn().mockReturnValue({ webp });
    const rotate = jest.fn().mockReturnValue({ resize });
    (sharp as unknown as jest.Mock).mockReturnValue({ rotate });

    await expect(
      service().uploadImage({ buffer: Buffer.from("not-image") } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(upload).not.toHaveBeenCalled();
  });
});