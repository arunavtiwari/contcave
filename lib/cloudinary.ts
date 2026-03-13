/**
 * Securely uploads a file or list of files to Cloudinary.
 * Handles Files, blob: URLs, and skips existing URLs.
 * Determines resource_type automatically for Videos/PDFs.
 * Acquires a secure signature from the backend before uploading.
 */
export async function uploadToCloudinary(
    items: (File | string)[],
    folder: string = "general"
): Promise<string[]> {
    const uploadedUrls: string[] = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // 1. Skip already uploaded secure_urls
        if (typeof item === 'string' && !item.startsWith('blob:')) {
            uploadedUrls.push(item);
            continue;
        }

        // 2. Resolve blob: URLs to Files
        let fileToUpload: File;
        if (typeof item === 'string' && item.startsWith('blob:')) {
            try {
                const blobRes = await fetch(item);
                if (!blobRes.ok) {
                    console.warn(`Skipping expired blob URL: ${item}`);
                    continue;
                }
                const blob = await blobRes.blob();
                fileToUpload = new File([blob], `file_${Date.now()}_${i}`, { type: blob.type });
            } catch {
                console.warn(`Skipping invalid blob URL: ${item}`);
                continue;
            }
        } else if (item instanceof File) {
            fileToUpload = item;
        } else {
            continue;
        }

        // 3. Determine resource_type
        let resourceType = "auto";
        if (fileToUpload.type.startsWith("video/")) {
            resourceType = "video";
        } else if (fileToUpload.type === "application/pdf") {
            resourceType = "raw";
        } else if (fileToUpload.type.startsWith("image/")) {
            resourceType = "image";
        }

        // 4. Get Signature from Backend
        const timestamp = Math.floor(Date.now() / 1000);
        const signRes = await fetch("/api/cloudinary/sign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                paramsToSign: { folder, timestamp }
            })
        });

        if (!signRes.ok) throw new Error("Failed to get upload signature");

        const signPayload = await signRes.json();
        const signData = signPayload?.data;

        if (!signData?.signature || !signData?.apiKey || !signData?.cloud) {
            throw new Error("Invalid signature response from backend");
        }

        // 5. Upload to Cloudinary securely
        const formData = new FormData();
        formData.append("file", fileToUpload);
        formData.append("folder", folder);
        formData.append("timestamp", String(signData.timestamp));
        formData.append("api_key", signData.apiKey);
        formData.append("signature", signData.signature);

        if (resourceType !== "auto") {
            formData.append("resource_type", resourceType);
        }

        const response = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloud}/${resourceType === 'raw' ? 'raw' : 'auto'}/upload`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData?.error?.message || `Upload failed for ${fileToUpload.name}`);
        }

        const data = await response.json();
        if (data.secure_url) {
            uploadedUrls.push(data.secure_url);
        } else {
            throw new Error("No secure URL returned");
        }
    }

    return uploadedUrls;
}
