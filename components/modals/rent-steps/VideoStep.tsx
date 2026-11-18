"use client";

import React from "react";
import { IoMdClose } from "react-icons/io";
import { TbVideoPlus } from "react-icons/tb";

import ImageUpload from "@/components/inputs/ImageUpload";
import FormField from "@/components/ui/FormField";
import Heading from "@/components/ui/Heading";
import MediaButton from "@/components/ui/MediaButton";

interface VideoStepProps {
  videoSrc: string | null;
  setCustomValue: (id: string, value: unknown) => void;
}

const VideoStep: React.FC<VideoStepProps> = ({ videoSrc, setCustomValue }) => {
  return (
    <div className="flex flex-col gap-4">
      <Heading title="Add a video tour" subtitle="Give creators a better feel for your space" variant="h5" />
      <FormField label="Video tour" align="start">
        <div className="w-full">
          <ImageUpload
            uid="rent-modal-video-upload"
            uploadLabel="Upload Video Tour"
            onChange={(v) => setCustomValue("videoSrc", v[v.length - 1] || null)}
            values={videoSrc ? [videoSrc] : []}
            allowedTypes={["video/mp4", "video/webm", "video/quicktime"]}
            maxSize={100 * 1024 * 1024}
            icon={TbVideoPlus}
            className="w-full h-48 p-4 border border-border rounded-xl"
            multiple={false}
          />
          {videoSrc && (
            <div className="mt-4 relative group w-full max-w-md">
              <video src={videoSrc} controls className="w-full h-48 rounded-xl object-cover border border-border" />
              <MediaButton icon={IoMdClose} tone="dark" size="xs" reveal aria-label="Remove video"
                onClick={() => setCustomValue("videoSrc", null)}
                className="absolute top-2 right-2 z-10" />
            </div>
          )}
        </div>
      </FormField>
    </div>
  );
};

export default VideoStep;
