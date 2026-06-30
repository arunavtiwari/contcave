"use client";

import "swiper/css";
import "swiper/css/navigation";

import Image from "next/image";
import { useState } from "react";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
import { FiShare } from "react-icons/fi";
import { HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineVideoCamera } from "react-icons/hi";
import { IoMdClose } from "react-icons/io";
import { toast } from "sonner";
import { Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import Modal from "@/components/modals/Modal";
import VideoTourModal from "@/components/modals/VideoTourModal";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import useFavorite from "@/hooks/useFavorite";
import { SafeUser } from "@/types/user";

type Props = {
  title: string;
  locationValue: string;
  imageSrc: string[];
  videoSrc?: string | null;
  id: string;
  currentUser?: SafeUser | null;
};

function ListingHead({ title, locationValue: _locationValue, imageSrc, videoSrc, id, currentUser }: Props) {
  const { hasFavorite, toggleFavorite } = useFavorite({
    listingId: id,
    currentUser,
  });
  const [showModal, setShowModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [loaded, setLoaded] = useState<boolean[]>(new Array(imageSrc.length).fill(false));
  const [prevImageSignature, setPrevImageSignature] = useState(imageSrc.join("|"));
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  const imageSignature = imageSrc.join("|");
  if (imageSignature !== prevImageSignature) {
    setPrevImageSignature(imageSignature);
    setLoaded(new Array(imageSrc.length).fill(false));
  }

  const handleImageLoad = (index: number) => {
    setLoaded(prev => {
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });
  };

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setIsLightboxOpen(true);
  };

  const handleModalImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setIsLightboxOpen(true);
  };

  const handleShowAllPhotos = () => {
    setShowModal(true);
  };

  const showCarousel = imageSrc.length < 5;

  const skeletonClasses = (index: number) =>
    `bg-muted ${!loaded[index] ? "animate-pulse" : ""}`;

  const imageOpacityClasses = (index: number) =>
    `${loaded[index] ? "opacity-100" : "opacity-0"} transition-opacity duration-500`;

  const renderImageWithSkeleton = (
    src: string,
    index: number,
    extraClasses = "",
    imageClasses = "object-cover hover:brightness-90",
    priority = true,
    sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  ) => (
    <div className={`relative w-full h-full cursor-pointer overflow-hidden ${extraClasses} ${skeletonClasses(index)}`} onClick={() => handleImageClick(index)}>
      <Image
        src={src}
        alt={`image-${index}`}
        fill
        sizes={sizes}
        priority={priority}
        onLoad={() => handleImageLoad(index)}
        className={`${imageClasses} ${imageOpacityClasses(index)}`}
      />
    </div>
  );

  const modalContent = (
    <div className="grid grid-cols-2 gap-2">
      {imageSrc.map((url, index) => {
        const isFeatured = index % 3 === 0;
        return (
          <div
            key={index}
            className={`relative ${isFeatured ? "col-span-2" : ""} h-75 cursor-pointer group overflow-hidden rounded-lg ${skeletonClasses(index)}`}
            onClick={() => handleModalImageClick(index)}
          >
            <Image
              src={url}
              alt={`image-${index}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onLoad={() => handleImageLoad(index)}
              className={`object-cover group-hover:brightness-90 ${imageOpacityClasses(index)}`}
            />
          </div>
        );
      })}
    </div>
  );

  const sliderContent = (
    <div className="relative group">
      <Swiper
        modules={[Navigation]}
        loop={true}
        speed={500}
        navigation={{
          nextEl: '.swiper-button-next-custom',
          prevEl: '.swiper-button-prev-custom',
        }}
        initialSlide={selectedImageIndex || 0}
        onSlideChange={(swiper) => setActiveSlide(swiper.realIndex)}
        className="w-full aspect-4/3 lg:aspect-auto lg:h-[60vh] rounded-none lg:rounded-xl"
      >
        {imageSrc.map((url, index) => (
          <SwiperSlide key={index}>
            <div className={`w-full h-full relative cursor-pointer overflow-hidden ${skeletonClasses(index)}`} onClick={() => handleImageClick(index)}>
              <Image
                src={url}
                alt={`image-${index}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={index === 0}
                onLoad={() => handleImageLoad(index)}
                className={`object-cover w-full ${imageOpacityClasses(index)}`}
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {imageSrc.length > 1 && (
        <div className="absolute bottom-4 right-4 z-10 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-white text-xs font-semibold select-none lg:hidden">
          {activeSlide + 1} / {imageSrc.length}
        </div>
      )}

      <div className="hidden lg:block swiper-button-prev-custom absolute top-1/2 left-3 transform -translate-y-1/2 z-10 cursor-pointer bg-foreground/60 backdrop-blur-2xl p-2 rounded-full border border-background/50 hover:bg-foreground/80 transition opacity-0 group-hover:opacity-100">
        <HiOutlineChevronLeft className="text-background" size={24} />
      </div>
      <div className="hidden lg:block swiper-button-next-custom absolute top-1/2 right-3 transform -translate-y-1/2 z-10 cursor-pointer bg-foreground/60 backdrop-blur-2xl p-2 rounded-full border border-background/50 hover:bg-foreground/80 transition opacity-0 group-hover:opacity-100">
        <HiOutlineChevronRight className="text-background" size={24} />
      </div>
    </div>
  );

  return (
    <>
      <div className="lg:hidden -mx-6 -mt-10 mb-4 relative">
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 pt-3">
          <Button
            variant="ghost"
            rounded
            fit
            icon={HiOutlineChevronLeft}
            onClick={() => window.history.back()}
            aria-label="Go back"
            className="bg-white shadow-md border-none! p-2! h-auto!"
          />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              rounded
              fit
              icon={FiShare}
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Link copied to clipboard");
              }}
              aria-label="Share"
              className="bg-white shadow-md border-none! p-2! h-auto!"
            />
            <Button
              variant="ghost"
              rounded
              fit
              onClick={(e) => toggleFavorite(e)}
              aria-label={hasFavorite ? "Remove from wishlist" : "Add to wishlist"}
              className="bg-white shadow-md border-none! p-2! h-auto!"
            >
              {hasFavorite ? (
                <AiFillHeart size={16} className="fill-rose-500" />
              ) : (
                <AiOutlineHeart size={16} className="text-foreground" />
              )}
            </Button>
          </div>
        </div>
        {sliderContent}
      </div>

      <Heading variant="h4" as="h1" title={title} className="lg:hidden text-[1.375rem] font-medium font-sans leading-6.5!" />

      <div className="hidden lg:flex items-end justify-between gap-2">
        <Heading variant="h4" as="h1" title={title} className="text-[1.625rem] font-medium font-sans flex-1 leading-7.5!" />

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="xs"
            fit
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Link copied to clipboard");
            }}
            className="border-none! px-3! py-1.5! rounded-lg!"
          >
            <FiShare size={16} />
            <span className="underline">Share</span>
          </Button>

          <Button
            variant="ghost"
            size="xs"
            fit
            onClick={(e) => toggleFavorite(e)}
            className="border-none! px-3! py-1.5! h-auto! rounded-lg!"
          >
            {hasFavorite ? (
              <AiFillHeart size={16} className="fill-rose-500" />
            ) : (
              <AiOutlineHeart size={16} />
            )}
            <span className="underline">{hasFavorite ? "Saved" : "Save"}</span>
          </Button>
        </div>
      </div>

      {!showCarousel ? (
        <div className="hidden lg:grid lg:grid-cols-2 gap-1 mt-4">
          <div className={`relative h-113.75 cursor-pointer overflow-hidden rounded-l-2xl ${skeletonClasses(0)}`} onClick={() => handleImageClick(0)}>
            {imageSrc[0] && (
              <Image
                src={imageSrc[0]}
                alt="image-0"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                onLoad={() => handleImageLoad(0)}
                className={`object-cover hover:brightness-90 ${imageOpacityClasses(0)}`}
              />
            )}
          </div>

          <div className="grid grid-rows-2 grid-cols-2 gap-1 h-113.75">
            {imageSrc[1] && renderImageWithSkeleton(imageSrc[1], 1)}
            {imageSrc[2] && renderImageWithSkeleton(imageSrc[2], 2, "rounded-tr-2xl")}
            {imageSrc[3] && renderImageWithSkeleton(imageSrc[3], 3)}
            {imageSrc[4] && (
              <div className={`relative w-full h-full overflow-hidden rounded-br-2xl ${skeletonClasses(4)}`}>
                <Image
                  src={imageSrc[4]}
                  alt="image-4"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 33vw"
                  onLoad={() => handleImageLoad(4)}
                  className={`object-cover hover:brightness-90 ${imageOpacityClasses(4)} cursor-pointer`}
                  onClick={() => handleImageClick(4)}
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <Button
                    label="Show all photos"
                    onClick={handleShowAllPhotos}
                    variant="outline"
                    fit
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="hidden lg:block mt-4">
          {sliderContent}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onCloseAction={() => setShowModal(false)}
        onSubmitAction={() => { }}
        title="All Photos"
        body={modalContent}
        actionLabel=""
        selfActionButton={true}
        customWidth="w-full md:w-5/6 lg:w-4/6 xl:w-3/5"
      />

      {videoSrc && (
        <>
          <Button
            onClick={() => setShowVideoModal(true)}
            aria-label="video tour"
            rounded
            className="fixed bottom-18 right-4 z-99 group px-2.5! group-hover:px-5! transition-all duration-300"
            fit
          >
            <HiOutlineVideoCamera size={20} className="shrink-0" />
            <span className="max-w-0 opacity-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out -ml-2 group-hover:max-w-37.5 group-hover:opacity-100 group-hover:ml-0">
              Video Tour
            </span>
          </Button>
          <VideoTourModal
            isOpen={showVideoModal}
            onClose={() => setShowVideoModal(false)}
            videoSrc={videoSrc}
            title={title}
          />
        </>
      )}

      {isLightboxOpen && (
        <div className="fixed inset-0 z-9999 bg-foreground flex flex-col items-center justify-center">
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-6 right-6 text-background hover:text-white z-50 p-2.5 bg-background/20 backdrop-blur-xl border border-white/20 rounded-full transition-all hover:scale-110 active:scale-95"
          >
            <IoMdClose size={24} />
          </button>

          <div className="w-full h-full max-w-screen-2xl max-h-screen flex items-center justify-center group relative">
            <div className="w-full h-full">
              <Swiper
                modules={[Navigation]}
                loop={true}
                initialSlide={selectedImageIndex}
                className="h-full"
                navigation={{
                  nextEl: '.swiper-lb-next',
                  prevEl: '.swiper-lb-prev',
                }}
              >
                {imageSrc.map((url, index) => (
                  <SwiperSlide key={index}>
                    <div className="h-screen w-full flex items-center justify-center select-none cursor-grab active:cursor-grabbing">
                      <div className={`relative h-[90vh] w-full ${skeletonClasses(index)}`}>
                        <Image
                          src={url}
                          alt={`Fullscreen image ${index}`}
                          fill
                          sizes="100vw"
                          className={`object-contain ${imageOpacityClasses(index)}`}
                          onLoad={() => handleImageLoad(index)}
                          priority={index === selectedImageIndex}
                          draggable={false}
                        />
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>

            <div className="swiper-lb-prev absolute top-1/2 left-4 transform -translate-y-1/2 z-10 cursor-pointer bg-background/10 hover:bg-background/20 backdrop-blur-xl p-3 rounded-full transition opacity-0 group-hover:opacity-100">
              <HiOutlineChevronLeft className="text-background" size={32} />
            </div>
            <div className="swiper-lb-next absolute top-1/2 right-4 transform -translate-y-1/2 z-10 cursor-pointer bg-background/10 hover:bg-background/20 backdrop-blur-xl p-3 rounded-full transition opacity-0 group-hover:opacity-100">
              <HiOutlineChevronRight className="text-background" size={32} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ListingHead;

