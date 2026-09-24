import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import Container from "@/components/layout/Container";
import JsonLd from "@/components/seo/JsonLd";
import Heading from "@/components/ui/Heading";
import PageBanner from "@/components/ui/PageBanner";
import { getBlogGradient } from "@/lib/blogGradient";
import { getStudiosForPost } from "@/lib/blogStudios";
import { getPostData, getSortedPostsData } from "@/lib/posts";
import { truncateText } from "@/lib/richText";
import {
  absoluteUrl,
  BRAND_NAME,
  breadcrumbJsonLd,
  META_DESCRIPTION_LENGTH,
  OG_IMAGE,
  SITE_URL,
  toPlainText,
} from "@/lib/seo";
import { formatISTDate } from "@/lib/utils";
import type { BlogPost } from "@/types/blog";

const FALLBACK_DESCRIPTION =
  "Insights and stories from ContCave on studios, production workflows, and the creative economy in India.";

export const revalidate = 3600;

type RouteParams = { id: string };

const TEAM_BYLINE = /editorial|team|contcave/i;

const ORGANIZATION_AUTHOR = { "@type": "Organization", name: BRAND_NAME, "@id": `${SITE_URL}/#organization` };

const authorsJsonLd = (post: BlogPost) => {
  const names = post.authors ?? [];
  if (!names.length || names.every((name) => TEAM_BYLINE.test(name))) return [ORGANIZATION_AUTHOR];
  return names.map((name) => (TEAM_BYLINE.test(name) ? ORGANIZATION_AUTHOR : { "@type": "Person", name }));
};

const describePost = (post: BlogPost) =>
  truncateText(
    toPlainText(post.meta?.description) ??
    toPlainText(post.layout?.find((block) => block.blockType === "paragraph")?.content) ??
    FALLBACK_DESCRIPTION,
    META_DESCRIPTION_LENGTH
  );

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
    const description = describePost(post);

    const image = absoluteUrl(post.meta?.image?.url ?? OG_IMAGE);
    const published = post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined;
    const updated = post.updatedAt ? new Date(post.updatedAt).toISOString() : published;
    const canonical = `/blog/${id}`;
    const title = post.title;

    return {
      title,
      description,
      keywords: post.tags?.length ? post.tags : undefined,
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
  let post: BlogPost;
  try {
    post = getPostData(id);
  } catch {
    notFound();
  }
  const description = describePost(post);
  const { studios, city } = await getStudiosForPost(post);
  const postUrl = absoluteUrl(`/blog/${id}`);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${SITE_URL}/blog/${id}#article`,
    headline: post.title,
    description,
    image: [absoluteUrl(post.meta?.image?.url ?? OG_IMAGE)],
    author: authorsJsonLd(post),
    publisher: { "@id": `${SITE_URL}/#organization` },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    keywords: post.tags?.length ? post.tags.join(", ") : undefined,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postUrl,
    },
    isPartOf: { "@id": `${SITE_URL}/#website` },
  };

  const breadcrumbs = breadcrumbJsonLd(
    [{ name: "Home", href: "/" }, { name: "Blog", href: "/blog" }, { name: post.title }],
    postUrl
  );

  const formattedDate = formatISTDate(post.publishedAt);

  return (
    <main className="bg-background min-h-screen">
      <JsonLd id={`blog-article-${id}`} data={[articleJsonLd, breadcrumbs]} />

      <PageBanner
        title={post.title}
        subtitle={`Published on: ${formattedDate}`}
        image={post.meta?.image?.url}
        gradient={getBlogGradient(post.id)}
      />

      {/* Article Content */}
      <section className="py-20 -mt-10 relative z-20">
        <Container>
          <article className="bg-background rounded-3xl border border-border p-8 md:p-12 lg:p-16 shadow-sm max-w-5xl mx-auto space-y-8">
            {post.layout.map((block) => {
              switch (block.blockType) {
                case "heading":
                  return (
                    <Heading
                      key={block.id}
                      title={block.content}
                      as="h2"
                      variant="h4"
                      className="text-foreground"
                    />
                  );
                case "paragraph":
                  return (
                    <p key={block.id} className="text-foreground/80 leading-relaxed">
                      {block.content}
                    </p>
                  );
                case "quote":
                  return (
                    <blockquote
                      key={block.id}
                      className="border-l-4 border-foreground pl-6 py-2 italic text-foreground bg-foreground/5 rounded-r-lg"
                    >
                      {block.content}
                    </blockquote>
                  );
                case "image":
                  return (
                    <div key={block.id} className="relative w-full h-80 md:h-100 group overflow-hidden rounded-2xl border border-border">
                      <Image
                        src={block.src!}
                        alt={block.alt || ""}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  );
                case "list":
                  return (
                    <ul key={block.id} className="list-disc pl-6 space-y-2 text-foreground/80">
                      {block.items?.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  );
                default:
                  return null;
              }
            })}

            {post.tags?.length ? (
              <div className="pt-8 border-t border-border">
                <Heading title="Related Topics" variant="h6" className="text-foreground mb-4" />
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full bg-foreground/5 border border-border text-foreground/70 text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </article>

          {studios.length ? (
            <section aria-labelledby="blog-studios-heading" className="max-w-5xl mx-auto mt-12">
              <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <Heading
                  id="blog-studios-heading"
                  title="Studios for this shoot"
                  as="h2"
                  variant="h4"
                  className="text-foreground"
                />
                {city ? (
                  <Link href={city.href} className="text-sm font-medium text-foreground underline underline-offset-4">
                    Browse all studios in {city.name}
                  </Link>
                ) : null}
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {studios.map((studio) => (
                  <li key={studio.id}>
                    <Link
                      href={studio.href}
                      className="group block overflow-hidden rounded-2xl border border-border bg-background"
                    >
                      {studio.image ? (
                        <div className="relative aspect-4/3 w-full overflow-hidden">
                          <Image
                            src={studio.image}
                            alt={studio.title}
                            fill
                            sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      ) : null}
                      <div className="p-4 space-y-1">
                        <p className="font-semibold text-foreground line-clamp-2">{studio.title}</p>
                        <p className="text-sm text-foreground/60">
                          {[studio.kind, studio.city].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </Container>
      </section>
    </main>
  );
}
