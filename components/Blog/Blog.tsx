"use client";

import React, { useEffect, useState } from "react";

import getBlogData from "@/app/actions/getBlogData";
import Container from "@/components/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import { BlogPost } from "@/types/blog";

import BlogItem from "./BlogItem";

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
            <Container>
                <div className="animate_top mx-auto text-center">
                    <SectionHeader
                        badge="LATEST UPDATES & INSIGHTS"
                        title="Keeping up with ContCave"
                        description="Explore featured listings, FAQs, and behind-the-scenes stories. Dive into our expert insights to fuel your creativity and stay ahead in the ever-evolving world of visual storytelling."
                        center
                    />
                </div>
            </Container>

            <Container>
                <div className="animate_top mt-12">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:gap-10">
                        {blogs.length > 0 ? (
                            blogs.slice(0, 3).map((blog, key) => (
                                <BlogItem blog={blog} key={key} />
                            ))
                        ) : (
                            <p className="text-muted-foreground text-center">Loading...</p>
                        )}
                    </div>
                </div>
            </Container>
        </section>
    );
};

export default Blog;
