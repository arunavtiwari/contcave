import { getPostData } from "@/lib/posts";
import Image from "next/image";

export default async function PostPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const post = await getPostData(id);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 !select-text">
      {/* Hero / Title */}
      <h1 className="text-4xl font-extrabold mb-4">{post.title}</h1>

      {post.meta?.image?.url && (
        <div className="relative w-full h-80 mb-6">
          <Image
            src={post.meta.image.url}
            alt={post.meta.image.alt || post.title}
            fill
            className="object-cover rounded-lg"
          />
        </div>
      )}

      <p className="text-gray-500 text-sm mb-8">
        Published on: {new Date(post.publishedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>

      {/* Blog Body */}
      {post.layout.map((block) => {
        switch (block.blockType) {
          case "heading":
            return (
              <h2 key={block.id} className="text-2xl font-bold mb-4">
                {block.content}
              </h2>
            );
          case "paragraph":
            return (
              <p key={block.id} className="mb-4 text-gray-700 leading-relaxed">
                {block.content}
              </p>
            );
          case "quote":
            return (
              <blockquote
                key={block.id}
                className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-6"
              >
                {block.content}
              </blockquote>
            );
          case "image":
            return (
              <div key={block.id} className="relative w-full h-80 my-6">
                <Image
                  src={block.src!}
                  alt={block.alt || ""}
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
            );
          case "list":
            return (
              <ul key={block.id} className="list-disc pl-6 mb-4 text-gray-700">
                {block.items?.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
