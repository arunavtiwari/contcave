const BATCH_SIZE = 100;

// Best effort: a failed discard is a cost problem, never a user-facing one.
export async function discardUploadedMedia(refs: (string | null | undefined)[]): Promise<void> {
    const payload = Array.from(new Set(
        refs.filter((ref): ref is string => typeof ref === "string" && ref.trim().length > 0)
    ));
    if (payload.length === 0) return;

    for (let index = 0; index < payload.length; index += BATCH_SIZE) {
        try {
            await fetch("/api/upload/cleanup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refs: payload.slice(index, index + BATCH_SIZE) }),
                keepalive: true,
            });
        } catch (error) {
            console.error("Failed to discard abandoned uploads", error);
            return;
        }
    }
}
