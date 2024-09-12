"use client";
import { Blog } from "@/types/blog";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const BlogItem = ({ blog }: { blog: Blog }) => {
  const { mainImage, title, metadata, _id } = blog;

  return (
    <>
      <Link href={`/blog/${_id}`}>
        <motion.div
          variants={{
            hidden: {
              opacity: 0,
              y: -20,
            },

            visible: {
              opacity: 1,
              y: 0,
            },
          }}
          initial="hidden"
          whileInView="visible"
          transition={{ duration: 1, delay: 0.5 }}
          viewport={{ once: true }}
          className="animate_top rounded-xl bg-white p-4 pb-9 shadow-lg dark:bg-blacksection"
        >
          <div className="relative block aspect-[368/239] overflow-hidden transition rounded-xl">
            <Image src={mainImage} alt={title} fill className="hover:scale-110 transition"/>
          </div>

          <div className="px-4">
            <h3 className="mb-3.5 mt-7.5 line-clamp-2 inline-block text-lg font-medium text-black duration-300 hover:text-primary dark:text-white dark:hover:text-primary xl:text-itemtitle2">

              {`${title.slice(0, 40)}...`}

            </h3>
            <p className="line-clamp-3">{metadata}</p>
          </div>
        </motion.div>
      </Link>
    </>
  );
};

export default BlogItem;
