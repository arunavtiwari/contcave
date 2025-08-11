import { getPostData } from "@/lib/posts";
import Image from "next/image";

export default async function PostPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const post = await getPostData(id);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-extrabold mb-4">{post.title}</h1>
      <div className="relative w-full h-64 mb-6">
      {post.image && (
        <div className="relative w-full h-64 mb-6">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover rounded-lg"
          />
        </div>
      )}
    </div>
      
      <p className="text-gray-500 text-sm mb-8">Published date: {post.date}</p>
      <article
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
    </div>
  );
}
