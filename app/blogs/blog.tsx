"use client"
import React, { useContext } from 'react';
import { CategoryContext } from '../context/CategoryContext';
import BlogCard from './blog_card';

const Blogs = ({ blogs }: any) => {
    const { category } = useContext(CategoryContext);
    const filteredBlogs = blogs.data.filter((blog: any) => {
        return blog.attributes.categories.data.some(
            (cat: any) => cat.attributes.Title == category
        );
    });

    if (!filteredBlogs.length) {
        return <center><div>Blogs coming soon</div></center>;
    }

    return (
        <div className='grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4'>
            {filteredBlogs.map((blog: any) => (
                <div key={blog.id}>
                    <BlogCard blog={blog} />
                </div>
            ))}
        </div>
    );
}

export default Blogs;
