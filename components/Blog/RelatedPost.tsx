import React from "react";
import Image from "next/image";
import Link from "next/link";
import BlogData from "./blogData";

const RelatedPost = async () => {
  return (
    <>
      <div className="animate_top rounded-xl border border-stroke bg-white p-9 shadow-solid-13">
        <h4 className="mb-7.5 text-2xl font-semibold text-black ">
          Related Posts
        </h4>

        <div>
          {BlogData.slice(0, 3).map((post, key) => (
            <div
              className="mb-7.5 flex flex-wrap gap-4 xl:flex-nowrap 2xl:gap-6"
              key={key}
            >
              <div className="max-w-50 relative h-18 w-45">
                {post.mainImage ? (
                  <Image fill src={post.mainImage} alt="Blog" />
                ) : (
                  "No image"
                )}
              </div>
              <h5 className="text-md font-medium text-black transition-all duration-300 hover:text-primary ">
                <Link href={`/blog/${post._id}`}>
                  {" "}
                  {post.title.slice(0, 40)}...
                </Link>
              </h5>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default RelatedPost;
