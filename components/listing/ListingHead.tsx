"use client";

import useCities from "@/hook/useCities";
import { SafeUser } from "@/types";
import { motion } from "framer-motion";
import Image from "next/image";
import Heading from "../Heading";
import HeartButton from "../HeartButton";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";
import { HiOutlineChevronLeft, HiOutlineChevronRight } from "react-icons/hi";

type Props = {
  title: string;
  locationValue: string;
  imageSrc: string[];
  id: string;
  currentUser?: SafeUser | null;
};

function ListingHead({
  title,
  locationValue,
  imageSrc,
  id,
  currentUser,
}: Props) {
  const { getByValue } = useCities();
  const location = getByValue(locationValue);

  const NextArrow = ({ onClick }) => (
    <div className="absolute top-1/2 right-3 transform -translate-y-1/2 z-10 cursor-pointer bg-[rgba(255,255,255,0.1)] backdrop-blur-2xl p-2 rounded-full shadow-md border border-[rgba(255,255,255,0.5)] " onClick={onClick}>
      <HiOutlineChevronRight className="text-white" size={20} />
    </div>
  );

  const PrevArrow = ({ onClick }) => (
    <div className="absolute top-1/2 left-3 transform -translate-y-1/2 z-10 cursor-pointer bg-[rgba(255,255,255,0.1)] backdrop-blur-2xl p-2 rounded-full shadow-md border border-[rgba(255,255,255,0.5)] " onClick={onClick}>
      <HiOutlineChevronLeft className="text-white" size={20} />
    </div>
  );

  const slickSettings = {
    dots: true,
    infinite: true,
    speed: 1000,
    slidesToShow: 1,
    autoplay: true,
    autoplaySpeed: 10000,
    slidesToScroll: 1,
    arrows: true,
    fade: true,
    nextArrow: <NextArrow onClick={() => { }} />,
    prevArrow: <PrevArrow onClick={() => { }} />,
  };
  return (
    <>
      <div></div>
      <Heading
        title={title}
        subtitle={`India, ${location?.label}`}
      />

      <Slider {...slickSettings}>

        {imageSrc.map((url, index) => (
          <div key={index} className="w-full h-[60vh] overflow-hidden rounded-2xl relative">
            <Image
              src={url}
              alt={`image-${index}`}
              fill
              className="object-cover w-full"
            /></div>
        ))}
      </Slider>

      <div className="absolute top-5 right-5">
        <HeartButton listingId={id} currentUser={currentUser} />
      </div>

    </>
  );
}

export default ListingHead;
