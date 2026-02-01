"use client";

import Image from "next/image";
import React, { useState } from "react";
import { IconType } from "react-icons";
import { TbPhotoPlus } from "react-icons/tb";

type Props = {
  onChange: (value: string[]) => void;
  values: string[];
  circle?: boolean;
  deferUpload?: boolean;
  onFilesChange?: (files: File[]) => void;
  uid?: string;
  allowedTypes?: string[];
  maxSize?: number;
  label?: string;
  icon?: IconType;
};

function ImageUpload({
  onChange,
  values,
  circle = false,
  deferUpload = false,
  onFilesChange,
  uid = "file-upload",
  allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  maxSize = 10 * 1024 * 1024,
  label = "Upload Image",
  icon: Icon = TbPhotoPlus,
  className,
}: Props & { className?: string }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        alert(`File "${file.name}" is too large. Maximum size is ${maxSize / 1024 / 1024}MB.`);
        event.target.value = "";
        return;
      }
      if (!allowedTypes.includes(file.type)) {
        alert(`File "${file.name}" format not supported. Allowed: ${allowedTypes.join(", ")}`);
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
      alert("Upload service is not configured. Please contact support.");
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
      htmlFor={uid}
      className={`relative cursor-pointer hover:bg-neutral-50 transition border-dashed flex flex-col justify-center items-center text-neutral-600 ${circle ? "rounded-full" : "rounded-xl"
        } ${circle ? "w-full h-full" : className || "w-32 h-32 p-4 border-2 border-neutral-300"}`}
    >
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Uploading...</span>
        </div>
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
          <Icon size={30} className="text-neutral-600" />
        )
      ) : (
        <div className="flex flex-col items-center gap-2 text-center">
          {className ? (

            <>
              <div className="p-3 bg-neutral-100 rounded-full">
                <Icon size={28} className="text-neutral-600" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-gray-900">{label}</span>
                <span className="text-xs text-gray-500 mt-1">
                  Drag & drop or click to browse
                </span>
              </div>
            </>
          ) : (

            <>
              <Icon size={30} className="text-neutral-600" />
              <div className="font-semibold mt-1 text-xs text-neutral-600">
                {label === "Upload Image" ? "Upload" : label}
              </div>
            </>
          )}
        </div>
      )}

      <input
        id={uid}
        type="file"
        multiple
        onChange={handleUpload}
        className="hidden"
        style={{ display: "none" }}
        accept={allowedTypes.join(",")}
      />
    </label>
  );
}

export default ImageUpload;
