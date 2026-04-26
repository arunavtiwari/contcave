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
  folder?: string;
};

function ImageUpload({
  onChange,
  values,
  circle = false,
  deferUpload = false,
  onFilesChange,
  uid = "file-upload",
  allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ],
  maxSize = 50 * 1024 * 1024,
  label = "Upload Image",
  icon: Icon = TbPhotoPlus,
  folder,
  className,
}: Props & { className?: string }) {
  const [uploading, setUploading] = useState(false);

  const isVideo = (url: string) => {
    return /\.(mp4|webm|mov)$/i.test(url);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        alert(
          `File "${file.name}" is too large. Maximum size is ${maxSize / 1024 / 1024
          }MB.`
        );
        event.target.value = "";
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        alert(
          `File "${file.name}" format not supported. Allowed: ${allowedTypes.join(
            ", "
          )}`
        );
        event.target.value = "";
        return;
      }
    }

    if (deferUpload) {
      const previews = Array.from(files).map((file) =>
        URL.createObjectURL(file)
      );
      onChange([...values, ...previews]);
      onFilesChange?.(Array.from(files));
      event.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const presignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type, folder }),
        });

        if (!presignRes.ok) {
          const txt = await presignRes.text();
          throw new Error(`Presign failed: ${txt}`);
        }

        const { url, publicUrl } = await presignRes.json();

        const uploadRes = await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": file.type
          },
          body: file,
        });

        if (!uploadRes.ok) throw new Error("Failed to upload file to storage");
        newUrls.push(publicUrl);
      }

      if (newUrls.length > 0) {
        onChange([...values, ...newUrls]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Upload Failed: ${errorMessage}`);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <label
      htmlFor={uid}
      className={`relative cursor-pointer hover:bg-muted transition border-dashed flex flex-col justify-center items-center text-muted-foreground ${circle ? "rounded-full" : "rounded-xl"
        } ${circle
          ? "w-full h-full"
          : className || "w-32 h-32 p-4 border border-border"
        }`}
    >
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-foreground border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Uploading...</span>
        </div>
      ) : circle ? (
        values && values.length > 0 ? (
          isVideo(values[0]) ? (
            <video
              src={values[0]}
              className="w-full h-full object-cover rounded-full"
              controls
            />
          ) : (
            <Image
              src={values[0]}
              alt="Preview"
              width={128}
              height={128}
              className="w-full h-full object-cover rounded-full"
              unoptimized
            />
          )
        ) : (
          <Icon size={30} className="text-muted-foreground" />
        )
      ) : (
        <div className="flex flex-col items-center gap-2 text-center">
          {className ? (
            <>
              <div className="p-3 bg-muted rounded-full">
                <Icon size={28} className="text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-foreground">
                  {label}
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                  Drag & drop or click to browse
                </span>
              </div>
            </>
          ) : (
            <>
              <Icon size={30} className="text-muted-foreground" />
              <div className="font-semibold mt-1 text-xs text-muted-foreground">
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
        accept={allowedTypes.join(",")}
      />
    </label>
  );
}

export default ImageUpload;
