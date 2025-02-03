"use client";

import { CldUploadWidget } from "next-cloudinary";
import Image from "next/image";
import React, { useCallback } from "react";
import { TbPhotoPlus } from "react-icons/tb";

declare global {
  var cloudinary: any;
}

type Props = {
  onChange: (value: string[]) => void;
  values: string[];
  height?: number;
  width?: number;
  isFromPropertyClient?: boolean;
};

function ImageUpload({
  onChange,
  values,
  height,
  width,
  isFromPropertyClient = false,
}: Props) {
  const handleCallback = useCallback(
    (result: any) => {
      if (result && result.info && result.info.secure_url) {
        // Add the uploaded URL to the existing array
        onChange([...values, result.info.secure_url]);
      }
    },
    [onChange, values]
  );

  return (
    <CldUploadWidget
      onSuccess={handleCallback}
      uploadPreset="phxjukr6"
      options={{
        maxFiles: 10,
        multiple: true, // Allow multiple uploads
      }}
    >
      {({ open }) => {
        return (
          <div
            onClick={() => open?.()}
            className={`relative cursor-pointer hover:opacity-70 transition border-dashed border-2 border-neutral-300 flex flex-col justify-center items-center text-neutral-600 rounded-xl
            ${isFromPropertyClient
                ? "p-5 gap-0"
                : "gap-4 p-20"
              }`}
          >
            <TbPhotoPlus
              size={isFromPropertyClient ? 30 : 50}
            />
            <div
              className={`font-semibold ${isFromPropertyClient ? "text-sm" : "text-lg"
                }`}
            >
              Click to upload
            </div>
            
          </div>
          
        );
      }}
    </CldUploadWidget>
  );
}

export default ImageUpload;
