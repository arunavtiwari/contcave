"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";

import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import Pill from "@/components/ui/Pill";
import { formatISTDate } from "@/lib/utils";
import { BlogPost } from "@/types/blog";

interface BlogItemProps {
    post: BlogPost;
}

const BlogItem: React.FC<BlogItemProps> = ({ post }) => {
    return (
        <Link
            href={`/blog/${post.id}`}
            className="group flex flex-col bg-background rounded-2xl shadow-sm transition-all duration-500 overflow-hidden h-full"
        >
            <div className="relative h-60 overflow-hidden">
                {post.meta.image && (
                    <Image
                        src={post.meta.image.url}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                )}
                <div className="absolute top-3 right-3 z-10">
                    <Pill
                        label={formatISTDate(post.publishedAt, { day: "numeric", month: "short" })}
                        variant="glass"
                        size="xs"
                    />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-foreground/10 backdrop-blur-xl px-4 py-2">
                    <Heading
                        title={post.title}
                        variant="h6"
                        className="text-background! line-clamp-2 text-sm"
                    />
                </div>
            </div>

            <div className="p-4 flex flex-col flex-1 gap-3">
                <p className="text-muted-foreground line-clamp-3 text-sm flex-1">
                    {post.meta.description || "Explore insights and stories about studio booking and production workflows…"}
                </p>
                <div className="mt-auto">
                    <Button label="Read Article" variant="outline" size="sm" fit rounded />
                </div>
            </div>
        </Link>
    );
};

export default BlogItem;
