import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import getBlogData from "./getBlogData";
import { BlogPost } from "@/types/blog";

const RelatedPost = () => {
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);


  useEffect(() => {
    const loadBlogs = async () => {
      const getBlog: BlogPost[] = await getBlogData(); 
      setRelatedPosts(getBlog);
    };

    loadBlogs();
  }, []);

  return (
    <div className="animate_top rounded-xl border border-stroke bg-white p-9 shadow-solid-13">
      <h4 className="mb-7.5 text-2xl font-semibold text-black">Related Posts</h4>
      <div>
        {relatedPosts.slice(0, 3).map((post, key) => (
          <div className="mb-7.5 flex flex-wrap gap-4 xl:flex-nowrap 2xl:gap-6" key={key}>
            <div className="max-w-50 relative h-18 w-45">
              {post.meta.image ? (
                <Image fill src={post.meta.image.url} alt="Blog" />
              ) : (
                "No image"
              )}
            </div>
            <h5 className="text-md font-medium text-black transition-all duration-300 hover:text-primary">
              <Link href={`/blog/${post.id}`}>
                {post.title.slice(0, 40)}...
              </Link>
            </h5>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RelatedPost;
