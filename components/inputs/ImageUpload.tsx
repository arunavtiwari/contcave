"use client";

import React, { useState } from "react";
import Image from "next/image";
import { TbPhotoPlus } from "react-icons/tb";

type Props = {
  onChange: (value: string[]) => void;
  values: string[];
  isFromPropertyClient?: boolean;
  circle?: boolean;
};

function ImageUpload({
  onChange,
  values,
  isFromPropertyClient = false,
  circle = false,
}: Props) {
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
      className={`relative cursor-pointer hover:opacity-85 transition border-dashed flex flex-col justify-center items-center text-neutral-600 ${circle ? "rounded-full" : "rounded-xl"
        } ${circle ? "w-full h-full" : "w-32 h-32 p-2 border-2 border-neutral-300"}`}
    >
      {uploading ? (
        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
      ) : circle ? (
        values && values.length > 0 ? (
          <Image
            src={values[0]}
            alt="Profile"
            width={128}
            height={128}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <TbPhotoPlus size={30} className="text-neutral-600" />
        )
      ) : (
        <TbPhotoPlus size={30} className="text-neutral-600" />
      )}

      {!circle && (
        <div className="font-semibold mt-1 flex items-center gap-2 text-sm">
          {uploading ? "Uploading" : "Upload Image"}
        </div>
      )}

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
