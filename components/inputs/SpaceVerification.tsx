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
        <div className="flex flex-col gap-4">
            <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-200">
                <h3 className="font-medium text-lg mb-2">Upload Verification Documents</h3>
                <p className="text-sm text-neutral-500 mb-6">
                    Please upload one or more of the following documents to verify your ownership or authority to rent this space.
                    Accepted formats: PDF. Max size: 10MB.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <ul className="text-sm text-neutral-600 space-y-2 list-disc list-inside bg-white p-4 rounded-lg border border-neutral-200">
                            <li>Property Deed</li>
                            <li>Rental Agreement</li>
                            <li>Utility Bills (Electricity/Water/Gas)</li>
                            <li>No Objection Certificate (NOC)</li>
                        </ul>
                    </div>

                    <div className="h-40">
                        <ImageUpload
                            onChange={() => { }}
                            values={[]}
                            deferUpload
                            onFilesChange={handleFilesChange}
                            allowedTypes={['application/pdf']}
                            label="Upload PDF"
                            icon={BsFileEarmarkPdf}
                        />
                    </div>
                </div>
            </div>

            {documents.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {documents.map((doc, index) => (
                        <div key={index} className="relative group flex items-center p-3 bg-white border border-neutral-200 rounded-xl shadow-sm">
                            <div className="p-2 bg-rose-50 rounded-lg mr-3">
                                <BsFileEarmarkPdf className="text-rose-500" size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate text-neutral-800">
                                    {doc.original_filename}
                                </p>
                            </div>
                            <button
                                onClick={() => removeDocument(index)}
                                className="ml-2 p-2 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition"
                                aria-label="Remove document"
                                type="button"
                            >
                                <FiX size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SpaceVerification;

