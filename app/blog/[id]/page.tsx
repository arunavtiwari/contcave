import Image from "next/image";
import type { Metadata } from "next";
import { getPostData, getSortedPostsData } from "@/lib/posts";
import { absoluteUrl, BRAND_NAME, OG_IMAGE, SITE_URL } from "@/lib/seo";

const FALLBACK_DESCRIPTION =
  "Insights and stories from ContCave on studios, production workflows, and the creative economy in India.";

type RouteParams = { id: string };

const asciiClean = (value: string | undefined | null): string | undefined =>
  value?.replace(/[^\x20-\x7E]+/g, " ").replace(/\s+/g, " ").trim();

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
    const title = `${post.title} | ${BRAND_NAME} Blog`;

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
      title: `Blog | ${BRAND_NAME}`,
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
    <div className="max-w-3xl mx-auto px-4 py-8 select-text!">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

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

