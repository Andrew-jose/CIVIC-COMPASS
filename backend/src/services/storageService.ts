/**
 * CIVIC COMPASS — Storage Service (Google Cloud Storage)
 * Manages ballot PDF uploads with signed URLs and auto-delete.
 */

export interface UploadResult {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  expiresAt: string;
}

/**
 * Store a file upload locally or in Cloud Storage.
 * Returns a reference for later retrieval.
 */
export async function storeUpload(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<UploadResult> {
  const fileId = `ballot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // In production: upload to Cloud Storage with signed URL
  const bucketName = process.env.CLOUD_STORAGE_BUCKET_NAME;
  if (bucketName) {
    console.log(`[Storage] Would upload to gs://${bucketName}/${fileId}`);
    // Production: use @google-cloud/storage SDK
  }

  // For dev: store in memory (files auto-expire)
  uploadCache.set(fileId, { buffer, fileName, mimeType, createdAt: Date.now() });

  // Auto-delete after 24h
  setTimeout(() => uploadCache.delete(fileId), 24 * 60 * 60 * 1000);

  return {
    fileId,
    fileName,
    mimeType,
    size: buffer.length,
    url: `/api/v1/ballot/file/${fileId}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/** Retrieve a stored file */
export async function getUpload(fileId: string): Promise<Buffer | null> {
  const cached = uploadCache.get(fileId);
  return cached?.buffer || null;
}

/** Delete a stored file */
export async function deleteUpload(fileId: string): Promise<boolean> {
  return uploadCache.delete(fileId);
}

// In-memory cache for development
const uploadCache = new Map<string, {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  createdAt: number;
}>();

/** Clean up expired uploads (call periodically) */
export function cleanupExpiredUploads(): number {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000;
  let cleaned = 0;
  for (const [id, data] of uploadCache.entries()) {
    if (now - data.createdAt > maxAge) {
      uploadCache.delete(id);
      cleaned++;
    }
  }
  return cleaned;
}
