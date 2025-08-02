// app/(my-app)/blogs/page.tsx

import Link from 'next/link';

async function fetchPosts() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/posts?limit=10`, {
        next: { revalidate: 60 }, 
    });

    if (!res.ok) {
        throw new Error('Failed to fetch posts');
    }

    const data = await res.json();
    return data.docs; 
}

export default async function BlogsPage() {
    const posts = await fetchPosts();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {posts.map((post: any) => (
                <Link key={post.id} href={`/blogs/${post.slug}`}>
                    <div className="border rounded-lg overflow-hidden shadow hover:shadow-lg transition">
                        {post.featuredImage?.url && (
                            <img
                                src={post.featuredImage.url}
                                alt={post.title}
                                className="w-full h-48 object-cover"
                            />
                        )}
                        <div className="p-4">
                            <h2 className="text-xl font-semibold">{post.title}</h2>
                            <p className="text-gray-600 mt-2">
                                {new Date(post.publishedDate).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}
