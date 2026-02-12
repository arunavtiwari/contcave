"use client";

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { HiOutlineChevronLeft, HiOutlineChevronRight } from "react-icons/hi";
import { IoMdClose } from "react-icons/io";
import Slider, { Settings } from "react-slick";

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
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

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

  const NextArrow: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
    <div
      className="absolute top-1/2 right-3 transform -translate-y-1/2 z-10 cursor-pointer bg-[rgba(0,0,0,0.6)] backdrop-blur-2xl p-2 rounded-full shadow-sm border border-[rgba(255,255,255,0.5)] hover:bg-[rgba(0,0,0,0.8)] transition"
      onClick={onClick}
    >
      <HiOutlineChevronRight className="text-white" size={24} />
    </div>
  );

  const PrevArrow: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
    <div
      className="absolute top-1/2 left-3 transform -translate-y-1/2 z-10 cursor-pointer bg-[rgba(0,0,0,0.6)] backdrop-blur-2xl p-2 rounded-full shadow-sm border border-[rgba(255,255,255,0.5)] hover:bg-[rgba(0,0,0,0.8)] transition"
      onClick={onClick}
    >
      <HiOutlineChevronLeft className="text-white" size={24} />
    </div>
  );

  const slickSettings: Settings = {
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    initialSlide: selectedImageIndex || 0,
    arrows: true,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    adaptiveHeight: false,
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
      {!loaded[index] && <div className="absolute inset-0 bg-gray-300 animate-pulse rounded-lg"></div>}
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
            className={`relative ${isFeatured ? "col-span-2" : ""} h-[300px] cursor-pointer group`}
            onClick={() => handleModalImageClick(index)}
          >
            {!loaded[index] && <div className="absolute inset-0 bg-gray-300 animate-pulse rounded-lg"></div>}
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
    <Slider {...slickSettings}>
      {imageSrc.map((url, index) => (
        <div key={index} className="w-full h-[60vh] overflow-hidden rounded-xl relative">
          <Image src={url} alt={`image-${index}`} fill className="object-cover w-full" />
        </div>
      ))}
    </Slider>
  );

  return (
    <>
      <div className="flex gap-2">
        <Heading title={title} subtitle={`${location?.label}, India`} />
        <div className="pt-[6px]">
          <HeartButton listingId={id} currentUser={currentUser} />
        </div>
      </div>

      {showCarousel ? (
        <div className="mt-4">
          {sliderContent}
        </div>
      ) : (
        <>
          <div className="hidden lg:grid lg:grid-cols-2 gap-2 mt-4">
            <div className="relative h-[455px] cursor-pointer" onClick={() => handleImageClick(0)}>
              {!loaded[0] && <div className="absolute inset-0 bg-gray-300 animate-pulse rounded-l-lg"></div>}
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

            <div className="grid grid-rows-2 grid-cols-2 gap-2 h-[455px]">
              {imageSrc[1] && renderImageWithSkeleton(imageSrc[1], 1)}
              {imageSrc[2] && renderImageWithSkeleton(imageSrc[2], 2, "rounded-r-lg")}
              {imageSrc[3] && renderImageWithSkeleton(imageSrc[3], 3)}
              {imageSrc[4] && (
                <div className="relative w-full h-full">
                  {!loaded[4] && <div className="absolute inset-0 bg-gray-300 animate-pulse rounded-r-lg"></div>}
                  <Image
                    src={imageSrc[4]}
                    alt="image-4"
                    fill
                    onLoadingComplete={() => handleImageLoad(4)}
                    className={`object-cover rounded-r-lg hover:brightness-90 ${loaded[4] ? "opacity-100" : "opacity-0"} transition-opacity duration-500`}
                    onClick={() => handleImageClick(4)}
                  />
                  <button
                    className="absolute bottom-3 right-3 bg-white text-black px-4 py-1.5 rounded-lg shadow-sm hover:bg-neutral-200 transition font-medium text-base"
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
        <div className="fixed inset-0 z-9999 bg-black flex flex-col items-center justify-center">
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-50 p-2 bg-black/50 rounded-full transition"
          >
            <IoMdClose size={24} />
          </button>

          <div className="w-full h-full max-w-7xl max-h-screen flex items-center justify-center">
            <div className="w-full h-full">
              <Slider {...slickSettings} className="h-full">
                {imageSrc.map((url, index) => (
                  <div key={index} className="outline-none relative">
                    <div className="h-screen w-full flex items-center justify-center">
                      <div className="relative h-[90vh] w-full">
                        <Image
                          src={url}
                          alt={`Fullscreen image ${index}`}
                          fill
                          className="object-contain"
                          priority={index === selectedImageIndex}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </Slider>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ListingHead;
