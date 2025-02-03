"use client";

import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import React from "react";
import getCurrentUser from "../actions/getCurrentUser";

export const dynamic = "force-dynamic";

type Props = {};

const CancellationPolicy = async (props: Props) => {
    const currentUser = await getCurrentUser();

    return (
        <ClientOnly>
            <div className="banner">
                <img
                    src="assets\footer-banner.jpg"
                    alt="Banner Image"
                />
                <div className="overlay">
                    <h1 className="banner-text">Cancellation Policy</h1>
                </div>
            </div>

            <Container>
                <div className="pt-10 pb-60">
                    <div className="container mx-auto mt-8 p-8 bg-white shadow-lg space-y-6">
                        <h2 className="text-2xl font-bold text-gray-800">
                            Our Cancellation Policy
                        </h2>

                        <p className="text-gray-700">
                            We understand that plans can change. To ensure transparency and
                            fairness, we have outlined our cancellation policy below. Please
                            read carefully to understand how cancellations are managed on our
                            platform.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800">
                            Cancellation Timeframes
                        </h3>

                        <ul className="list-disc pl-5 space-y-2 text-gray-700">
                            <li>
                                <b>Full Refund:</b> Cancellations made at least <b>48 hours</b> before
                                the scheduled booking.
                            </li>
                            <li>
                                <b>Partial Refund</b>: Cancellations made between <b>24 and 48
                                    hours</b> before the scheduled booking will receive a <b>50% </b>
                                refund.
                            </li>
                            <li>
                                <b>No Refund:</b> Cancellations made <b>within 24 hours</b> of the
                                scheduled booking will not be eligible for a refund.
                            </li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800">
                            Special Considerations
                        </h3>
                        <p className="text-gray-700">
                            In exceptional circumstances such as emergencies or unforeseen
                            events, we may evaluate refund requests on a case-by-case basis.
                            Documentation may be required for such requests.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800">
                            How to Cancel a Booking
                        </h3>
                        <p className="text-gray-700">
                            To cancel a booking, please follow these steps:
                        </p>
                        <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                            <li>Log in to your account on our platform.</li>
                            <li>Navigate to "My Bookings" in your dashboard.</li>
                            <li>Select the booking you wish to cancel.</li>
                            <li>Click the "Cancel Booking" button and follow the prompts.</li>
                            <li>
                                You will receive an email confirmation once the cancellation is
                                processed.
                            </li>
                        </ol>

                        <h3 className="text-xl font-semibold text-gray-800">
                            Refund Process
                        </h3>
                        <p className="text-gray-700">
                            Refunds, if applicable, will be processed back to the original
                            payment method within <b>5-7 business days</b>. Please note that
                            additional processing time may be required depending on your bank
                            or payment provider.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800">
                            Need Help?
                        </h3>
                        <p className="text-gray-700">
                            If you have questions or concerns about cancellations or refunds,
                            please contact our support team at <b>info@contcave.com</b>. We are
                            here to help.
                        </p>
                    </div>
                </div>
            </Container>
        </ClientOnly>
    );
};

export default CancellationPolicy;
