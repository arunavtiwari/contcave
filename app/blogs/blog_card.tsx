import Link from 'next/link'
import Image from 'next/image'
import React from 'react'

const BlogCard = ({ blog }: any) => {

    const truncateBlogDesc = blog.attributes.Description.length > 80 ?
        blog.attributes.Description.substring(0, 80) + "..."
        : blog.attributes.Description;

    const imageURL = blog.attributes.Banner.data[0].attributes.url;

    return (
        <div className='rounded-lg shadow-md p-4 mb-4 overlow-hidden border border-gray-600 cursor-pointer'>
            <Link href={`/blogs/blog/${blog.id}`}>
                <div className='relative w-full h-1' style={{ paddingBottom: "100%" }}>
                    <Image
                        fill={true}
                        style={{ objectFit: "fill" }}
                        src={imageURL}
                        alt={""} />
                </div>

                <div className='p-2'>
                    <h2 className='text-xl font-semibold mb-2 overflow-ellipsis'>
                        {blog.attributes.Title}
                    </h2>
                    <p className='text-gray-600'>{truncateBlogDesc}</p>
                </div>
            </Link>
        </div>
    )
}

export default BlogCard