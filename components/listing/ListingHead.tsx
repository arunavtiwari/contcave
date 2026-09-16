"use client";

import "swiper/css";
import "swiper/css/navigation";

import Image from "next/image";
import { useState } from "react";
import { HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineVideoCamera } from "react-icons/hi";
import { IoClose } from "react-icons/io5";
import { Keyboard, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import HeartButton from "@/components/listing/HeartButton";
import Modal from "@/components/modals/Modal";
import VideoTourModal from "@/components/modals/VideoTourModal";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import useCities from "@/hooks/useCities";
import { SafeUser } from "@/types/user";

type Props = {
  title: string;
  locationValue: string;
  imageSrc: string[];
  videoSrc?: string | null;
  id: string;
  currentUser?: SafeUser | null;
};

function ListingHead({ title, locationValue, imageSrc, videoSrc, id, currentUser }: Props) {
  const { getByValue } = useCities();
  const location = getByValue(locationValue);
  const [showModal, setShowModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [loaded, setLoaded] = useState<boolean[]>(new Array(imageSrc.length).fill(false));
  const [prevImageSignature, setPrevImageSignature] = useState(imageSrc.join("|"));
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activeLightboxIndex, setActiveLightboxIndex] = useState(0);
  const [prevSelectedImageIndex, setPrevSelectedImageIndex] = useState<number>(0);

  if (selectedImageIndex !== prevSelectedImageIndex) {
    setPrevSelectedImageIndex(selectedImageIndex);
    setActiveLightboxIndex(selectedImageIndex);
  }

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
    setActiveLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  const handleModalImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setActiveLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  const handleShowAllPhotos = () => {
    setShowModal(true);
  };

  const showCarousel = imageSrc.length < 5;

  const skeletonClasses = (index: number) =>
    !loaded[index] ? "bg-muted animate-pulse" : "";

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
    <button type="button" aria-label={`Open photo ${index + 1}`} className={`relative block w-full h-full cursor-pointer overflow-hidden ${extraClasses} ${skeletonClasses(index)}`} onClick={() => handleImageClick(index)}>
      <Image
        src={src}
        alt={`image-${index}`}
        fill
        sizes={sizes}
        priority={priority}
        onLoad={() => handleImageLoad(index)}
        className={`${imageClasses} ${imageOpacityClasses(index)}`}
      />
    </button>
  );

  const modalContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
      {imageSrc.map((url, index) => {
        const isHero = index === 0;
        return (
          <button
            type="button"
            aria-label={`Open photo ${index + 1}`}
            key={index}
            className={`relative ${isHero ? "col-span-1 md:col-span-2 h-96 sm:h-112 md:h-130" : "col-span-1 h-72 sm:h-84 md:h-96"} cursor-pointer group overflow-hidden rounded-2xl border border-border/40 bg-neutral-950/5 dark:bg-neutral-900/40 flex items-center justify-center transition-all hover:border-border ${skeletonClasses(index)}`}
            onClick={() => handleModalImageClick(index)}
          >
            {/* Ambient blurred backdrop so letterboxing/pillarboxing looks seamless */}
            <div className="absolute inset-0 overflow-hidden opacity-25 dark:opacity-20 filter blur-xl scale-110 pointer-events-none">
              <Image
                src={url}
                alt=""
                fill
                sizes="25vw"
                className="object-cover"
                aria-hidden="true"
              />
            </div>
            {/* The complete, uncropped photo */}
            <Image
              src={url}
              alt={`Photo ${index + 1}`}
              fill
              sizes={isHero ? "(max-width: 768px) 100vw, 80vw" : "(max-width: 768px) 100vw, 45vw"}
              onLoad={() => handleImageLoad(index)}
              className={`relative z-10 object-contain group-hover:scale-[1.01] transition-transform duration-300 ${imageOpacityClasses(index)}`}
            />
            {/* Photo index badge */}
            <span className="absolute bottom-3 right-3 z-20 text-xs font-medium px-2.5 py-1 rounded-full bg-background/80 dark:bg-background/70 backdrop-blur-md text-foreground border border-border/40 select-none shadow-xs">
              {index + 1} / {imageSrc.length}
            </span>
          </button>
        );
      })}
    </div>
  );

  const sliderContent = (
    <div className="relative group">
      <Swiper
        modules={[Navigation]}
        loop={imageSrc.length > 1}
        speed={500}
        navigation={{
          nextEl: '.swiper-button-next-custom',
          prevEl: '.swiper-button-prev-custom',
        }}
        initialSlide={selectedImageIndex || 0}
        className="w-full aspect-4/3 lg:aspect-auto lg:h-[60vh] rounded-xl"
      >
        {imageSrc.map((url, index) => (
          <SwiperSlide key={index}>
            <button type="button" aria-label={`Open photo ${index + 1}`} className={`block w-full h-full relative cursor-pointer overflow-hidden ${skeletonClasses(index)}`} onClick={() => handleImageClick(index)}>
              <Image
                src={url}
                alt={`image-${index}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={index === 0}
                onLoad={() => handleImageLoad(index)}
                className={`object-cover w-full ${imageOpacityClasses(index)}`}
              />
            </button>
          </SwiperSlide>
        ))}
      </Swiper>

      <button type="button" aria-label="Previous photo" className="swiper-button-prev-custom absolute top-1/2 left-3 transform -translate-y-1/2 z-10 cursor-pointer bg-foreground/60 backdrop-blur-2xl p-2 rounded-full border border-background/50 hover:bg-foreground/80 transition opacity-0 group-hover:opacity-100 focus-visible:opacity-100">
        <HiOutlineChevronLeft className="text-background" size={24} />
      </button>
      <button type="button" aria-label="Next photo" className="swiper-button-next-custom absolute top-1/2 right-3 transform -translate-y-1/2 z-10 cursor-pointer bg-foreground/60 backdrop-blur-2xl p-2 rounded-full border border-background/50 hover:bg-foreground/80 transition opacity-0 group-hover:opacity-100 focus-visible:opacity-100">
        <HiOutlineChevronRight className="text-background" size={24} />
      </button>
    </div>
  );

  return (
    <>
      <div className="flex gap-2">
        <Heading variant="h4" as="h1" title={title} subtitle={`${location?.label}, India`} />
        <div className="pt-1">
          <HeartButton listingId={id} currentUser={currentUser} />
        </div>
      </div>

      {showCarousel ? (
        <div className="mt-4">
          {sliderContent}
        </div>
      ) : (
        <>
          <div className="hidden lg:grid lg:grid-cols-2 gap-1 mt-4">
            <button type="button" aria-label="Open photo 1" className={`relative block h-113.75 w-full cursor-pointer overflow-hidden rounded-l-lg ${skeletonClasses(0)}`} onClick={() => handleImageClick(0)}>
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
            </button>

            <div className="grid grid-rows-2 grid-cols-2 gap-1 h-113.75">
              {imageSrc[1] && renderImageWithSkeleton(imageSrc[1], 1)}
              {imageSrc[2] && renderImageWithSkeleton(imageSrc[2], 2, "rounded-tr-lg")}
              {imageSrc[3] && renderImageWithSkeleton(imageSrc[3], 3)}
              {imageSrc[4] && (
                <div className={`relative w-full h-full overflow-hidden rounded-br-lg ${skeletonClasses(4)}`}>
                  <Image
                    src={imageSrc[4]}
                    alt="image-4"
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 33vw"
                    onLoad={() => handleImageLoad(4)}
                    className={`object-cover hover:brightness-90 ${imageOpacityClasses(4)} cursor-pointer`}
                  />
                  <button type="button" aria-label="Open photo 5" className="absolute inset-0" onClick={() => handleImageClick(4)} />
                  <div className="absolute bottom-4 right-4 z-10 flex gap-2">
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

          <div className="lg:hidden mt-4">
            {sliderContent}
          </div>
        </>
      )}

      <Modal
        isOpen={showModal}
        onCloseAction={() => setShowModal(false)}
        onSubmitAction={() => { }}
        title={`All Photos (${imageSrc.length})`}
        body={modalContent}
        actionLabel=""
        selfActionButton={true}
        customWidth="w-full md:w-5/6 lg:w-4/5 xl:w-3/4 max-w-6xl"
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
        <div role="dialog" aria-modal="true" aria-label="Photo gallery" className="fixed inset-0 z-9999 bg-foreground/70 backdrop-blur-md flex flex-col items-center justify-center">
          <div className="absolute top-0 inset-x-0 h-20 px-6 md:px-10 flex items-center justify-between z-50 bg-linear-to-b from-foreground/80 to-transparent">
            <Button
              onClick={() => setIsLightboxOpen(false)}
              variant="ghost"
              icon={IoClose}
              fit
              className="text-background rounded-full md:rounded-lg p-2 md:px-4 md:py-2 [&_svg]:shrink-0 hover:bg-background/10"
            >
              <span className="leading-none hidden md:inline">Close</span>
            </Button>
            <div className="text-background/80 text-sm font-medium select-none">
              {activeLightboxIndex + 1} / {imageSrc.length}
            </div>
            <div className="w-20 hidden md:block" />
          </div>

          <div className="w-full h-full max-w-screen-2xl max-h-screen flex items-center justify-center group relative">
            <div className="w-full h-full">
              <Swiper
                modules={[Navigation, Keyboard]}
                keyboard={{ enabled: true }}
                loop={imageSrc.length > 1}
                initialSlide={selectedImageIndex}
                className="h-full"
                navigation={{
                  nextEl: '.swiper-lb-next',
                  prevEl: '.swiper-lb-prev',
                }}
                onSlideChange={(swiper) => setActiveLightboxIndex(swiper.realIndex)}
              >
                {imageSrc.map((url, index) => (
                  <SwiperSlide key={index}>
                    <div className="h-screen w-full flex items-center justify-center select-none cursor-grab active:cursor-grabbing">
                      <div className="relative h-[80vh] w-full">
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

            <button type="button" aria-label="Previous photo" className="swiper-lb-prev absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-50 cursor-pointer border border-background/20 bg-background/5 hover:bg-background/15 hover:border-background/50 text-background p-3 rounded-full backdrop-blur-sm transition-colors hidden md:flex items-center justify-center active:scale-90">
              <HiOutlineChevronLeft size={20} />
            </button>
            <button type="button" aria-label="Next photo" className="swiper-lb-next absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-50 cursor-pointer border border-background/20 bg-background/5 hover:bg-background/15 hover:border-background/50 text-background p-3 rounded-full backdrop-blur-sm transition-colors hidden md:flex items-center justify-center active:scale-90">
              <HiOutlineChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ListingHead;

