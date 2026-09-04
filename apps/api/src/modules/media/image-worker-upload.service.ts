import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { signImageWorkerToken } from "./image-worker-token";

type ImageUploadType = "designs" | "product";

@Injectable()
export class ImageWorkerUploadService {
  private readonly logger = new Logger(ImageWorkerUploadService.name);
  private readonly workerUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.workerUrl = (
      this.configService.get<string>("IMAGE_WORKER_URL") ||
      "https://images.orivraa.com"
    ).replace(/\/+$/, "");
  }

  async uploadDataUrl(opts: {
    dataUrl: string;
    uploadType: ImageUploadType;
    filenamePrefix: string;
    subject: string;
    shopId?: string;
    fallbackToDataUrl?: boolean;
  }): Promise<string> {
    try {
      const matches = opts.dataUrl.match(
        /^data:image\/(png|jpe?g|webp);base64,([a-z0-9+/=\r\n]+)$/i,
      );
      if (!matches) throw new Error("Invalid base64 image format");

      const format =
        matches[1].toLowerCase() === "jpg"
          ? "jpeg"
          : matches[1].toLowerCase();
      const buffer = Buffer.from(matches[2], "base64");
      if (buffer.length < 1_000 || buffer.length > 10 * 1024 * 1024) {
        throw new Error("Generated image size is outside the allowed range");
      }

      const workerSecret = this.configService.get<string>(
        "IMAGE_WORKER_AUTH_SECRET",
      );
      if (!workerSecret) {
        throw new Error("IMAGE_WORKER_AUTH_SECRET is not configured");
      }

      const authorization = signImageWorkerToken(workerSecret, {
        sub: opts.subject,
        shopId: opts.shopId,
        role: "SYSTEM",
        op: "upload",
        uploadType: opts.uploadType,
        maxBytes: 10 * 1024 * 1024,
      });
      const blob = new Blob([buffer], { type: `image/${format}` });
      const formData = new FormData();
      formData.append(
        "file",
        blob,
        `${opts.filenamePrefix}.${format === "jpeg" ? "jpg" : format}`,
      );

      const response = await fetch(`${this.workerUrl}/upload`, {
        method: "POST",
        headers: {
          "X-Upload-Type": opts.uploadType,
          Authorization: `Bearer ${authorization}`,
        },
        body: formData,
      });
      const body = (await response.json().catch(() => null)) as {
        success?: boolean;
        url?: string;
        error?: string;
      } | null;
      if (!response.ok || !body?.success || !body.url) {
        throw new Error(
          body?.error || `Image worker upload failed (${response.status})`,
        );
      }
      return body.url;
    } catch (error) {
      this.logger.error(
        `Image worker upload failed: ${(error as Error).message}`,
      );
      if (opts.fallbackToDataUrl) return opts.dataUrl;
      throw error;
    }
  }
}
