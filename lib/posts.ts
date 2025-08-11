import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const postsDir = path.join(process.cwd(), "content/posts");

export interface PostMeta {
  id: string;
  title: string;
  date: string;
  excerpt?: string;
  image?: string; 
}

export interface PostData extends PostMeta {
  contentHtml: string;
}

// Fetch all posts metadata
export function getSortedPostsData(): PostMeta[] {
  const fileNames = fs.readdirSync(postsDir);

  const allPostsData: PostMeta[] = fileNames.map(fileName => {
    const id = fileName.replace(/\.md$/, "");
    const fullPath = path.join(postsDir, fileName);
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data } = matter(fileContents);

    return {
      id,
      title: data.title,
      date: data.date,
      excerpt: data.excerpt,
      image: data.image, // ✅ now available for cards
    };
  });

  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}


// Fetch one post's data
export async function getPostData(id: string): Promise<PostData> {
  const fullPath = path.join(postsDir, `${id}.md`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  const processedContent = await remark().use(html).process(content);

  return {
    id,
    title: data.title,
    date: data.date,
    excerpt: data.excerpt,
    image: data.image,
    contentHtml: processedContent.toString(),
  };
}

