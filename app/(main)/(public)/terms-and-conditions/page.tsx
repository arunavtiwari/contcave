import type { Metadata } from "next";
import Image from "next/image";
import React from "react";

import Container from "@/components/Container";
import { BRAND_NAME, OG_IMAGE, SITE_URL } from "@/lib/seo";

const DESCRIPTION =
    "Review the terms, acceptable use, and booking policies that govern access to ContCave's studio marketplace." as const;

export const metadata: Metadata = {
    title: "Terms & Conditions",
    description: DESCRIPTION,
    alternates: { canonical: "/terms-and-conditions" },
    openGraph: {
        title: "Terms & Conditions",
        description: DESCRIPTION,
        url: `${SITE_URL}/terms-and-conditions`,
        siteName: BRAND_NAME,
        type: "article",
        images: [
            {
                url: `${SITE_URL}${OG_IMAGE}`,
                width: 1200,
                height: 630,
                alt: "Terms & Conditions",
            },
        ],
        locale: "en_IN",
    },
    twitter: {
        card: "summary_large_image",
        title: "Terms & Conditions",
        description: DESCRIPTION,
        site: "@ContCave",
        images: [`${SITE_URL}${OG_IMAGE}`],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
        },
    },
};

const SectionTitle = ({ number, title }: { number: number; title: string }) => (
    <h3 className="text-xl font-semibold text-foreground pt-4">
        {number}. {title}
    </h3>
);

const Clause = ({ id, children }: { id: string; children: React.ReactNode }) => (
    <p className="text-muted-foreground text-sm leading-relaxed">
        <span className="font-medium text-foreground">{id}</span> {children}
    </p>
);

const SubList = ({ items }: { items: string[] }) => (
    <div className="pl-6 space-y-1">
        {items.map((item, i) => (
            <p key={i} className="text-muted-foreground text-sm leading-relaxed">
                <span className="font-medium text-foreground">({String.fromCharCode(97 + i)})</span> {item}
            </p>
        ))}
    </div>
);

const TermsAndConditions = () => {
    return (
        <main>
            <div className="relative h-64 w-full">
                <Image
                    src="/assets/banner.jpg"
                    alt="ContCave Terms and Conditions"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <h1 className="text-white text-4xl font-bold">Terms &amp; Conditions</h1>
                </div>
            </div>

            <Container>
                <div className="max-w-3xl mx-auto py-10">
                    <div className="bg-background rounded-2xl shadow-sm border border-border p-6 md:p-8 space-y-5">

                        {/* Preamble */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Effective Date: 1 April 2026</span>
                                <span>•</span>
                                <span>Last Updated: 21 April 2026</span>
                            </div>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                Welcome to ContCave, operated by <strong>Arkanet Ventures LLP</strong> (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), a limited liability partnership registered under the laws of India, with its registered office at SN/317-A, Shanti Nagar, Lucknow, Uttar Pradesh – 226008.
                            </p>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                ContCave is a technology platform that connects studio owners (&quot;Hosts&quot;) with individuals and businesses (&quot;Clients&quot; or &quot;Bookers&quot;) seeking to book creative studio spaces and production facilities (&quot;Studios&quot;) for photography, videography, content creation, and related professional activities.
                            </p>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                By accessing or using the Platform at contcave.com or any associated mobile application, you (&quot;User&quot;, &quot;you&quot;) agree to be bound by these Terms &amp; Conditions (&quot;Terms&quot;). If you do not agree, please do not use the Platform.
                            </p>
                        </div>

                        {/* 1. Eligibility */}
                        <SectionTitle number={1} title="Eligibility" />
                        <div className="space-y-2">
                            <Clause id="1.1">You must be at least <strong>18 years of age</strong> to use the Platform. By using the Platform, you represent and warrant that you are at least 18 years old and have the legal capacity to enter into a binding agreement.</Clause>
                            <Clause id="1.2">If you are using the Platform on behalf of a company, organization, or other legal entity, you represent that you have the authority to bind that entity to these Terms.</Clause>
                            <Clause id="1.3">The Company reserves the right to refuse access to any User who has previously violated these Terms or has been banned from the Platform.</Clause>
                        </div>

                        {/* 2. Accounts */}
                        <SectionTitle number={2} title="Accounts and Registration" />
                        <div className="space-y-2">
                            <Clause id="2.1">You must create an account to book a Studio or list a Property on the Platform. You agree to provide accurate, current, and complete information during registration.</Clause>
                            <Clause id="2.2">You are solely responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.</Clause>
                            <Clause id="2.3">You must immediately notify the Company of any unauthorized use of your account.</Clause>
                            <Clause id="2.4">The Company reserves the right to suspend or terminate any account at its sole discretion, with or without prior notice, for any violation of these Terms.</Clause>
                        </div>

                        {/* 3. Platform Role */}
                        <SectionTitle number={3} title="The Platform - Role and Limitations" />
                        <div className="space-y-2">
                            <Clause id="3.1">ContCave is a marketplace and technology platform only. We facilitate connections between Hosts and Clients. We do not own, operate, manage, or control any Studio listed on the Platform.</Clause>
                            <Clause id="3.2">The Company is not a party to the transaction between the Host and the Client. The contractual relationship for the provision of studio services is solely between the Host and the Client.</Clause>
                            <Clause id="3.3">While we verify listings and Host credentials to the best of our ability, we do not guarantee the accuracy of any listing information, the quality of any Studio, or the conduct of any Host or Client.</Clause>
                            <Clause id="3.4">The Company shall not be held liable for any dispute, damage, injury, loss, or claim arising from the use of any Studio booked through the Platform.</Clause>
                        </div>

                        {/* 4. Bookings */}
                        <SectionTitle number={4} title="Bookings" />
                        <div className="space-y-2">
                            <Clause id="4.1">All bookings are made through the Platform and are subject to availability and confirmation by the Host (for approval-required listings) or automatic confirmation (for instant booking listings).</Clause>
                            <Clause id="4.2">By making a booking, the Client agrees to:</Clause>
                            <SubList items={[
                                "Pay the full booking amount, including applicable GST, at the time of booking;",
                                "Arrive at the Studio at the booked start time;",
                                "Use the Studio only for the purpose disclosed at the time of booking;",
                                "Comply with the Studio's House Rules as specified in the listing;",
                                "Vacate the Studio at the end of the booked duration unless an extension has been arranged and paid for through the Platform."
                            ]} />
                            <Clause id="4.3">A booking confirmation constitutes a binding agreement between the Client and the Host for the specified date, time, duration, and services.</Clause>
                        </div>

                        {/* 5. Payments */}
                        <SectionTitle number={5} title="Payments and Pricing" />
                        <div className="space-y-2">
                            <Clause id="5.1">All payments must be made through the Platform&apos;s secure payment gateway. Off-platform payments are not recognized and are made at the User&apos;s own risk.</Clause>
                            <Clause id="5.2">Prices displayed on the Platform are exclusive of GST unless otherwise specified. GST @ 18% will be added to the booking total at checkout.</Clause>
                            <Clause id="5.3">The total booking amount includes the base studio rental fee, charges for selected sets, add-on services, and applicable taxes.</Clause>
                            <Clause id="5.4">Prices are set by the Host and may vary based on the time of day, day of the week, or special packages. The Company does not control pricing.</Clause>
                            <Clause id="5.5">The Company charges a service fee (Platform Commission) which is deducted from the Host&apos;s payout. This fee is not separately charged to the Client.</Clause>
                            <Clause id="5.6"><strong>GST and Input Tax Credit:</strong></Clause>
                            <SubList items={[
                                "GST is charged on the full booking value under the Company's GSTIN.",
                                "The place of supply for GST purposes is the location (city and state) of the Studio, as per Section 12(3) of the IGST Act, 2017 (services related to immovable property).",
                                "Clients who are GST-registered may claim Input Tax Credit (ITC) on the GST paid, subject to the conditions prescribed under Section 16 of the CGST Act, 2017.",
                                "ITC eligibility is determined by the Client's own GST registration status and compliance. The Company makes no representation regarding the Client's eligibility to claim ITC."
                            ]} />
                        </div>

                        {/* 6. Cancellation */}
                        <SectionTitle number={6} title="Cancellation and Refunds" />
                        <div className="space-y-2">
                            <Clause id="6.1">Cancellation by the Client is subject to the following policy:</Clause>
                            <div className="overflow-x-auto my-3 text-foreground">
                                <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                                    <thead>
                                        <tr className="bg-muted">
                                            <th className="text-left px-4 py-3 font-semibold border-b border-border">Cancellation Timing</th>
                                            <th className="text-left px-4 py-3 font-semibold border-b border-border">Refund</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="px-4 py-3 border-b border-border/50">More than 72 hours before booking start time</td>
                                            <td className="px-4 py-3 text-green-600 font-medium border-b border-border/50">Full refund (100%)</td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-3 border-b border-border/50">Between 24 and 72 hours before booking start time</td>
                                            <td className="px-4 py-3 text-amber-600 font-medium border-b border-border/50">50% refund</td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-3">Less than 24 hours before booking start time</td>
                                            <td className="px-4 py-3 text-destructive font-medium">No refund (0%)</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <Clause id="6.2">Cancellations must be made through the Platform. Verbal, email, or off-platform cancellations are not valid.</Clause>
                            <Clause id="6.3">Refunds, where applicable, will be processed within 7–10 business days to the original payment method.</Clause>
                            <Clause id="6.4">Service fees and payment gateway charges may be non-refundable even where a refund is issued for the booking amount.</Clause>
                            <Clause id="6.5">If the Host cancels a confirmed booking, the Client shall receive a full refund regardless of timing.</Clause>
                        </div>

                        {/* 7. No-Show */}
                        <SectionTitle number={7} title="No-Show Policy" />
                        <div className="space-y-2">
                            <Clause id="7.1">If the Client fails to arrive at the Studio within 30 minutes of the booked start time without prior cancellation through the Platform, it shall be treated as a <strong>No-Show</strong>.</Clause>
                            <Clause id="7.2">In case of a No-Show:</Clause>
                            <SubList items={[
                                "No refund shall be issued to the Client;",
                                "The Host retains the full booking amount;",
                                "The booking time will not be extended or rescheduled."
                            ]} />
                            <Clause id="7.3">If the Client is running late, they should contact the Host directly (contact details are shared upon booking confirmation). The Host may, at their sole discretion, accommodate a late arrival, but is not obligated to extend the session beyond the booked end time.</Clause>
                        </div>

                        {/* 8. Overstay */}
                        <SectionTitle number={8} title="Overstay and Additional Hours" />
                        <div className="space-y-2">
                            <Clause id="8.1">The Client must vacate the Studio at the end of the booked duration. Continued use of the Studio beyond the booked time constitutes an <strong>Overstay</strong>.</Clause>
                            <Clause id="8.2">Additional hours beyond the booked duration will be charged as <strong>per studio policy</strong> the standard hourly rate, billed in minimum increments of 30 minutes.</Clause>
                            <Clause id="8.3">The Host is entitled to request the Client to vacate immediately upon expiry of the booked time. If the Client refuses, the Host may contact the Company and/or local authorities.</Clause>
                            <Clause id="8.4">Any additional charges for overstay will be processed through the Platform and will be billed to the Client separately.</Clause>
                            <Clause id="8.5">The Client shall be liable for any losses, penalties, or refunds arising from their overstay affecting subsequent bookings at the same Studio.</Clause>
                        </div>

                        {/* 9. Conduct */}
                        <SectionTitle number={9} title="Conduct at the Studio" />
                        <div className="space-y-2">
                            <Clause id="9.1">The Client and all members of the Client&apos;s party must conduct themselves in a professional, respectful, and lawful manner at all times while on the Studio premises.</Clause>
                            <Clause id="9.2"><strong>The following activities are strictly prohibited at any Studio booked through the Platform:</strong></Clause>
                            <SubList items={[
                                "Any activity that is illegal under Indian law, including but not limited to drug use, gambling, production of obscene or illegal content, and any activity violating the Information Technology Act, 2000, the Indian Penal Code, or the Narcotic Drugs and Psychotropic Substances Act, 1985;",
                                "Production, storage, or distribution of child sexual abuse material (CSAM) or any exploitative content involving minors;",
                                "Any form of violence, harassment, intimidation, or threatening behaviour towards the Host, Host's staff, or other users of the premises;",
                                "Consumption of alcohol on the Studio premises unless explicitly permitted by the Host in the listing;",
                                "Smoking or vaping inside the Studio unless explicitly permitted;",
                                "Bringing weapons, explosives, or any dangerous items onto the premises;",
                                "Unauthorized use of copyrighted music, trademarks, or intellectual property of third parties during production activities;",
                                "Subletting or transferring the booking to a third party without the Host's prior consent;",
                                "Bringing animals or pets to the Studio unless explicitly permitted in the listing;",
                                "Exceeding the maximum headcount (pax limit) specified in the listing without prior approval from the Host;",
                                "Making structural modifications, drilling, nailing, painting, or permanently altering any part of the Studio;",
                                "Using the Studio for residential or overnight stay purposes."
                            ]} />
                            <Clause id="9.3">The Host reserves the absolute right to deny entry, discontinue a session, or evict the Client and their party from the premises if any of the above violations occur. No refund shall be issued in such cases.</Clause>
                        </div>

                        {/* 10. Damage */}
                        <SectionTitle number={10} title="Damage and Liability" />
                        <div className="space-y-2">
                            <Clause id="10.1">The Client shall be fully responsible for any loss of, or damage to, the Studio premises, equipment, sets, props, furniture, or any other property of the Host caused during the booking by the Client or any member of the Client&apos;s party.</Clause>
                            <Clause id="10.2">&quot;Damage&quot; includes but is not limited to: breakage of equipment or props, staining or tearing of backdrops and fabrics, damage to walls, flooring, or sets, electrical damage caused by unauthorized equipment connections, and damage caused by spills, misuse, or negligence.</Clause>
                            <Clause id="10.3">Normal wear and tear from standard, careful studio usage shall not constitute damage.</Clause>
                            <Clause id="10.4">In the event of damage:</Clause>
                            <SubList items={[
                                "The Host will document the damage with timestamped photographs or video and report it through the Platform within 24 hours;",
                                "The Company will notify the Client and share the Host's damage report;",
                                "The Client shall be liable to pay the reasonable cost of repair or replacement as determined by the Company after reviewing evidence from both parties;",
                                "Damage charges may be collected from the Client's payment method on file, or invoiced separately."
                            ]} />
                            <Clause id="10.5">If the Client disputes the damage claim, the Company shall review the evidence and make a determination at its sole discretion. The Company&apos;s decision shall be final and binding.</Clause>
                            <Clause id="10.6"><strong>The Company (ContCave / Arkanet Ventures LLP) shall not be directly liable for any damage claims.</strong> The Company acts solely as a facilitator between the Host and the Client.</Clause>
                        </div>

                        {/* 11. Right to Refuse */}
                        <SectionTitle number={11} title="Host's Right to Refuse Service" />
                        <div className="space-y-2">
                            <Clause id="11.1">The Host reserves the right to refuse entry or discontinue service to any Client who:</Clause>
                            <SubList items={[
                                "Engages in any prohibited activity listed under Section 9;",
                                "Arrives in an intoxicated, disorderly, or unsafe state;",
                                "Misrepresents the purpose of the booking;",
                                "Brings more people than the maximum pax limit without prior approval;",
                                "Violates the House Rules specified in the listing;",
                                "Behaves in a manner that is threatening, abusive, or disrespectful towards the Host or Host's staff."
                            ]} />
                            <Clause id="11.2">If the Host refuses service for legitimate reasons under this Section, no refund shall be issued to the Client.</Clause>
                            <Clause id="11.3">If the Company determines that the Host&apos;s refusal was unjustified, discriminatory, or in bad faith, the Company may issue a refund to the Client at the Host&apos;s expense.</Clause>
                        </div>

                        {/* 12. Inadequate Service */}
                        <SectionTitle number={12} title="Inadequate Service by Host" />
                        <div className="space-y-2">
                            <Clause id="12.1">If the Client arrives at the Studio and finds that the facilities, equipment, amenities, or services are materially different from what was listed on the Platform, the Client may:</Clause>
                            <SubList items={[
                                "Contact the Company immediately through the Platform's support channel;",
                                "Document the discrepancies with photographs or video;",
                                "Request a partial or full refund."
                            ]} />
                            <Clause id="12.2">The Company shall investigate the complaint and, if the claim is substantiated, may issue a partial or full refund to the Client and take corrective action against the Host&apos;s listing, which may include mandatory updates, suspension, or removal.</Clause>
                            <Clause id="12.3">The Client must report service complaints within 24 hours of the booking date. Complaints raised after this period may not be eligible for refund consideration.</Clause>
                        </div>

                        {/* 13. Force Majeure */}
                        <SectionTitle number={13} title="Force Majeure" />
                        <div className="space-y-2">
                            <Clause id="13.1">Neither party shall be liable for failure to perform obligations under these Terms due to events beyond their reasonable control, including but not limited to: natural disasters, pandemics, epidemics, government-imposed lockdowns or curfews, riots, civil unrest, wars, terrorist acts, power failures, internet outages, or acts of God.</Clause>
                            <Clause id="13.2">In the event of Force Majeure affecting a booking:</Clause>
                            <SubList items={[
                                "The affected party must notify the Company as soon as reasonably practicable;",
                                "The Client shall receive a full refund or credit for a future booking, at the Company's discretion;",
                                "Neither the Host nor the Client shall be penalized for cancellations arising from Force Majeure events."
                            ]} />
                        </div>

                        {/* 14. Reviews */}
                        <SectionTitle number={14} title="Reviews and Ratings" />
                        <div className="space-y-2">
                            <Clause id="14.1">Clients may leave reviews and ratings for Studios after completing a booking. Reviews must be honest, factual, and based on the Client&apos;s genuine experience.</Clause>
                            <Clause id="14.2">Reviews that contain defamatory content, personal attacks, discriminatory language, or content unrelated to the booking experience may be removed by the Company at its discretion.</Clause>
                            <Clause id="14.3">Hosts may respond to reviews through the Platform. Hosts may not offer incentives or threaten Clients in exchange for favorable reviews.</Clause>
                            <Clause id="14.4">The Company does not edit or censor reviews except as stated in Clause 14.2 and reserves the right to remove reviews that violate these Terms.</Clause>
                        </div>

                        {/* 15. IP */}
                        <SectionTitle number={15} title="Intellectual Property" />
                        <div className="space-y-2">
                            <Clause id="15.1">All content on the Platform, including but not limited to text, graphics, logos, icons, images, software, and compilations - is the property of Arkanet Ventures LLP or its content suppliers and is protected by Indian and international intellectual property laws.</Clause>
                            <Clause id="15.2">Users may not copy, reproduce, distribute, modify, or create derivative works from any Platform content without prior written consent from the Company.</Clause>
                            <Clause id="15.3">&quot;ContCave&quot; and associated logos and trademarks are the property of Arkanet Ventures LLP. Unauthorized use is strictly prohibited.</Clause>
                        </div>

                        {/* 16. Privacy */}
                        <SectionTitle number={16} title="Privacy and Data" />
                        <div className="space-y-2">
                            <Clause id="16.1">The collection, use, and protection of personal data is governed by our Privacy Policy, available at <a href="/privacy-policy" className="text-blue-600 underline">contcave.com/privacy-policy</a>.</Clause>
                            <Clause id="16.2">By using the Platform, you consent to the collection and processing of your personal data as described in our Privacy Policy.</Clause>
                            <Clause id="16.3">The Company shall not sell, rent, or share your personal information with third parties except as necessary to operate the Platform, comply with legal obligations, or as described in our Privacy Policy.</Clause>
                        </div>

                        {/* 17. Disclaimers */}
                        <SectionTitle number={17} title="Disclaimers" />
                        <div className="space-y-2">
                            <Clause id="17.1">The Platform is provided on an &quot;as is&quot; and &quot;as available&quot; basis. The Company makes no warranties, express or implied, regarding the Platform&apos;s availability, accuracy, reliability, or suitability for any particular purpose.</Clause>
                            <Clause id="17.2">The Company does not warrant that the Platform will be uninterrupted or error-free, that any defects will be corrected, or that the Platform is free of viruses or other harmful components.</Clause>
                            <Clause id="17.3">The Company does not endorse, guarantee, or assume responsibility for any Studio, Host, Client, or third-party service advertised or offered through the Platform.</Clause>
                        </div>

                        {/* 18. Limitation of Liability */}
                        <SectionTitle number={18} title="Limitation of Liability" />
                        <div className="space-y-2">
                            <Clause id="18.1">To the maximum extent permitted by applicable law, the Company, its partners, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to: loss of revenue, loss of data, loss of business opportunity, personal injury, or property damage, arising from or related to the use of the Platform or any Studio booked through the Platform.</Clause>
                            <Clause id="18.2">The Company&apos;s total aggregate liability to any User for any claim arising under these Terms shall not exceed the total amount paid by that User to the Company in the 12 months preceding the event giving rise to the claim.</Clause>
                            <Clause id="18.3">The Client acknowledges that the use of any Studio is at the Client&apos;s own risk. The Company is not responsible for the actions, omissions, or negligence of any Host.</Clause>
                        </div>

                        {/* 19. Indemnification */}
                        <SectionTitle number={19} title="Indemnification" />
                        <div className="space-y-2">
                            <Clause id="19.1">You agree to indemnify, defend, and hold harmless the Company, its partners, directors, officers, employees, and agents from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising from:</Clause>
                            <SubList items={[
                                "Your use of the Platform or any Studio;",
                                "Your violation of these Terms;",
                                "Your violation of any applicable law or regulation;",
                                "Any claim by a third party arising from your actions or omissions;",
                                "Any damage caused by you to a Host's property."
                            ]} />
                        </div>

                        {/* 20. Termination */}
                        <SectionTitle number={20} title="Termination" />
                        <div className="space-y-2">
                            <Clause id="20.1">The Company may suspend or terminate your account and access to the Platform at any time, with or without cause, with or without notice.</Clause>
                            <Clause id="20.2">Upon termination, any pending bookings may be cancelled, and refunds will be processed in accordance with the Cancellation Policy.</Clause>
                            <Clause id="20.3">Sections that by their nature should survive termination (including Limitation of Liability, Indemnification, and Dispute Resolution) shall survive.</Clause>
                        </div>

                        {/* 21. Dispute Resolution */}
                        <SectionTitle number={21} title="Dispute Resolution" />
                        <div className="space-y-2">
                            <Clause id="21.1">In the event of any dispute arising out of or in connection with these Terms, the parties shall first attempt to resolve the dispute amicably through the Company&apos;s support channels within 30 days.</Clause>
                            <Clause id="21.2">If the dispute is not resolved amicably, it shall be referred to arbitration under the Arbitration and Conciliation Act, 1996, conducted by a sole arbitrator mutually agreed upon. The seat and venue of arbitration shall be New Delhi, India.</Clause>
                            <Clause id="21.3">The arbitration proceedings shall be conducted in English.</Clause>
                            <Clause id="21.4">The courts of New Delhi, India shall have exclusive jurisdiction.</Clause>
                        </div>

                        {/* 22. Modifications */}
                        <SectionTitle number={22} title="Modifications" />
                        <div className="space-y-2">
                            <Clause id="22.1">The Company reserves the right to modify these Terms at any time. Updated Terms will be posted on the Platform with the revised &quot;Last Updated&quot; date.</Clause>
                            <Clause id="22.2">Your continued use of the Platform after any modification constitutes your acceptance of the updated Terms.</Clause>
                            <Clause id="22.3">For material changes, the Company will make reasonable efforts to notify registered Users via email or in-app notification at least 15 days before the changes take effect.</Clause>
                        </div>

                        {/* 23. Grievance Officer */}
                        <SectionTitle number={23} title="Grievance Officer" />
                        <div className="space-y-2">
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                In accordance with the Information Technology Act, 2000, and the Consumer Protection Act, 2019, the Grievance Officer for the Platform is:
                            </p>
                            <div className="bg-muted rounded-lg p-4 text-sm text-foreground space-y-1 border border-border">
                                <p><strong>Name:</strong> Arunav Tiwari</p>
                                <p><strong>Email:</strong> info@contcave.com</p>
                                <p><strong>Address:</strong> SN/317-A, Shanti Nagar, Lucknow, Uttar Pradesh – 226008</p>
                            </div>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                The Grievance Officer shall acknowledge complaints within 48 hours and endeavour to resolve them within 30 days.
                            </p>
                        </div>

                        {/* 24. Contact */}
                        <SectionTitle number={24} title="Contact" />
                        <div className="space-y-2">
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                For any questions regarding these Terms, please contact us at:
                            </p>
                            <div className="bg-muted rounded-lg p-4 text-sm text-foreground space-y-1 border border-border">
                                <p><strong>Email:</strong> info@contcave.com</p>
                                <p><strong>Address:</strong> Arkanet Ventures LLP, SN/317-A, Shanti Nagar, Lucknow, Uttar Pradesh – 226008</p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-border pt-4 mt-6">
                            <p className="text-xs text-muted-foreground text-center">
                                These Terms &amp; Conditions are governed by the laws of India. Subject to Delhi jurisdiction.
                            </p>
                        </div>

                    </div>
                </div>
            </Container>
        </main>
    );
};

export default TermsAndConditions;
