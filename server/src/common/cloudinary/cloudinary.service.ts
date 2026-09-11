import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';

import { env, type AppConfig } from '../../config/app.config';

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private configured = false;

  constructor(@Inject(ConfigService) private readonly config: AppConfig) {
    this.initialize();
  }

  private initialize(): void {
    const cloudName = env.cloudinaryCloudName(this.config);
    const apiKey = env.cloudinaryApiKey(this.config);
    const apiSecret = env.cloudinaryApiSecret(this.config);
    const cloudinaryUrl = env.cloudinaryUrl(this.config);

    if (cloudinaryUrl) {
      cloudinary.config({
        cloudinary_url: cloudinaryUrl,
      });
      this.configured = true;
      this.logger.log('Cloudinary initialized via CLOUDINARY_URL');
    } else if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.configured = true;
      this.logger.log(`Cloudinary initialized for cloud: ${cloudName}`);
    } else {
      this.logger.warn(
        'Cloudinary credentials not provided in environment. Media upload will be disabled until configured.',
      );
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Uploads an in-memory file buffer directly to Cloudinary using an upload stream.
   * File data is never written to disk or PostgreSQL.
   */
  async uploadImage(
    buffer: Buffer,
    folder: string,
    publicId?: string,
  ): Promise<CloudinaryUploadResult> {
    if (!this.configured) {
      throw new Error('Cloudinary is not configured on this server');
    }

    return new Promise((resolve, reject) => {
      const uploadOptions: Record<string, unknown> = {
        folder,
        resource_type: 'image',
      };

      if (publicId) {
        uploadOptions.public_id = publicId;
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
          if (error || !result) {
            this.logger.error(`Cloudinary upload failed: ${error?.message ?? 'Unknown error'}`);
            return reject(error ?? new Error('Cloudinary upload returned no result'));
          }

          resolve({
            url: result.url,
            secureUrl: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        },
      );

      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }

  /**
   * Deletes a remote asset from Cloudinary by public ID.
   */
  async deleteAsset(publicId: string): Promise<boolean> {
    if (!this.configured) {
      return false;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      this.logger.error(`Failed to delete Cloudinary asset ${publicId}:`, error);
      return false;
    }
  }
}

