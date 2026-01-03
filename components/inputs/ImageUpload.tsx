"use client";

import Image from "next/image";
import React, { useState } from "react";
import { TbPhotoPlus } from "react-icons/tb";

type Props = {
  onChange: (value: string[]) => void;
  values: string[];
  circle?: boolean;
  deferUpload?: boolean;
  onFilesChange?: (files: File[]) => void;
};

function ImageUpload({
  onChange,
  values,
  circle = false,
  deferUpload = false,
  onFilesChange,
}: Props) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        alert(`Image "${file.name}" is too large. Maximum size is 10MB.`);
        event.target.value = "";
        return;
      }
      if (!allowedTypes.includes(file.type)) {
        alert(`Image "${file.name}" format not supported. Please use JPEG, PNG, or WebP.`);
        event.target.value = "";
        return;
      }
    }

    if (deferUpload) {
      const previews = Array.from(files).map((file) => URL.createObjectURL(file));
      onChange([...values, ...previews]);
      onFilesChange?.(Array.from(files));
      event.target.value = "";
      return;
    }

    setUploading(true);

    const uploadedUrls: string[] = [];
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    if (!cloudName) {
      alert("Image upload service is not configured. Please contact support.");
      setUploading(false);
      event.target.value = "";
      return;
    }

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "phxjukr6");

      try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed with status ${response.status}`);
        }

        const data = await response.json();
        if (data.secure_url) {
          uploadedUrls.push(data.secure_url);
        } else {
          throw new Error("No secure URL returned from upload service");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        alert(`Failed to upload "${file.name}": ${errorMessage}`);
      }
    }

    setUploading(false);
    if (uploadedUrls.length > 0) {
      onChange([...values, ...uploadedUrls]);
    }
    event.target.value = "";
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
