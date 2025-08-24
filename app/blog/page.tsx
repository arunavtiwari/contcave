import Link from "next/link";
import { getSortedPostsData, groupPostsByCategory } from "@/lib/posts";
import { BlogPost } from "@/types/blog";
import Image from "next/image";

export default function BlogPage() {
  const posts: BlogPost[] = getSortedPostsData();
  const grouped = groupPostsByCategory(posts);

  return (
    <div className="max-w mx-auto px-4 py-8">
      <div className="banner mb-8 relative h-64 w-full">
        <Image src="/assets/footer-banner.jpg" fill alt="Banner Image" className="object-cover" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <h1 className="text-white text-4xl font-bold">Blogs</h1>
        </div>
      </div>

      {Object.entries(grouped).map(([category, posts]) => (
        <section key={category} className="mb-12">
          <h2 className="text-2xl font-bold mb-6">{category}</h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map(post => {
              const formattedDate = new Date(post.publishedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              });

              return (
                <Link
                  key={post.id}
                  href={`/blog/${post.id}`}
                  className="block bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all overflow-hidden"
                >
                  <div className="relative h-48">
                    {post.meta.image && (
                      <Image
                        src={post.meta.image.url}
                        alt={post.title}
                        fill
                        className="object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
                      <h2 className="text-white text-lg font-bold text-center">
                        {post.title}
                      </h2>
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="text-gray-500 text-sm mb-2">
                      Published on: {formattedDate}
                    </p>
                    <p className="text-gray-700 line-clamp-3">
                      {post.meta.description || "Read more about this topic…"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}


