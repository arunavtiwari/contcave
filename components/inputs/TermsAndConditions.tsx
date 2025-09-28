import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import Image from 'next/image';

type TermsRef = { generateAndUploadPdf: (folderOverride?: string) => Promise<any> };

const TermsAndConditionsModal = forwardRef<TermsRef, any>(({ onChange, onSignature, onAgreementPdf }: any, ref) => {
    const [agree, setAgree] = useState(false);
    const [signature, setSignature] = useState<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

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

    const handleAgreeChange = (event: any) => {
        setAgree(event.target.checked);
        onChange(event.target.checked);
    };

    const generateAndUploadPdf = async (folderOverride?: string) => {
        try {
            const node = containerRef.current;
            if (!node) return;
            const prevOverflow = node.style.overflow;
            const prevMaxHeight = node.style.maxHeight;
            const prevHeight = node.style.height;
            const prevPaddingBottom = node.style.paddingBottom;
            node.style.overflow = "visible";
            node.style.maxHeight = "none";
            node.style.height = "auto";
            node.style.paddingBottom = "48px";
            (node as any).scrollTop = 0;

            const html2canvas = (await import("html2canvas")).default;
            const { jsPDF } = await import("jspdf");
            console.log("[Terms] Generating canvas...");
            const canvas = await html2canvas(node as HTMLElement, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: (node as HTMLElement).scrollWidth,
                height: (node as HTMLElement).scrollHeight,
            });
            node.style.overflow = prevOverflow;
            node.style.maxHeight = prevMaxHeight;
            node.style.height = prevHeight;
            node.style.paddingBottom = prevPaddingBottom;
            const pdf = new jsPDF("p", "mm", "a4");
            pdf.setProperties({
                title: "Contcave Host Agreement",
                subject: "Terms and Conditions",
                author: "Contcave",
                creator: "Contcave",
            });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgProps = { width: canvas.width, height: canvas.height };
            const marginMm = 12;
            const printableWidth = pageWidth - marginMm * 2;
            const printableHeight = pageHeight - marginMm * 2;
            const scale = printableWidth / imgProps.width;
            const sliceHeightPx = Math.floor(printableHeight / scale);

            let remainingPx = imgProps.height;
            let sourceY = 0;
            while (remainingPx > 0) {
                const currentSlicePx = Math.min(sliceHeightPx, remainingPx);
                const sliceCanvas = document.createElement('canvas');
                sliceCanvas.width = imgProps.width;
                sliceCanvas.height = currentSlicePx;
                const sctx = sliceCanvas.getContext('2d');
                if (sctx) {
                    sctx.fillStyle = '#ffffff';
                    sctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
                    sctx.drawImage(
                        canvas,
                        0,
                        sourceY,
                        imgProps.width,
                        currentSlicePx,
                        0,
                        0,
                        imgProps.width,
                        currentSlicePx
                    );
                }
                const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);
                const sliceHeightMm = currentSlicePx * scale;
                if (sourceY > 0) pdf.addPage();
                pdf.addImage(sliceData, 'JPEG', marginMm, marginMm, printableWidth, sliceHeightMm);
                sourceY += currentSlicePx;
                remainingPx -= currentSlicePx;
            }
            const blob: Blob = pdf.output("blob");
            const dataUrl = await new Promise<string>((resolve) => {
                const fr = new FileReader();
                fr.onload = () => resolve(String(fr.result || ""));
                fr.readAsDataURL(blob);
            });
            console.log("[Terms] PDF blob size:", blob.size, "data URL length:", dataUrl?.length);

            const folder = folderOverride || "agreements";
            const timestamp = Math.floor(Date.now() / 1000);
            const publicId = `agreement-${timestamp}`;
            const paramsToSign: any = { folder, timestamp, public_id: publicId };
            console.log("[Terms] Signing params (raw upload, no preset):", paramsToSign);
            const signRes = await fetch("/api/cloudinary/sign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paramsToSign })
            });
            const sign = await signRes.json();
            console.log("[Terms] Sign response status:", signRes.status, sign);
            if (!signRes.ok || !sign?.signature) throw new Error("Signature failed");

            const cloud = (sign.cloud as string) || (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME as string);
            const apiKey = (sign.apiKey as string) || (process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY as string);
            if (!cloud || !apiKey) throw new Error("Missing Cloudinary client env");

            const fd = new FormData();
            const file = new File([blob], `${publicId}.pdf`, { type: "application/pdf" });
            fd.append("file", file);
            fd.append("folder", folder);
            fd.append("timestamp", String(sign.timestamp));
            fd.append("public_id", publicId);
            fd.append("api_key", apiKey);
            fd.append("signature", sign.signature);

            console.log("[Terms] Uploading to Cloudinary cloud:", cloud, "folder:", folder, "as image/upload (pdf)");
            const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: fd });
            const up = await upRes.json();
            console.log("[Terms] Upload status:", upRes.status, up);
            if (!upRes.ok) {
                const errMsg = up?.error?.message || up?.error || up;
                console.error("[Terms] Cloudinary upload error:", errMsg);
                throw new Error(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
            }
            const meta = { url: up.secure_url, pdfUrl: up.secure_url };
            onAgreementPdf?.(meta);
            return meta;
        } catch (e) {
            console.error("[Terms] Agreement PDF error", e);
            throw e;
        }
    };

    useImperativeHandle(ref, () => ({ generateAndUploadPdf }));

    return (
        <div className=" flex justify-center items-center">
            <div className="bg-white w-full max-w-xl mx-auto rounded-lg overflow-auto" style={{ maxHeight: '90vh' }}>
                <div className="px-4">
                    <div ref={containerRef} className="my-4 text-sm overflow-auto scrollbar-thin" style={{ maxHeight: '65vh' }}>
                        This agreement (&apos;Agreement&apos;) is entered into between CONTCAVE (&apos;Company&apos;), a company registered under the laws of India, and the individual or entity (&apos;Host&apos;) who wishes to list their property (&apos;Property&apos;) on the Company's platform (&apos;Platform&apos;). By listing the Property on the Platform, Host agrees to comply with the terms and conditions outlined in this Agreement.<br /><br />
                        <strong>1. Listing Property</strong><br />
                        1.1 Host agrees to provide accurate and up-to-date information about the Property, including property type, location, amenities, availability, pricing, and any rules or restrictions associated with the Property.<br />
                        1.2 Host acknowledges that any photos, descriptions, or other content provided for the Property listing must accurately represent the Property and may be subject to review by the Company.<br />
                        <strong>2. Host Responsibilities</strong><br /><br />
                        2.1 Host agrees to maintain the Property in a safe and habitable condition, in compliance with all applicable laws, regulations, and building codes.<br />
                        2.2 Host acknowledges responsibility for ensuring that guests comply with any rules, regulations, or restrictions related to the use of the Property.<br />
                        2.3 Host agrees to promptly respond to guest inquiries, booking requests, and any issues or concerns raised by guests during their stay at the Property.<br />
                        <strong> 3. Booking and Payments</strong><br /><br />
                        3.1 Host agrees to honor all bookings made through the Platform and to provide guests with the agreed-upon accommodations and services.<br />
                        3.2 Host acknowledges that the Company may collect payments from guests on behalf of the Host and remit the applicable fees to the Host in accordance with the agreed-upon terms and conditions.<br />
                        <strong>4. Compliance with Laws</strong><br /><br />
                        4.1 Host agrees to comply with all applicable laws, regulations, and ordinances, including but not limited to zoning laws, tax laws, and rental regulations, related to the use and rental of the Property.<br />
                        4.2 Host acknowledges that they are solely responsible for obtaining any necessary permits, licenses, or approvals required for the operation of the Property as a rental accommodation.<br />
                        4.3 If the Property is subject to any legal disputes or restrictions, Host agrees to provide a No Objection Certificate from relevant authorities confirming that there are no objections to renting out the Property.<br />
                        <strong>5. Insurance and Liability</strong><br /><br />
                        5.1 Host acknowledges that they are responsible for obtaining and maintaining appropriate insurance coverage for the Property, including liability insurance, to protect against any losses, damages, or claims arising from the use of the Property by guests.<br />
                        5.2 Host agrees to indemnify and hold harmless the Company, its officers, directors, employees, and agents from any claims, damages, losses, or liabilities arising from the Host's breach of this Agreement or the use of the Property by guests.<br />
                        <strong>6. Termination</strong><br /><br />
                        6.1 This Agreement may be terminated by either party upon written notice to the other party.<br />
                        6.2 Upon termination of this Agreement, Host agrees to remove the Property listing from the Platform and cease all use of the Company's services and resources.<br />
                        <strong>7. Miscellaneous</strong><br /><br />
                        7.1 This Agreement constitutes the entire agreement between the parties regarding the subject matter herein and supersedes all prior or contemporaneous agreements, understandings, or representations, whether written or oral.<br />
                        7.2 This Agreement shall be governed by and construed in accordance with the laws of India, without regard to its conflict of laws principles.<br />
                        IN WITNESS WHEREOF, the parties have executed this Agreement as of<br /><br />

                        <div className="mb-3">
                            <div className="font-semibold text-sm mb-1">Host Signature</div>
                            {!signature ? (
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleSignatureFile(f);
                                    }}
                                    className="text-sm"
                                />
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Image
                                        src={signature.thumbnail || signature.url}
                                        alt="Signature"
                                        width={120}
                                        height={60}
                                        unoptimized
                                        style={{ objectFit: 'contain' }}
                                        className="rounded border bg-white"
                                    />
                                </div>
                            )}
                        </div>

                        CONTCAVE

                    </div>
                    <div className="flex items-center mb-4">
                        <input
                            id="agreeCheckbox"
                            type="checkbox"
                            checked={agree}
                            onChange={handleAgreeChange}
                            className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
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
