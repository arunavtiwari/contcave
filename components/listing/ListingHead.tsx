"use client";

import "swiper/css";
import "swiper/css/navigation";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { HiOutlineChevronLeft, HiOutlineChevronRight } from "react-icons/hi";
import { IoMdClose } from "react-icons/io";
import { Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import HeartButton from "@/components/HeartButton";
import Modal from "@/components/modals/Modal";
import Heading from "@/components/ui/Heading";
import useCities from "@/hook/useCities";
import { SafeUser } from "@/types/user";

type Props = {
  title: string;
  locationValue: string;
  imageSrc: string[];
  id: string;
  currentUser?: SafeUser | null;
};

function ListingHead({ title, locationValue, imageSrc, id, currentUser }: Props) {
  const { getByValue } = useCities();
  const location = getByValue(locationValue);
  const [showModal, setShowModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  const [loaded, setLoaded] = useState<boolean[]>(new Array(imageSrc.length).fill(false));

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    setLoaded(new Array(imageSrc.length).fill(false));
  }, [imageSrc]);

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

  const renderImageWithSkeleton = (src: string, index: number, extraClasses = "") => (
    <div className="relative w-full h-full cursor-pointer" onClick={() => handleImageClick(index)}>
      <Image
        src={src}
        alt={`image-${index}`}
        fill
        onLoadingComplete={() => handleImageLoad(index)}
        className={`object-cover hover:brightness-90 ${extraClasses} ${loaded[index] ? "opacity-100" : "opacity-0"} transition-opacity duration-500`}
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
            className={`relative ${isFeatured ? "col-span-2" : ""} h-75 cursor-pointer group`}
            onClick={() => handleModalImageClick(index)}
          >
            <Image
              src={url}
              alt={`image-${index}`}
              fill
              onLoadingComplete={() => handleImageLoad(index)}
              className={`object-cover rounded-lg group-hover:brightness-90 ${loaded[index] ? "opacity-100" : "opacity-0"} transition-opacity duration-500`}
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
        className="w-full h-[60vh] rounded-xl"
      >
        {imageSrc.map((url, index) => (
          <SwiperSlide key={index}>
            <div className="w-full h-full relative cursor-pointer" onClick={() => handleImageClick(index)}>
              <Image src={url} alt={`image-${index}`} fill className="object-cover w-full" />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Custom Navigation */}
      <div className="swiper-button-prev-custom absolute top-1/2 left-3 transform -translate-y-1/2 z-10 cursor-pointer bg-foreground/60 backdrop-blur-2xl p-2 rounded-full border border-background/50 hover:bg-foreground/80 transition opacity-0 group-hover:opacity-100">
        <HiOutlineChevronLeft className="text-background" size={24} />
      </div>
      <div className="swiper-button-next-custom absolute top-1/2 right-3 transform -translate-y-1/2 z-10 cursor-pointer bg-foreground/60 backdrop-blur-2xl p-2 rounded-full border border-background/50 hover:bg-foreground/80 transition opacity-0 group-hover:opacity-100">
        <HiOutlineChevronRight className="text-background" size={24} />
      </div>
    </div>
  );

  return (
    <>
      <div className="flex gap-2">
        <Heading title={title} subtitle={`${location?.label}, India`} />
        <div className="pt-1.5">
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
            <div className="relative h-113.75 cursor-pointer" onClick={() => handleImageClick(0)}>
              {imageSrc[0] && (
                <Image
                  src={imageSrc[0]}
                  alt="image-0"
                  fill
                  onLoadingComplete={() => handleImageLoad(0)}
                  className={`object-cover rounded-l-lg hover:brightness-90 ${loaded[0] ? "opacity-100" : "opacity-0"} transition-opacity duration-500`}
                />
              )}
            </div>

            <div className="grid grid-rows-2 grid-cols-2 gap-1 h-113.75">
              {imageSrc[1] && renderImageWithSkeleton(imageSrc[1], 1)}
              {imageSrc[2] && renderImageWithSkeleton(imageSrc[2], 2, "rounded-tr-lg")}
              {imageSrc[3] && renderImageWithSkeleton(imageSrc[3], 3)}
              {imageSrc[4] && (
                <div className="relative w-full h-full">
                  <Image
                    src={imageSrc[4]}
                    alt="image-4"
                    fill
                    onLoadingComplete={() => handleImageLoad(4)}
                    className={`object-cover rounded-br-lg hover:brightness-90 ${loaded[4] ? "opacity-100" : "opacity-0"} transition-opacity duration-500`}
                    onClick={() => handleImageClick(4)}
                  />
                  <button
                    className="absolute bottom-3 right-3 bg-background text-foreground px-4 py-1.5 rounded-lg  hover:bg-neutral-200 transition font-medium text-base"
                    onClick={handleShowAllPhotos}
                  >
                    Show all photos
                  </button>
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
        onClose={() => setShowModal(false)}
        onSubmit={() => { }}
        title="All Photos"
        body={modalContent}
        actionLabel=""
        selfActionButton={true}
        customWidth="w-full md:w-5/6 lg:w-4/6 xl:w-3/5"
      />

      {isLightboxOpen && (
        <div className="fixed inset-0 z-9999 bg-foreground flex flex-col items-center justify-center">
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 text-background hover:text-gray-300 z-50 p-2 bg-foreground/50 rounded-full transition"
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
                      <div className="relative h-[90vh] w-full">
                        <Image
                          src={url}
                          alt={`Fullscreen image ${index}`}
                          fill
                          className="object-contain"
                          priority={index === selectedImageIndex}
                          draggable={false}
                        />
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>

            {/* Lighbox Custom Navigation */}
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
