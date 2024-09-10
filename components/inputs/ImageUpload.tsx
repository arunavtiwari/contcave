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
  height?:number,
  width?:number,
  isFromPropertyClient?:boolean,
};

function ImageUpload({ onChange, values, height, width, isFromPropertyClient = false }: Props) {
  const handleCallback = useCallback(
    (result: any) => {
      const urls = Array.isArray(result.info.secure_url)
        ? result.info.secure_url
        : [result.info.secure_url];

      onChange([...values, ...urls]);
    },
    [onChange, values]
  );

  return (
    <CldUploadWidget
      onUpload={handleCallback}
      uploadPreset="phxjukr6"
      options={{
        maxFiles: 10,
        multiple: true
      }}
    >
      {({ open }) => {
        return (
          <div
            onClick={() => open?.()}
            className={`relative cursor-pointer hover:opacity-70 transition border-dashed border-2  border-neutral-300 flex flex-col justify-center items-center text-neutral-600 
            ${isFromPropertyClient ? 'p-5 rounded-md gap-0' : ' gap-4  p-20'}`}
          >
            <TbPhotoPlus size={isFromPropertyClient ? 30 : 50} />
            <div className={`font-semibold text-lg  ${isFromPropertyClient ? 'text-sm' : 'text-lg'}`}>Click to upload</div>
            {values.length > 0 && (
              <div className=" absolute inset-0 w-full h-full">
                {values.map((url, index) => (
                  
                    height ? (
                      <Image
                      key={index}
                      height={height}
                      width={width}
                      alt={`upload-${index}`}
                      style={{ objectFit: "cover" }}
                      src={url}
                    />
                    ): (
                      <Image
                      key={index}
                      alt={`upload-${index}`}
                      fill
                      style={{ objectFit: "cover" }}
                      src={url}
                    />
                    )
                
                ))}
              </div>
            )}
          </div>
        );
      }}
    </CldUploadWidget>
  );
}

export default ImageUpload;
