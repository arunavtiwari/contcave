// app/(my-app)/blogs/[slug]/page.tsx

import { notFound } from 'next/navigation';

async function fetchPost(slug: string) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/posts?where[slug][equals]=${slug}`, {
        next: { revalidate: 60 },
    });

    if (!res.ok) {
        throw new Error('Failed to fetch post');
    }

    const data = await res.json();
    return data.docs[0];
}

export default async function BlogPostPage(props: { params: { slug: string } }) {
    const { params } = await props;
    const post = await fetchPost(params.slug);

    if (!post) {
        notFound();
    }

    return (
        <article className="prose lg:prose-xl mx-auto p-6">
            <h1>{post.title}</h1>
            {post.featuredImage?.url && (
                <img src={post.featuredImage.url} alt={post.title} className="w-full rounded-lg" />
            )}
            <p className="text-gray-500">
                Published on {new Date(post.publishedDate).toLocaleDateString()}
            </p>
            <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </article>
    );
}
