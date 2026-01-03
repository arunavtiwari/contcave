import fs from "fs";
import path from "path";

import { BlogPost } from "@/types/blog";

const postsDirectory = path.join(process.cwd(), "content/posts");

// Get all posts sorted by date
export function getSortedPostsData(): BlogPost[] {
  const fileNames = fs.readdirSync(postsDirectory);

  const allPosts: BlogPost[] = fileNames.map((fileName) => {
    const fullPath = path.join(postsDirectory, fileName);
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const post: BlogPost = JSON.parse(fileContents);
    return post;
  });

  return allPosts.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

// Get single post by ID (slug)
export function getPostData(id: string): BlogPost {
  const fullPath = path.join(postsDirectory, `${id}.json`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const post: BlogPost = JSON.parse(fileContents);
  return post;
}

export function groupPostsByCategory(posts: BlogPost[]) {
  const grouped: Record<string, BlogPost[]> = {};
  posts.forEach(post => {
    post.categories.forEach(cat => {
      if (!grouped[cat.title]) grouped[cat.title] = [];
      grouped[cat.title].push(post);
    });
  });
  return grouped;
}
