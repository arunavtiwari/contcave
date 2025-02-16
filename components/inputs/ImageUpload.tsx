"use client";

import React, { useState } from "react";
import { TbPhotoPlus } from "react-icons/tb";

type Props = {
  onChange: (value: string[]) => void;
  values: string[];
  isFromPropertyClient?: boolean;
};

function ImageUpload({ onChange, values, isFromPropertyClient = false }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    const uploadedUrls: string[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "phxjukr6");
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (data.secure_url) {
          uploadedUrls.push(data.secure_url);
        }
      } catch (error) {
        console.error("Upload failed:", error);
      }
    }

    setUploading(false);
    onChange([...values, ...uploadedUrls]);
  };

  return (
    <label
      htmlFor="file-upload"
      className={`relative cursor-pointer hover:opacity-85 transition border-dashed border-2 border-neutral-300 flex flex-col justify-center items-center text-neutral-600 rounded-xl w-32 h-32 p-2"
        }`}
    >
      {uploading ? (
        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
      ) : (
        <TbPhotoPlus size={30} className="text-neutral-600" />
      )}

      <div className={`font-semibold mt-1 flex items-center gap-2 text-sm`}>
        {uploading ? "Uploading" : "Upload Image"}
      </div>

      <input
        id="file-upload"
        type="file"
        multiple
        onChange={handleUpload}
        className="hidden"
        accept="image/*"
      />
    </label>
  );
}

export default ImageUpload;
