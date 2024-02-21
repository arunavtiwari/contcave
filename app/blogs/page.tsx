import React from 'react'
import Categories from './categories';
import Blogs from './blog';
import { CategoryProvider } from "../context/CategoryContext"


async function fetchCategories() {
    const options = {
        next: { revalidate: 60 },
        headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_STRAPI_API_TOKEN}`

        }
    }

    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/categories`, options);
        const response = await res.json();
        return response;
    } catch (error) {
        console.error(error)
    }
}

async function fetchBlogs() {

    const options = {
        next: { revalidate: 60 },
        headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_STRAPI_API_TOKEN}`

        }
    }

    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/blogs?populate=*`, options);
        const response = await res.json();
        return response;
    } catch (error) {
        console.error(error)
    }
}


export default async function BlogPage() {
    const categories = await fetchCategories();
    const blogs = await fetchBlogs();
    return (
        <div>
            <CategoryProvider>
                <div className="banner">
                    <img src="https://anandamclarksinn.com/upload/8724.jpg" alt="Banner Image" />
                    <div className="overlay">
                        <h1 className="banner-text">Blogs</h1>
                    </div>
                </div>
                <div className='pt-10 p-6'>
                    <Categories categories={categories} />
                    <Blogs blogs={blogs} /></div>
            </CategoryProvider>
        </div>
    )
}