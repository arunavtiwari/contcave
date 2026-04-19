import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import Container from "@/components/Container";
import PageBanner from "@/components/ui/PageBanner";
import { getSortedPostsData, groupPostsByCategory } from "@/lib/posts";
import { BRAND_NAME, OG_IMAGE, SITE_URL } from "@/lib/seo";
import { BlogPost } from "@/types/blog";

const DESCRIPTION =
  "Read ContCave's latest articles on studio booking, production workflows, and creative industry insights across India." as const;

export const metadata: Metadata = {
  title: "Blogs — Insights, Tips, and Updates",
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
    title: "Blogs — Insights & Tips",
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
    title: "Blogs — Insights & Tips",
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
    <main className="bg-background min-h-screen">
      <PageBanner
        title="Blogs"
        subtitle="Insights, tips, and updates from the ContCave team."
      />

      {/* Blog Cards */}
      <section className="py-20 -mt-10 relative z-20">
        <Container>
          <div className="space-y-20 max-w-6xl mx-auto">
            {Object.entries(grouped).map(([category, posts]) => (
              <section key={category}>
                <h2 className="text-2xl font-bold mb-8 text-foreground pb-4 border-b border-border">
                  {category}
                </h2>

                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
                        className="group block bg-background rounded-2xl border border-border hover:border-primary/20 hover:shadow-xl transition-all duration-300 overflow-hidden"
                      >
                        <div className="relative h-56 overflow-hidden">
                          {post.meta.image && (
                            <Image
                              src={post.meta.image.url}
                              alt={post.title}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          )}
                          <div className="absolute inset-0 bg-linear-to-t from-foreground/60 to-transparent flex items-end p-6">
                            <h3 className="text-background text-lg font-bold leading-tight">
                              {post.title}
                            </h3>
                          </div>
                        </div>

                        <div className="p-6">
                          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-3">
                            {formattedDate}
                          </p>
                          <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
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
        </Container>
      </section>
    </main>
  );
}
