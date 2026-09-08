export async function uploadToR2(
    files: (File | string)[],
    folder?: string,
    options: { access?: "public" | "private" } = {}
): Promise<string[]> {
    const newUrls: string[] = [];
    for (const item of Array.from(files)) {
        let f: File;
        if (typeof item === "string") {
            if (/^https?:\/\//i.test(item)) {
                let existingUrl: URL;
                try {
                    existingUrl = new URL(item);
                } catch {
                    throw new Error("Existing media URL is invalid");
                }
                if (existingUrl.protocol !== "https:" && process.env.NODE_ENV === "production") {
                    throw new Error("Existing media URLs must use HTTPS");
                }
                if (item.length > 2_000 || existingUrl.username || existingUrl.password) {
                    throw new Error("Existing media URL is invalid");
                }
                newUrls.push(existingUrl.toString());
                continue;
            }
            try {
                const response = await fetch(item);
                const blob = await response.blob();
                const ext = blob.type.split("/")[1] || "jpeg";
                f = new File([blob], `upload.${ext}`, { type: blob.type });
            } catch (e) {
                console.error("Failed to parse string into File:", e);
                throw new Error("Unable to read the selected media file");
            }
        } else {
            f = item;
        }

        if (!Number.isSafeInteger(f.size) || f.size <= 0) {
            throw new Error("Cannot upload an empty or invalid file");
        }
        const payload: Record<string, string | number> = {
            filename: f.name,
            contentType: f.type,
            fileSize: f.size,
        };
        if (folder) payload.folder = folder;
        payload.access = options.access || "public";

        const presignRes = await fetch("/api/upload/presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!presignRes.ok) {
            const txt = await presignRes.text();
            throw new Error(`Presign failed: ${txt}`);
        }

        const presignPayload: unknown = await presignRes.json();
        if (!presignPayload || typeof presignPayload !== "object") {
            throw new Error("Storage did not return a valid upload session");
        }
        const { url, publicUrl, objectRef, cacheControl } = presignPayload as {
            url?: unknown;
            publicUrl?: unknown;
            objectRef?: unknown;
            cacheControl?: unknown;
        };
        const storedRef = options.access === "private" ? objectRef : publicUrl;
        if (typeof url !== "string" || typeof storedRef !== "string") {
            throw new Error("Storage did not return a valid upload session");
        }

        const uploadRes = await fetch(url, {
            method: "PUT",
            headers: {
                "Content-Type": f.type,
                "Cache-Control": typeof cacheControl === "string" ? cacheControl : "public, max-age=31536000, immutable",
            },
            body: f,
        });

        if (!uploadRes.ok) throw new Error("Failed to upload file to storage");
        newUrls.push(storedRef);
    }
    return newUrls;
}
