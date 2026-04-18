import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { getSortedPostsData, groupPostsByCategory } from "@/lib/posts";
import { BRAND_NAME, OG_IMAGE, SITE_URL } from "@/lib/seo";
import { BlogPost } from "@/types/blog";

const DESCRIPTION =
  "Read ContCave's latest articles on studio booking, production workflows, and creative industry insights across India." as const;

export const metadata: Metadata = {
  title: "Blog — Insights, Tips, and Updates",
  description: DESCRIPTION,
  keywords: [
    "ContCave blog",
    "studio booking tips",
    "photography studio guide",
    "production workflow",
    "shoot locations India",
    "content creation tips",
    "studio rental guide",
  ],
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Blog — Insights & Tips",
    description: DESCRIPTION,
    url: `${SITE_URL}/blog`,
    siteName: BRAND_NAME,
    type: "website",
    images: [
      {
        url: `${SITE_URL}${OG_IMAGE}`,
        width: 1200,
        height: 630,
        alt: "ContCave Blog",
      },
    ],
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog — Insights & Tips",
    description: DESCRIPTION,
    site: "@ContCave",
    creator: "@ContCave",
    images: [`${SITE_URL}${OG_IMAGE}`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function BlogPage() {
  const posts: BlogPost[] = getSortedPostsData();
  const grouped = groupPostsByCategory(posts);

  return (
    <main className="max-w mx-auto px-4 py-8">
      <div className="banner mb-8 relative h-64 w-full">
        <Image src="/assets/banner.jpg" fill alt="ContCave Blog — Studio Booking Insights and Tips" className="object-cover" />
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
                  className="block bg-card rounded-2xl border border-border hover:shadow-md transition-all overflow-hidden"
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
                    <p className="text-muted-foreground text-sm mb-2">
                      Published on: {formattedDate}
                    </p>
                    <p className="text-foreground line-clamp-3">
                      {post.meta.description || "Read more about this topic…"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}


