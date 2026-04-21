import Image from 'next/image';
import React, { ChangeEvent, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

export type TermsRef = { generateAndUploadPdf: (listingId: string) => Promise<{ url: string; pdfUrl: string }> };

export interface SignatureMeta {
    url: string;
    thumbnail?: string;
}

interface TermsProps {
    onChange: (checked: boolean) => void;
    onSignature: (meta: SignatureMeta) => void;
    onAgreementPdf: (meta: { url: string; pdfUrl: string }) => void;
    value?: SignatureMeta | null;
    checked?: boolean;
}

const TermsAndConditionsModal = forwardRef<TermsRef, TermsProps>(({ onChange, onSignature, onAgreementPdf, value, checked = false }, ref) => {
    const [agree, setAgree] = useState(checked);
    const [signature, setSignature] = useState<SignatureMeta | null>(value || null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (value) setSignature(value);
    }, [value]);

    useEffect(() => {
        setAgree(checked);
    }, [checked]);

    const handleSignatureFile = async (file: File) => {
        const reader = new FileReader();
        const dataUrl: string = await new Promise((resolve) => {
            reader.onload = () => resolve(String(reader.result || ""));
            reader.readAsDataURL(file);
        });
        const meta = { url: dataUrl };
        setSignature(meta);
        onSignature?.(meta);
    };

    const handleAgreeChange = (event: ChangeEvent<HTMLInputElement>) => {
        setAgree(event.target.checked);
        onChange(event.target.checked);
    };

    const generateAndUploadPdf = async (listingId: string) => {
        try {
            if (!signature?.url) throw new Error("Signature required");
            if (!listingId) throw new Error("Listing ID required");

            const response = await fetch("/api/agreements/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    listingId,
                    signatureUrl: signature.url,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Failed to generate agreement PDF");
            }

            const meta = result.data;
            onAgreementPdf?.(meta);
            return meta;
        } catch (e) {
            console.error("[Terms] Agreement PDF error", e);
            throw e;
        }
    };

    useImperativeHandle(ref, () => ({ generateAndUploadPdf }));

    const S = ({ children }: { children: React.ReactNode }) => (
        <strong className="block mt-5 mb-2 text-sm">{children}</strong>
    );

    const C = ({ children }: { children: React.ReactNode }) => (
        <p className="mb-1.5 text-sm leading-relaxed">{children}</p>
    );

    return (
        <div className="flex justify-center items-center">
            <div className="bg-white w-full max-w-xl mx-auto rounded-lg">
                <div className="px-4">
                    <div ref={containerRef} className="my-4 text-sm" style={{ color: '#000000', backgroundColor: '#ffffff' }}>

                        <p className="mb-4 leading-relaxed">
                            This Agreement (&quot;Agreement&quot;) is entered into between <strong>Arkanet Ventures LLP</strong>, a limited liability partnership registered under the laws of India, having its registered office at SN/317-A, Shanti Nagar, Lucknow, Uttar Pradesh – 226008 (hereinafter referred to as the &quot;Company&quot; or &quot;ContCave&quot;), and the individual or entity (&quot;Host&quot;) who wishes to list their studio, production space, or creative property (&quot;Property&quot; or &quot;Studio&quot;) on the Company&apos;s platform at contcave.com (&quot;Platform&quot;).
                        </p>
                        <p className="mb-4 leading-relaxed">
                            By listing the Property on the Platform, the Host agrees to be bound by the terms and conditions outlined below. This Agreement becomes effective upon the Host completing the listing process and uploading their digital signature.
                        </p>

                        {/* 1 */}
                        <S>1. Definitions</S>
                        <C>1.1 &quot;Booking&quot; means a confirmed reservation made by a Client through the Platform to use the Host&apos;s Studio for a specified date, time, and duration.</C>
                        <C>1.2 &quot;Client&quot; or &quot;Booker&quot; means any individual, company, or entity that books the Studio through the Platform.</C>
                        <C>1.3 &quot;Add-ons&quot; means additional services, equipment, or facilities offered by the Host beyond the base studio rental, including but not limited to lighting setups, makeup rooms, props, assistants, and equipment.</C>
                        <C>1.4 &quot;Booking Value&quot; means the total amount payable by the Client for a Booking, inclusive of studio rental charges and any Add-ons, exclusive of applicable taxes.</C>
                        <C>1.5 &quot;Platform Commission&quot; means the fee charged by the Company at 12% (twelve percent) of the Booking Value, exclusive of GST.</C>
                        <C>1.6 &quot;Payout&quot; means the amount transferred by the Company to the Host after deduction of Platform Commission, applicable taxes, and TDS (if applicable).</C>
                        <C>1.7 &quot;No-Show&quot; means the failure of the Client to arrive at the Studio within the designated booking time without prior cancellation through the Platform.</C>
                        <C>1.8 &quot;Overstay&quot; means the Client&apos;s continued use of the Studio beyond the booked duration without prior approval or extension through the Platform.</C>

                        {/* 2 */}
                        <S>2. Listing and Property Information</S>
                        <C>2.1 The Host agrees to provide accurate, complete, and up-to-date information about the Property, including but not limited to: property type, exact location, carpet area, available amenities, operational days and hours, pricing, studio sets, packages, add-on services, and any rules or restrictions associated with the Property.</C>
                        <C>2.2 All photographs, videos, descriptions, virtual tours, or other content provided by the Host must accurately represent the current condition and offerings of the Property. Misleading or outdated content is grounds for listing suspension.</C>
                        <C>2.3 The Company reserves the right to review, edit, request modifications to, or reject any listing content that does not meet the Platform&apos;s quality standards or is found to be inaccurate or misleading.</C>
                        <C>2.4 The Host must update the listing within 48 hours of any material change to the Property, including changes in pricing, availability, amenities, sets, or operational hours.</C>
                        <C>2.5 The Company reserves the right to verify the Property through physical inspection, video call, or any other means deemed appropriate before or after approval of the listing.</C>

                        {/* 3 */}
                        <S>3. Host Responsibilities</S>
                        <C>3.1 The Host agrees to maintain the Studio in a safe, clean, and professional condition at all times, in compliance with all applicable local laws, regulations, fire safety norms, and building codes.</C>
                        <C>3.2 The Host shall ensure that all equipment, sets, props, lighting, and amenities listed on the Platform are available and in good working condition at the time of each Booking.</C>
                        <C>3.3 The Host agrees to promptly respond to Client inquiries and booking requests within a reasonable timeframe. Consistent failure to respond may result in listing deprioritization or suspension.</C>
                        <C>3.4 The Host shall maintain adequate insurance coverage for the Property and its contents. The Company shall not be liable for any damage to the Host&apos;s property, equipment, or premises except as expressly stated in this Agreement.</C>
                        <C>3.5 The Host is responsible for ensuring compliance with all applicable laws regarding the Property&apos;s use as a commercial rental space, including but not limited to local municipal permissions, fire safety clearances, and noise regulations.</C>
                        <C>3.6 The Host must ensure that the Studio has adequate safety measures including but not limited to fire extinguishers, first-aid kits, clearly marked emergency exits, and electrical safety compliance.</C>

                        {/* 4 */}
                        <S>4. Bookings and Confirmations</S>
                        <C>4.1 The Host agrees to honor all confirmed Bookings made through the Platform and to provide the Client with the agreed-upon studio space, sets, amenities, and services for the booked duration.</C>
                        <C>4.2 For Studios operating on &quot;Approval Required&quot; mode, the Host must accept or decline a booking request within 24 hours of receiving the notification. Failure to respond within this period will be treated as a declined booking, and the Client&apos;s payment will be refunded in full.</C>
                        <C>4.3 The Host shall not solicit Clients to book directly outside the Platform to circumvent the Platform Commission. Any such activity, if discovered, shall be grounds for immediate listing termination and may attract a penalty equivalent to 3x the Commission that would have been applicable.</C>
                        <C>4.4 The Host must not discriminate against any Client on the basis of race, gender, religion, caste, disability, sexual orientation, or any other protected characteristic under Indian law.</C>

                        {/* 5 */}
                        <S>5. Cancellation by Host</S>
                        <C>5.1 If the Host cancels a confirmed Booking, the following consequences shall apply:</C>
                        <C>(a) The Client shall receive a full refund of the Booking amount.</C>
                        <C>(b) The Host&apos;s listing may be deprioritized in search results for a period determined by the Company.</C>
                        <C>(c) If the Host cancels more than 3 (three) confirmed Bookings in a 90-day period, the listing may be temporarily suspended or permanently removed at the Company&apos;s discretion.</C>
                        <C>(d) In case of cancellation within 24 hours of the booking date, the Company may impose a penalty of up to 25% of the Booking Value on the Host, to be adjusted against future payouts.</C>
                        <C>5.2 The Host must cancel through the Platform. Verbal or off-platform cancellations shall not be recognized.</C>

                        {/* 6 */}
                        <S>6. No-Show Policy (Client)</S>
                        <C>6.1 If a Client fails to arrive at the Studio (&quot;No-Show&quot;) within 30 minutes of the booked start time without prior communication, the Host may treat the booking as a No-Show.</C>
                        <C>6.2 In case of a No-Show, the Host retains the full Booking amount. No refund shall be issued to the Client.</C>
                        <C>6.3 The Host must report the No-Show through the Platform within 24 hours of the booking slot for proper documentation and payout processing.</C>

                        {/* 7 */}
                        <S>7. Denial of Service / Right to Refuse</S>
                        <C>7.1 The Host reserves the right to deny entry or discontinue a session if the Client or any member of the Client&apos;s party:</C>
                        <C>(a) Engages in illegal, obscene, or morally objectionable activity on the premises;</C>
                        <C>(b) Brings prohibited items including but not limited to weapons, drugs, narcotics, or illegal substances;</C>
                        <C>(c) Arrives in an intoxicated or disorderly state;</C>
                        <C>(d) Exceeds the maximum headcount (pax limit) specified in the listing without prior approval;</C>
                        <C>(e) Attempts to use the Studio for purposes not disclosed at the time of booking;</C>
                        <C>(f) Engages in behaviour that is threatening, abusive, or unsafe to the Host, Host&apos;s staff, or the Property;</C>
                        <C>(g) Brings minors to the Studio without appropriate adult supervision, where the listing specifies adult-only usage;</C>
                        <C>(h) Violates any House Rules specified in the listing.</C>
                        <C>7.2 In the event the Host denies service under Clause 7.1, the Host must immediately notify the Company through the Platform with supporting evidence (photographs, video, written description). The Company will review the incident and determine the appropriate refund treatment.</C>
                        <C>7.3 If denial of service is found to be justified, the Client shall not be entitled to any refund. If found unjustified, the Company may issue a full refund to the Client and deduct the corresponding amount from the Host&apos;s payout.</C>

                        {/* 8 */}
                        <S>8. Inadequate Service / Service Complaints</S>
                        <C>8.1 If a Client reports that the Studio, equipment, amenities, or services provided were materially different from what was listed on the Platform (&quot;Inadequate Service&quot;), the Company shall investigate the complaint.</C>
                        <C>8.2 The Company may request evidence from both parties including photographs, videos, communications, and booking details.</C>
                        <C>8.3 If the Company determines that Inadequate Service was provided, the following actions may be taken at the Company&apos;s sole discretion:</C>
                        <C>(a) Partial or full refund to the Client, deducted from the Host&apos;s payout;</C>
                        <C>(b) Listing suspension pending correction of the issues;</C>
                        <C>(c) Mandatory listing update with accurate information;</C>
                        <C>(d) Permanent listing removal for repeated violations.</C>
                        <C>8.4 The Host acknowledges that the Company&apos;s decision in service disputes shall be final and binding, subject to the dispute resolution mechanism outlined in this Agreement.</C>

                        {/* 9 */}
                        <S>9. Damage to Studio Property</S>
                        <C>9.1 The Client shall be responsible for any damage caused to the Studio, its equipment, sets, props, or any other property of the Host during the booked session, where such damage is caused by negligence, carelessness, misuse, or deliberate action by the Client or any member of the Client&apos;s party.</C>
                        <C>9.2 Normal wear and tear from standard studio usage shall not constitute damage.</C>
                        <C>9.3 In the event of damage, the Host must: (a) Document the damage with timestamped photographs or video within 24 hours of the booking; (b) Report the damage through the Platform with an estimated cost of repair or replacement; (c) Provide supporting evidence such as before-and-after photographs, repair invoices, or quotations.</C>
                        <C>9.4 The Company shall facilitate communication between the Host and the Client regarding damage claims. The Company shall not be directly liable for damage compensation but may withhold payouts or facilitate resolution at its discretion.</C>
                        <C>9.5 The Host is encouraged to maintain a photographic record of the Studio&apos;s condition before each booking as standard practice.</C>

                        {/* 10 */}
                        <S>10. Overstay and Extended Use</S>
                        <C>10.1 If a Client continues to use the Studio beyond the booked duration without prior extension through the Platform, the Host may: (a) Request the Client to vacate immediately; (b) Charge the Client for the additional time at 1.5x (one and a half times) the standard hourly rate, billed in minimum increments of 30 minutes; (c) Report the overstay through the Platform for billing and documentation purposes.</C>
                        <C>10.2 The Host may refuse entry to the next scheduled Client if the current Client&apos;s overstay prevents timely changeover. In such cases, the overstaying Client shall be liable for any refunds or penalties arising from the disruption.</C>
                        <C>10.3 Any additional charges for overstay shall be processed through the Platform and shall attract the standard Platform Commission.</C>

                        {/* 11 */}
                        <S>11. Force Majeure</S>
                        <C>11.1 Neither the Host nor the Company shall be liable for any failure or delay in performance caused by circumstances beyond their reasonable control, including but not limited to natural disasters, pandemics, government-imposed lockdowns, riots, wars, power outages, internet failures, or acts of God (&quot;Force Majeure Event&quot;).</C>
                        <C>11.2 In the event of a Force Majeure Event that prevents the Host from honoring a Booking: (a) The Host must notify the Company through the Platform as soon as reasonably practicable; (b) The Client shall receive a full refund; (c) No penalty shall be imposed on the Host for cancellation due to a genuine Force Majeure Event.</C>
                        <C>11.3 The Company reserves the right to determine whether an event qualifies as Force Majeure.</C>

                        {/* 12 */}
                        <S>12. Payments and Payouts</S>
                        <C>12.1 The Company collects payment from the Client on behalf of the Host through the Platform&apos;s payment gateway.</C>
                        <C>12.2 The Company shall deduct the Platform Commission (12% of Booking Value) and applicable GST on the commission from the Host&apos;s payout.</C>
                        <C>12.3 Payouts shall be processed monthly, within T+3 business days from the date of the payout invoice.</C>
                        <C>12.4 The Host must provide accurate bank account details and PAN/GSTIN information for payout processing. Payouts cannot be processed without valid banking and tax details.</C>
                        <C>12.5 The Company shall issue a commission invoice to the Host and generate a payout invoice on behalf of the Host as per the invoicing terms agreed upon separately.</C>
                        <C>12.6 TDS Provisions: (a) If the Host is GST-registered, the Host shall deduct TDS @ 2% under Section 194H of the Income Tax Act on the commission amount (exclusive of GST) paid/payable to the Company, where annual commission exceeds ₹20,000. (b) If the Host is not GST-registered and annual payouts exceed ₹30,000, the Company shall deduct TDS @ 2% under Section 194C of the Income Tax Act from the Host&apos;s payout. (c) TDS certificates (Form 16A) shall be issued within the timelines prescribed under the Income Tax Act.</C>

                        {/* 13 */}
                        <S>13. Content Usage and Intellectual Property</S>
                        <C>13.1 The Host grants the Company a non-exclusive, royalty-free, worldwide, perpetual (for the duration of the listing plus 12 months after removal) license to use, reproduce, modify, adapt, publish, translate, distribute, and display the following content for the purpose of operating, promoting, and marketing the Platform and the Host&apos;s listing:</C>
                        <C>(a) All photographs, videos, virtual tours, 360° views, and visual media uploaded by the Host to the Platform;</C>
                        <C>(b) All text descriptions, amenity details, pricing information, and other listing content provided by the Host;</C>
                        <C>(c) Any photographs, videos, or visual content of the Studio that is publicly available on the internet, social media platforms, or third-party websites, provided such content is used solely for the purpose of promoting the Host&apos;s listing on the Platform;</C>
                        <C>(d) Any photographs or videos taken by the Company or its representatives during verification visits, quality inspections, or promotional shoots at the Studio, with or without prior arrangement with the Host.</C>
                        <C>13.2 The Company may use the above content across its website (contcave.com), mobile applications, social media channels (Instagram, LinkedIn, YouTube, Twitter/X, Facebook, and any future platforms), email marketing campaigns, print and digital advertising, press releases, pitch decks, investor presentations, and any other marketing or business development materials.</C>
                        <C>13.3 The Company may edit, crop, resize, overlay text, add branding elements, or otherwise modify the content for marketing purposes, provided such modifications do not materially misrepresent the Studio.</C>
                        <C>13.4 The Host represents and warrants that they own or have obtained all necessary rights, licenses, and permissions for all content provided to the Platform, and that such content does not infringe upon the intellectual property rights, privacy rights, or any other rights of any third party.</C>
                        <C>13.5 The Host shall indemnify the Company against any claims, damages, or liabilities arising from the Host&apos;s content infringing third-party rights.</C>
                        <C>13.6 The Company&apos;s use of the Host&apos;s content shall not entitle the Host to any additional compensation beyond the Payouts received for Bookings.</C>

                        {/* 14 */}
                        <S>14. Prohibited Activities on Host Premises</S>
                        <C>14.1 The Host shall not knowingly permit the following activities on the Studio premises during any booking:</C>
                        <C>(a) Production, distribution, or display of child sexual abuse material (CSAM) or any content involving minors in an exploitative manner;</C>
                        <C>(b) Production of content that promotes violence, terrorism, or hate speech;</C>
                        <C>(c) Storage, consumption, or distribution of illegal drugs or controlled substances;</C>
                        <C>(d) Any activity that violates applicable Indian laws including but not limited to the Information Technology Act, 2000, the Indian Penal Code, and the Narcotic Drugs and Psychotropic Substances Act, 1985;</C>
                        <C>(e) Gambling or betting activities;</C>
                        <C>(f) Unauthorized use of copyrighted music, trademarks, or intellectual property of third parties.</C>
                        <C>14.2 If the Host becomes aware of any prohibited activity during a booking, the Host must immediately terminate the session, request the Client to vacate, and report the incident to the Company and, where required by law, to the appropriate authorities.</C>

                        {/* 15 */}
                        <S>15. Confidentiality</S>
                        <C>15.1 Both parties agree to maintain the confidentiality of all proprietary information, including but not limited to business strategies, financial data, client information, and technology details, disclosed during the course of this Agreement.</C>
                        <C>15.2 The Host shall not disclose any Client&apos;s personal information obtained through the Platform to any third party without the Client&apos;s prior written consent, except as required by law.</C>

                        {/* 16 */}
                        <S>16. Dispute Resolution</S>
                        <C>16.1 In the event of any dispute arising out of or in connection with this Agreement, the parties shall first attempt to resolve the dispute amicably through discussion within 30 days of the dispute arising.</C>
                        <C>16.2 If the dispute is not resolved through amicable discussion, it shall be referred to arbitration under the Arbitration and Conciliation Act, 1996. The arbitration shall be conducted by a sole arbitrator mutually appointed by the parties. The seat and venue of arbitration shall be New Delhi, India.</C>
                        <C>16.3 The arbitration proceedings shall be conducted in English.</C>
                        <C>16.4 The courts of New Delhi shall have exclusive jurisdiction over any matters arising from this Agreement.</C>

                        {/* 17 */}
                        <S>17. Indemnification</S>
                        <C>17.1 The Host agrees to indemnify, defend, and hold harmless the Company, its partners, directors, officers, employees, and agents from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable legal fees) arising from: (a) The Host&apos;s breach of any term of this Agreement; (b) Any claim by a Client related to the condition, safety, or quality of the Studio; (c) Any personal injury, death, or property damage occurring at the Studio during a booking; (d) Any violation of applicable laws by the Host; (e) Any intellectual property infringement arising from the Host&apos;s content.</C>

                        {/* 18 */}
                        <S>18. Limitation of Liability</S>
                        <C>18.1 The Company&apos;s role is limited to providing the Platform as a marketplace connecting Hosts with Clients. The Company does not own, operate, or manage any Studio listed on the Platform.</C>
                        <C>18.2 The Company shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from the use of the Studio by any Client, including but not limited to property damage, personal injury, loss of revenue, or loss of data.</C>
                        <C>18.3 The Company&apos;s total aggregate liability under this Agreement shall not exceed the total Platform Commission received from the Host in the 12 months preceding the event giving rise to the claim.</C>

                        {/* 19 */}
                        <S>19. Termination</S>
                        <C>19.1 Either party may terminate this Agreement by providing 30 days&apos; written notice to the other party via email or through the Platform.</C>
                        <C>19.2 The Company may immediately terminate or suspend a listing without prior notice if: (a) The Host breaches any material term of this Agreement; (b) The Host receives multiple substantiated complaints regarding safety, hygiene, or service quality; (c) The Host engages in fraudulent activity or misrepresentation; (d) Required by law or regulatory authority.</C>
                        <C>19.3 Upon termination: (a) All pending Bookings shall be honored or refunded as determined by the Company; (b) Any pending Payouts shall be processed within 30 days of termination, subject to any deductions for pending disputes or penalties; (c) The Host&apos;s listing shall be removed from the Platform; (d) The content license granted under Clause 13 shall expire 12 months after termination.</C>

                        {/* 20 */}
                        <S>20. General Provisions</S>
                        <C>20.1 This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, or agreements relating to the subject matter.</C>
                        <C>20.2 If any provision of this Agreement is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.</C>
                        <C>20.3 The Company reserves the right to modify this Agreement with 30 days&apos; prior notice to existing Hosts. Continued listing of the Property after the notice period constitutes acceptance of the modified terms.</C>
                        <C>20.4 This Agreement shall be governed by and construed in accordance with the laws of India. Subject to Delhi jurisdiction.</C>
                        <C>20.5 No failure or delay by either party in exercising any right under this Agreement shall operate as a waiver of that right.</C>
                        <C>20.6 The Host may not assign or transfer this Agreement without the prior written consent of the Company. The Company may assign this Agreement to any affiliate or successor entity.</C>

                        <p className="mt-6 mb-2 leading-relaxed">
                            <strong>IN WITNESS WHEREOF</strong>, the Host has executed this Agreement by uploading their digital signature and checking the acceptance box on the Platform.
                        </p>

                        <div className="mb-3 mt-4">
                            <div className="font-semibold text-sm mb-1">Host Signature</div>
                            {!signature ? (
                                <label
                                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-md shadow-sm text-sm font-medium transition"
                                    style={{
                                        color: '#374151',
                                        borderColor: '#d1d5db',
                                        backgroundColor: '#ffffff'
                                    }}
                                >
                                    <span>Upload Signature Image</span>
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) handleSignatureFile(f);
                                        }}
                                        className="hidden"
                                        style={{ display: "none" }}
                                    />
                                </label>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Image
                                        src={signature.thumbnail || signature.url}
                                        alt="Signature"
                                        width={120}
                                        height={60}
                                        unoptimized
                                        style={{ objectFit: 'contain', backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}
                                        className="rounded border"
                                    />
                                </div>
                            )}
                        </div>

                        <p className="font-semibold">Company: Arkanet Ventures LLP</p>
                        <p className="text-xs text-gray-500 mt-1">Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>

                    <div className="flex items-center mb-4">
                        <input
                            id="agreeCheckbox"
                            type="checkbox"
                            checked={agree}
                            onChange={handleAgreeChange}
                            className="h-4 w-4 accent-black bg-gray-100 border-gray-300 rounded-full focus:outline-none focus:ring-transparent cursor-pointer checked:bg-black checked:border-black transition duration-150 ease-in-out"
                        />
                        <label htmlFor="agreeCheckbox" className="ml-2 block text-sm leading-5 text-gray-900">
                            I AGREE TO ALL TERMS AND CONDITIONS
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
});

TermsAndConditionsModal.displayName = 'TermsAndConditionsModal';

export default TermsAndConditionsModal;