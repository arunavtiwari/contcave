"use client";

import React from "react";
import { IoMdClose } from "react-icons/io";
import { TbVideoPlus } from "react-icons/tb";

import FormField from "@/components/inputs/FormField";
import ImageUpload from "@/components/inputs/ImageUpload";
import Heading from "@/components/ui/Heading";

interface VideoStepProps {
  videoSrc: string | null;
  setCustomValue: (id: string, value: unknown) => void;
}

const VideoStep: React.FC<VideoStepProps> = ({ videoSrc, setCustomValue }) => {
  return (
    <div className="flex flex-col gap-8">
      <Heading title="Add a video tour (Optional)" subtitle="Give creators a better feel for your space" variant="h5" />
      <FormField label="Video tour" variant="horizontal" align="start">
        <div className="w-full">
          <ImageUpload
            uid="rent-modal-video-upload"
            uploadLabel="Upload Video Tour"
            onChange={(v) => setCustomValue("videoSrc", v[0] || null)}
            values={videoSrc ? [videoSrc] : []}
            allowedTypes={["video/mp4", "video/webm", "video/quicktime"]}
            maxSize={100 * 1024 * 1024}
            icon={TbVideoPlus}
            className="w-full h-48 p-4 border border-border rounded-xl"
          />
          {videoSrc && (
            <div className="mt-4 relative group w-full max-w-md">
              <video src={videoSrc} controls className="w-full h-48 rounded-xl object-cover border border-border" />
              <button
                onClick={() => setCustomValue("videoSrc", null)}
                className="absolute top-2 right-2 bg-foreground/60 hover:bg-foreground/80 text-background rounded-full w-6 h-6 opacity-0 group-hover:opacity-100 transition cursor-pointer flex items-center justify-center z-10"
              >
                <IoMdClose size={18} />
              </button>
            </div>
          )}
        </div>
      </FormField>
    </div>
  );
};

export default VideoStep;
