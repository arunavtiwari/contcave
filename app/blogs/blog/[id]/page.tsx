import Link from 'next/link'
import React from 'react'
import Image from 'next/image'
import markdownToHtml from '../../convertor';

async function fetchBlogs(id: number) {
    const options = {
        next: { revalidate: 60 },
        headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_STRAPI_API_TOKEN}`

        }
    }
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/blogs/${id}?populate=*`, options);
        const response = await res.json();
        console.log({ response })
        return response;
    } catch (error) {
        console.error(error)
    }
}


const page = async ({ params }: any) => {
    const blog = await fetchBlogs(params.id)
    const imageURL = blog.data.attributes.Banner.data[0].attributes.url;
    const bodyText = await markdownToHtml(blog.data.attributes.Description);
    return (
        <div className='max-w-3xl mx-auto p-4 pt-10'>
            <Link href={"/blogs"}> {"< Back"}</Link>
            <div className='relative w-full h-96 overflow-hidden rounded-lg mt-5'>
                <Image
                    fill={true}
                    style={{ objectFit: "cover" }}
                    src={imageURL}
                    alt={""} />
            </div>
            <div className='pt-6'>
                <h1 className="text-3xl font-semibold">{blog.data.attributes.Title}</h1>
                <div className='text-gray-600 mt-2' dangerouslySetInnerHTML={{ __html: bodyText }}></div>
                <div className='mt-4 flex items-center text-gray-400'>
                    <span className='text-sm'>
                        Published on {" "} {new Date(blog.data.attributes.publishedAt).toLocaleString()}

                    </span>
                </div>
            </div>
        </div>
    )
}

export default page