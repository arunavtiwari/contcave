import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import React from "react";
import getCurrentUser from "../actions/getCurrentUser";
export const dynamic = "force-dynamic"

type Props = {};

const About = async (props: Props) => {
    const currentUser = await getCurrentUser();

    return (
        <ClientOnly>
            <div className="banner">
                <img src="/assets/footer-banner.jpg" alt="Banner Image" />
                <div className="overlay">
                    <h1 className="banner-text">About Us</h1>
                </div>
            </div>
            <Container>
                <div className="pt-10 pb-60">
                    <div className="container mx-auto mt-8 p-8 bg-white shadow-lg border-2 border-gray-200 rounded-lg">

                        <p className="text-gray-700">
                            Welcome to Contcave, a beacon of creativity and innovation in the digital content creation landscape. Our platform is designed to empower content creators, offering them the tools, spaces, and connections needed to bring their visions to life. At the heart of our mission lies the commitment to fostering a vibrant community where storytelling and visual creativity flourish.
                        </p>
                        <p className="text-gray-700 mt-4">
                            Our vision is to revolutionize the way content is created, shared, and experienced. By simplifying access to high-quality studios, cutting-edge equipment, and exceptional talent, we aim to eliminate the barriers that creators face, enabling them to focus on what they do best: creating inspiring and impactful content.
                        </p>
                        <p className="text-gray-700 mt-4">
                            At Contcave, we&apos;re not just about providing services; we&apos;re about building connections. We connect creators with the resources they need, from studio bookings and equipment rentals to talent hiring. But beyond that, we strive to connect ideas with opportunities, vision with execution, and creativity with audiences worldwide.
                        </p>
                        <p className="text-gray-700 mt-4">
                            Join us on this journey of innovation and creativity. Whether you&apos;re a seasoned content creator or just starting out, Contcave is here to support you every step of the way. Together, we can redefine the creative process and celebrate the power of storytelling in all its forms.
                        </p>
                    </div>
                </div>
            </Container>
        </ClientOnly>
    );
};

export default About;
