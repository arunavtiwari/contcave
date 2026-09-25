import type { Metadata } from "next";

import Container from "@/components/layout/Container";
import JsonLd from "@/components/seo/JsonLd";
import PageBanner from "@/components/ui/PageBanner";
import { getSortedPostsData, groupPostsByCategory, toBlogCard } from "@/lib/posts";
import { absoluteUrl, BRAND_NAME, OG_IMAGE, SITE_URL } from "@/lib/seo";
import { BlogPost } from "@/types/blog";

const DESCRIPTION =
  "Read ContCave's latest articles on studio booking, production workflows, and creative industry insights across India." as const;

export const metadata: Metadata = {
  title: "Blogs: Insights, Tips, and Updates",
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
    title: "Blogs: Insights & Tips",
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
    title: "Blogs: Insights & Tips",
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

import BlogItem from "@/components/blog/BlogItem";
import Heading from "@/components/ui/Heading";

export default function BlogPage() {
  const posts: BlogPost[] = getSortedPostsData();
  const grouped = groupPostsByCategory(posts);

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${SITE_URL}/blog#blog`,
    url: `${SITE_URL}/blog`,
    name: `${BRAND_NAME} Blog`,
    description: DESCRIPTION,
    inLanguage: "en-IN",
    publisher: { "@id": `${SITE_URL}/#organization` },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      "@id": `${SITE_URL}/blog/${post.id}#article`,
      headline: post.title,
      url: absoluteUrl(`/blog/${post.id}`),
      description: post.meta?.description,
      image: post.meta?.image?.url ? absoluteUrl(post.meta.image.url) : undefined,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt ?? post.publishedAt,
    })),
  };

  return (
    <main className="bg-background min-h-screen">
      <JsonLd id="blog-jsonld" data={blogJsonLd} />
      <PageBanner
        title="Blogs"
        subtitle="Insights, tips, and updates from the ContCave team."
      />

      {/* Blog Cards */}
      <section className="py-20 -mt-10 relative z-20">
        <Container>
          <div className="space-y-24 max-w-6xl mx-auto ">
            {Object.entries(grouped).map(([category, posts]) => (
              <section key={category} className="flex flex-col gap-6">
                <Heading
                  title={category}
                  variant="h4"
                  className="uppercase"
                />

                <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
                  {posts.map(post => (
                    <BlogItem key={post.id} post={toBlogCard(post)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Container>
      </section>
    </main>
  );
}
