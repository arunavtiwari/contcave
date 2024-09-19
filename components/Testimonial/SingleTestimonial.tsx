import { Testimonial } from "@/types/testimonial";
import Image from "next/image";

const SingleTestimonial = ({ review }: { review: Testimonial }) => {
  const { name, designation, image, content } = review;
  return (
    <div className="rounded-lg bg-white p-9 pt-7.5 shadow-solid-9">
      <div className="mb-7.5 flex justify-between border-b border-stroke pb-6">
        <div>
          <h3 className="mb-1.5 text-metatitle3 text-black">
            {name}
          </h3>
          <p>{designation}</p>
        </div>
        <Image width={60} height={50} className="" src={image} alt={name} />
      </div>

      <p>{content}</p>
    </div>
  );
};

export default SingleTestimonial;
