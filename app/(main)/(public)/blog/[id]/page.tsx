import type { Metadata } from "next";
import Image from "next/image";

import Container from "@/components/Container";
import { getPostData, getSortedPostsData } from "@/lib/posts";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { absoluteUrl, BRAND_NAME, OG_IMAGE, SITE_URL } from "@/lib/seo";

const FALLBACK_DESCRIPTION =
  "Insights and stories from ContCave on studios, production workflows, and the creative economy in India.";

type RouteParams = { id: string };

const asciiClean = (value: string | undefined | null): string | undefined =>
  value
    ?.replace(/<[^>]*>?/gm, " ") // Strip HTML tags
    .replace(/&#?[a-z0-9]+;/ig, " ") // Strip HTML entities
    .replace(/[^\x20-\x7E]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export async function generateStaticParams() {
  return getSortedPostsData().map((post) => ({ id: post.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const post = getPostData(id);
    const description =
      asciiClean(post.meta?.description) ??
      asciiClean(post.layout?.find((block) => block.blockType === "paragraph")?.content) ??
      FALLBACK_DESCRIPTION;

    const image = absoluteUrl(post.meta?.image?.url ?? OG_IMAGE);
    const published = post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined;
    const updated = post.updatedAt ? new Date(post.updatedAt).toISOString() : published;
    const canonical = `/blog/${id}`;
    const title = post.title;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        type: "article",
        title,
        description,
        url: `${SITE_URL}${canonical}`,
        siteName: BRAND_NAME,
        images: [
          {
            url: image,
            width: 1200,
            height: 630,
            alt: post.title,
          },
        ],
        publishedTime: published,
        modifiedTime: updated,
        locale: "en_IN",
        authors: post.authors?.map((name) => `${SITE_URL}/#author-${name}`) || [BRAND_NAME],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        site: "@ContCave",
        creator: "@ContCave",
        images: [image],
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
  } catch (_error) {
    return {
      title: "Blog",
      description: FALLBACK_DESCRIPTION,
    };
  }
}

export default async function PostPage(props: { params: Promise<RouteParams> }) {
  const { id } = await props.params;
  const post = await getPostData(id);
  const description =
    asciiClean(post.meta?.description) ??
    asciiClean(post.layout?.find((block) => block.blockType === "paragraph")?.content) ??
    FALLBACK_DESCRIPTION;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${SITE_URL}/blog/${id}#article`,
    headline: post.title,
    description,
    image: [absoluteUrl(post.meta?.image?.url ?? OG_IMAGE)],
    author: (post.authors ?? []).map((name) => ({ "@type": "Person", name })),
    publisher: { "@id": `${SITE_URL}/#localbusiness` },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(`/blog/${id}`),
    },
    isPartOf: { "@id": `${SITE_URL}/#website` },
  };

  return (
    <main className="py-section">
      <Container>
        <article className="max-w-4xl mx-auto px-4 select-text! space-y-8">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: safeJsonLd(articleJsonLd) }}
          />

          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
              {post.title}
            </h1>

            <p className="text-muted-foreground text-sm font-medium">
              Published on: {new Date(post.publishedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          {post.meta?.image?.url && (
            <div className="relative w-full h-100 md:h-125">
              <Image
                src={post.meta.image.url}
                alt={post.meta.image.alt || post.title}
                fill
                className="object-cover rounded-2xl border border-border"
                priority
              />
            </div>
          )}

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
        </article>
      </Container>
    </main>
  );
}
