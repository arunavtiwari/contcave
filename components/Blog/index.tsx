"use client";

import React, { useEffect, useState } from "react";
import SectionHeader from "../Common/SectionHeader";
import BlogItem from "./BlogItem";
import getBlogData from "./getBlogData";
import { BlogPost } from "@/types/blog";

const Blog = () => {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);

  useEffect(() => {
    const loadBlogs = async () => {
      const getBlog: BlogPost[] = await getBlogData(); 
      setBlogs(getBlog);
    };

    loadBlogs();
  }, []);

  return (
    <section className="py-20 lg:py-25 xl:py-30">
      <div className="mx-auto max-w-c-1315 px-4 md:px-8 xl:px-0">
        <div className="animate_top mx-auto text-center">
          <SectionHeader
            headerInfo={{
              title: "LATEST UPDATES & INSIGHTS",
              subtitle: "Keeping up with ContCave",
              description:
                "Explore featured listings, FAQs, and behind-the-scenes stories. Dive into our expert insights to fuel your creativity and stay ahead in the ever-evolving world of visual storytelling.",
            }}
          />
        </div>
      </div>

      <div className="mx-auto mt-15 max-w-c-1280 px-4 md:px-8 xl:mt-20 xl:px-0">
        <div className="grid grid-cols-1 gap-7.5 md:grid-cols-2 lg:grid-cols-3 xl:gap-10">
          {blogs.length > 0 ? (
            blogs.slice(0, 3).map((blog, key) => (
              <BlogItem blog={blog} key={key} />
            ))
          ) : (
            <p>Loading...</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default Blog;
