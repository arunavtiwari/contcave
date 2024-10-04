// components/Blog/getBlogData.ts
import axios from "axios";
import { BlogPost } from "@/types/blog";

const getBlogData = async (): Promise<BlogPost[]> => {
    try {
        const response = await axios.get(`${process.env.PAYLOAD_API_URL}/api/posts?limit=3`, {
            headers: {
                "Content-Type": "application/json",
            },
            params: {
                draft: false, // You can pass query parameters this way
            },
        });

        const data = response.data;
        console.log("Fetched blog data:", data);


        return data.docs as BlogPost[];
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("Error fetching blog data:", error.response?.status, error.response?.data);
        } else {
            console.error("Unknown error fetching blog data:", error);
        }
        return [];
    }
};

export default getBlogData;
