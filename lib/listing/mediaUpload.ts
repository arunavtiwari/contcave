import { uploadToR2 } from "@/lib/storage/upload";
import { Addon } from "@/types/addon";

const createObjectId = (): string => {
  const bytes = new Uint8Array(12);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

interface AddonMediaInput {
  id?: string;
  name: string;
  price: number;
  qty: number;
  imageUrl?: string;
}

type UploadedSet<TSet> = Omit<TSet, "id" | "images" | "position"> & {
  id?: string;
  images: string[];
  position: number;
};

const shouldUploadString = (value: string): boolean =>
  value.startsWith("blob:") || value.startsWith("data:");

async function mapWithConcurrency<T, TResult>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<TResult>,
): Promise<TResult[]> {
  const results = new Array<TResult>(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await mapper(items[index], index);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

const uploadMediaItems = async (
  items: (string | File)[],
  folder: string
): Promise<string[]> => {
  const urls = await mapWithConcurrency(items, 4, async (item) => {
      if (typeof item === "string" && !shouldUploadString(item)) {
        return item;
      }

      const [uploadedUrl] = await uploadToR2([item], folder);
      if (!uploadedUrl) {
        throw new Error("Failed to upload media");
      }
      return uploadedUrl;
    });

  return urls;
};

export async function uploadListingMedia<
  TSet extends { id?: string; images?: string[] },
>(
  listingId: string,
  media: {
    imageSrc?: (string | File)[];
    videoSrc?: string | null;
    sets?: TSet[];
    addons?: AddonMediaInput[];
    createMissingSetIds?: boolean;
    createMissingAddonIds?: boolean;
  }
): Promise<{
  imageSrc: string[];
  videoSrc: string | null;
  sets: UploadedSet<TSet>[];
  addons: Addon[];
}> {
  // 1. Upload Main Images
  const finalImageSrc = media.imageSrc && media.imageSrc.length > 0
    ? await uploadMediaItems(media.imageSrc, `listings/${listingId}/media/main`)
    : [];

  // 2. Upload Video Tour
  let finalVideoSrc = media.videoSrc;
  if (media.videoSrc && shouldUploadString(media.videoSrc)) {
    const uploadedVideos = await uploadMediaItems([media.videoSrc], `listings/${listingId}/media/videos`);
    finalVideoSrc = uploadedVideos[0] || null;
  }

  // 3. Upload Sets Images
  const finalSets = media.sets
    ? await mapWithConcurrency(
        media.sets,
        3,
        async (s, i) => {
          const existingSetId = s.id && /^[0-9a-fA-F]{24}$/.test(s.id) ? s.id : undefined;
          const setId = existingSetId || (media.createMissingSetIds === false ? undefined : createObjectId());
          const uploadFolderSetId = setId || `set-${i}`;
          const {
            id: _ignoredInputSetId,
            images: _ignoredInputImages,
            position: _ignoredInputPosition,
            ...setWithoutManagedFields
          } = s as TSet & { position?: number };
          return {
            ...setWithoutManagedFields,
            ...(setId ? { id: setId } : {}),
            images: s.images && s.images.length > 0
              ? await uploadMediaItems(s.images, `listings/${listingId}/media/sets/${uploadFolderSetId}`)
              : [],
            position: i,
          } as UploadedSet<TSet>;
        },
      )
    : [];

  // 4. Upload Addons Images
  const finalAddons: Addon[] = media.addons
    ? await mapWithConcurrency(
        media.addons,
        4,
        async (addon, i) => {
          const addonId = addon.id || (media.createMissingAddonIds === false ? undefined : createObjectId());
          const uploadFolderAddonId = addonId || `addon-${i}`;
          let imageUrl = addon.imageUrl ?? "";
          if (shouldUploadString(imageUrl)) {
            const [uploadedUrl] = await uploadMediaItems([imageUrl], `listings/${listingId}/addons/${uploadFolderAddonId}`);
            imageUrl = uploadedUrl;
          }
          return {
            ...addon,
            ...(addonId ? { id: addonId } : {}),
            imageUrl,
          };
        },
      )
    : [];

  return {
    imageSrc: finalImageSrc,
    videoSrc: finalVideoSrc ?? null,
    sets: finalSets,
    addons: finalAddons,
  };
}

