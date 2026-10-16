export const MAX_IMAGE_DIMENSION = 2560;
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.85;

const COMPRESSIBLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXTENSION_FOR_TYPE: Record<string, string> = {
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/png": "png",
};

function drawScaled(bitmap: ImageBitmap, width: number, height: number) {
    if (typeof OffscreenCanvas !== "undefined") {
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(bitmap, 0, 0, width, height);
        return (type: string, quality?: number) => canvas.convertToBlob({ type, quality });
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    return (type: string, quality?: number) =>
        new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImageForUpload(file: File): Promise<File> {
    if (typeof window === "undefined" || !COMPRESSIBLE_TYPES.has(file.type)) return file;

    let bitmap: ImageBitmap | undefined;
    try {
        bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));

        const encode = drawScaled(bitmap, width, height);
        if (!encode) return file;

        let blob = await encode("image/webp", WEBP_QUALITY);
        if (!blob || blob.type !== "image/webp") {
            blob = file.type === "image/png" ? await encode("image/png") : await encode("image/jpeg", JPEG_QUALITY);
        }
        if (!blob || !EXTENSION_FOR_TYPE[blob.type]) return file;
        if (scale === 1 && blob.size >= file.size) return file;

        const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
        return new File([blob], `${baseName}.${EXTENSION_FOR_TYPE[blob.type]}`, {
            type: blob.type,
            lastModified: file.lastModified,
        });
    } catch (error) {
        console.warn("[compressImageForUpload] Uploading original image:", error);
        return file;
    } finally {
        bitmap?.close();
    }
}
