"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { BsFileEarmarkPdf } from "react-icons/bs";
import { FiX } from "react-icons/fi";
import { toast } from "react-toastify";

import ImageUpload from './ImageUpload';

export interface VerificationDocument {
    file?: File;
    original_filename: string;
    bytes: number;
    format: string;
    resource_type: string;
    previewUrl?: string;
    public_id?: string;
    version?: number;
    thumbnail?: string;
    url?: string;
}

export interface VerificationPayload {
    documents: VerificationDocument[];
    code?: string;
}

interface Props {
    onVerification: (data: VerificationPayload) => void;
    initialDocuments?: VerificationDocument[];
}

const MAX_DOCUMENTS = 10;

const SpaceVerification: React.FC<Props> = ({ onVerification, initialDocuments = [] }) => {
    const [documents, setDocuments] = useState<VerificationDocument[]>(initialDocuments);

    const notifyParent = useCallback((docs: VerificationDocument[]) => {
        onVerification({
            documents: docs,
            code: ''
        });
    }, [onVerification]);

    const isInitialized = React.useRef(false);
    useEffect(() => {
        if (!isInitialized.current && initialDocuments.length > 0) {
            setDocuments(initialDocuments);
            isInitialized.current = true;
        }
    }, [initialDocuments]);

    const uploadedDocsRef = React.useRef<HTMLDivElement>(null);

    const handleFilesChange = useCallback((files: File[]) => {
        if (documents.length + files.length > MAX_DOCUMENTS) {
            toast.error(`Maximum ${MAX_DOCUMENTS} documents allowed`);
            return;
        }

        const mapped: VerificationDocument[] = files.map((f) => ({
            file: f,
            original_filename: f.name,
            bytes: f.size,
            format: 'pdf',
            resource_type: 'raw',
            previewUrl: URL.createObjectURL(f),
        }));

        const nextDocs = [...documents, ...mapped];
        setDocuments(nextDocs);
        notifyParent(nextDocs);
        toast.success(`${files.length} document(s) added.`);

        // Scroll to the uploaded documents section
        setTimeout(() => {
            uploadedDocsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }, [documents, notifyParent]);

    const removeDocument = useCallback((index: number) => {
        const doc = documents[index];
        if (doc.previewUrl) {
            URL.revokeObjectURL(doc.previewUrl);
        }
        const updatedDocs = documents.filter((_, i) => i !== index);
        setDocuments(updatedDocs);
        notifyParent(updatedDocs);
        toast.info("Document removed");
    }, [documents, notifyParent]);

    useEffect(() => {
        return () => {
            documents.forEach((doc) => {
                if (doc.previewUrl) {
                    URL.revokeObjectURL(doc.previewUrl);
                }
            });
        };
    }, [documents]);

    return (
        <div className="flex flex-col gap-6">
            <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Instructions */}
                    <div className="flex flex-col gap-4">
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Required Documents</h4>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                To verify your ownership or authority to rent this space, please upload
                                <span className="font-medium text-gray-700"> at least one </span>
                                of the following documents.
                            </p>
                        </div>

                        <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-100">
                            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Accepted Documents</h5>
                            <ul className="space-y-2.5">
                                {[
                                    "Property Deed",
                                    "Rental Agreement",
                                    "Utility Bills (Electricity/Water/Gas)",
                                    "No Objection Certificate (NOC)"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                                        <div className="w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="text-xs text-gray-400 mt-auto">
                            * Max file size: 10MB. Supported format: PDF.
                        </div>
                    </div>

                    {/* Right Column: Upload Area */}
                    <div className="flex flex-col gap-4 h-full">
                        <div className="flex-1 min-h-[200px]">
                            <ImageUpload
                                onChange={() => { }}
                                values={[]}
                                deferUpload
                                onFilesChange={handleFilesChange}
                                allowedTypes={['application/pdf']}
                                label="Click to upload PDF"
                                icon={BsFileEarmarkPdf}
                                className="w-full h-full min-h-[200px] p-4 border-2 border-neutral-300"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Uploaded Documents List */}
            {documents.length > 0 && (
                <div className="flex flex-col gap-3" ref={uploadedDocsRef}>
                    <h4 className="text-sm font-medium text-gray-900">Uploaded Documents ({documents.length})</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {documents.map((doc, index) => (
                            <div
                                key={index}
                                className="group relative flex items-center p-3 bg-white border border-neutral-200 rounded-xl hover:border-black/30 transition-colors shadow-sm"
                            >
                                <div className="p-2.5 bg-rose-50 text-rose-500 rounded-lg mr-3 group-hover:bg-rose-100 transition-colors">
                                    <BsFileEarmarkPdf size={20} />
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {doc.original_filename}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {(doc.bytes / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                                <button
                                    onClick={() => removeDocument(index)}
                                    className="ml-2 p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    aria-label="Remove document"
                                    type="button"
                                >
                                    <FiX size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpaceVerification;

