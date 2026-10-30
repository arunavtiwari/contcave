"use client";

import Image from "next/image";
import React from "react";
import { IconType } from "react-icons";
import { TbPhotoPlus } from "react-icons/tb";

import FormField from "@/components/ui/FormField";

type Props = {
  onChange: (value: string[]) => void;
  values: string[];
  circle?: boolean;
  onFilesChange?: (files: File[]) => void;
  uid?: string;
  allowedTypes?: string[];
  maxSize?: number;
  uploadLabel?: string;
  label?: string;
  description?: string;
  required?: boolean;
  variant?: "vertical" | "horizontal";
  error?: string;
  icon?: IconType;
  multiple?: boolean;
};

// Selections stay local as object URLs and only reach R2 when the surrounding
// form saves, so an abandoned form never leaves an orphaned object behind.
function ImageUpload({
  onChange,
  values,
  circle = false,
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
  maxSize = 15 * 1024 * 1024,
  uploadLabel,
  label,
  description,
  required,
  variant = "vertical",
  error,
  icon: Icon = TbPhotoPlus,
  multiple = true,
  className,
}: Props & { className?: string }) {
  const isVideo = (url: string) => {
    return /\.(mp4|webm|mov)$/i.test(url);
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    const previews = Array.from(files).map((file) => URL.createObjectURL(file));
    onChange([...values, ...previews]);
    onFilesChange?.(Array.from(files));
    event.target.value = "";
  };

  return (
    <FormField
      id={uid}
      label={label}
      description={description}
      required={required}
      error={error}
      variant={variant}
      className={circle ? "h-full" : undefined}
    >
      <label
        htmlFor={uid}
        className={`relative cursor-pointer hover:bg-muted transition border-dashed flex flex-col justify-center items-center text-muted-foreground ${circle ? "rounded-full" : "rounded-xl"
          } ${circle
            ? "w-full h-full"
            : className || "w-32 h-32 p-4 border border-border"
          }`}
      >
        {circle ? (
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
                    {uploadLabel || "Upload Image"}
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
                  {uploadLabel || "Upload"}
                </div>
              </>
            )}
          </div>
        )}

        <input
          id={uid}
          type="file"
          multiple={multiple}
          onChange={handleUpload}
          className="hidden"
          accept={allowedTypes.join(",")}
        />
      </label>
    </FormField>
  );
}

export default ImageUpload;
