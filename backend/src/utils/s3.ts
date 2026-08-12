import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Request } from 'express';
import multer, { StorageEngine, FileFilterCallback } from 'multer';
import path from 'path';
import crypto from 'crypto';

// ── S3 Client ─────────────────────────────────────────────────────────────────
// No credentials here — auth is handled automatically by the EC2 Instance Role
// (AWS SDK checks the instance metadata service at 169.254.169.254)
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
});

export const BUCKET = process.env.AWS_S3_BUCKET_NAME!;

// ── Multer: in-memory storage ─────────────────────────────────────────────────
const storage: StorageEngine = multer.memoryStorage();

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpg, jpeg, png, webp, gif)'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ── Upload to S3 ──────────────────────────────────────────────────────────────
export async function uploadToS3(
  file: Express.Multer.File,
  folder: string = 'products'
): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase();
  const key = `${folder}/${crypto.randomUUID()}${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  // Return the public URL
  return `https://${BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;
}

// ── Delete from S3 ────────────────────────────────────────────────────────────
export async function deleteFromS3(imageUrl: string): Promise<void> {
  try {
    // Extract the key from the full URL
    const url = new URL(imageUrl);
    const key = url.pathname.replace(/^\//, '');
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
    // Non-fatal — old image cleanup failure shouldn't block the response
  }
}
