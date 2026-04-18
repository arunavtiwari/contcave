export async function uploadToR2(files: (File | string)[], folder?: string): Promise<string[]> {
    const newUrls: string[] = [];
    for (const item of Array.from(files)) {
        let f: File;
        if (typeof item === "string") {
            if (item.startsWith("http") && !item.startsWith("blob:")) {
                newUrls.push(item);
                continue;
            }
            try {
                const response = await fetch(item);
                const blob = await response.blob();
                const ext = blob.type.split("/")[1] || "jpeg";
                f = new File([blob], `upload.${ext}`, { type: blob.type });
            } catch (e) {
                console.error("Failed to parse string into File:", e);
                continue;
            }
        } else {
            f = item;
        }

        const payload: Record<string, string> = { filename: f.name, contentType: f.type };
        if (folder) payload.folder = folder;

        const presignRes = await fetch("/api/upload/presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!presignRes.ok) {
            const txt = await presignRes.text();
            throw new Error(`Presign failed: ${txt}`);
        }

        const { url, publicUrl } = await presignRes.json();

        const uploadRes = await fetch(url, {
            method: "PUT",
            headers: {
                "Content-Type": f.type
            },
            body: f,
        });

        if (!uploadRes.ok) throw new Error("Failed to upload file to storage");
        newUrls.push(publicUrl);
    }
    return newUrls;
}
