"use server";



import { getSortedPostsData } from "@/lib/posts";
import { BlogPost } from "@/types/blog";

const getBlogData = async (): Promise<BlogPost[]> => {
    try {
        const posts = getSortedPostsData();
        return posts;
    } catch (error) {
        console.error('[getBlogData] Error:', error);
        return [];
    }
};

export default getBlogData;
