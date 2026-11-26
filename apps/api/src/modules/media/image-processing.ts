import sharp from 'sharp';

/** Longest side of a stored image and of its thumbnail, in pixels. */
export const FULL_SIZE = 1600;
export const THUMB_SIZE = 320;

/** One encoded variant of an image. */
export interface EncodedImage {
  data: Buffer;
  width: number;
  height: number;
}

/**
 * Compresses an upload into a WebP no larger than 1600 px and a 320 px thumbnail (CORE-42).
 * EXIF orientation is applied, then every metadata block (GPS, camera) is dropped.
 * Returns null when the bytes are not a readable image.
 */
export async function processImage(
  input: Buffer,
): Promise<{ full: EncodedImage; thumb: EncodedImage } | null> {
  try {
    const encode = async (size: number, quality: number): Promise<EncodedImage> => {
      const { data, info } = await sharp(input, { failOn: 'error' })
        .autoOrient()
        .resize(size, size, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality })
        .toBuffer({ resolveWithObject: true });
      return { data, width: info.width, height: info.height };
    };
    return { full: await encode(FULL_SIZE, 80), thumb: await encode(THUMB_SIZE, 75) };
  } catch {
    return null;
  }
}
