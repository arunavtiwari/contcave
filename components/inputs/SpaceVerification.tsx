"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { CiFileOn } from "react-icons/ci";
import { FiUpload, FiX } from "react-icons/fi";
import { toast } from "react-toastify";

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

export interface VerificationVideo {
    resource_type: string;
    original_filename: string;
    public_id: string;
    bytes: number;
    version: number;
    thumbnail: string;
    url: string;
    format: string;
}

export interface VerificationPayload {
    documents: VerificationDocument[];
    videos: VerificationVideo[];
    code: string;
}

interface Props {
    onVerification: (data: VerificationPayload) => void;
    initialDocuments?: VerificationDocument[];
    initialCode?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_DOCUMENTS = 10;

const SpaceVerification: React.FC<Props> = ({ onVerification, initialDocuments = [], initialCode = '' }) => {
    const [documents, setDocuments] = useState<VerificationDocument[]>(initialDocuments);
    const [videos] = useState<VerificationVideo[]>([]);
    const [verificationCode, setVerificationCode] = useState(initialCode);



    // Notify parent of verification data changes
    const notifyParent = useCallback((docs: VerificationDocument[], vids: VerificationVideo[], code: string) => {
        onVerification({
            documents: docs,
            videos: vids,
            code: code
        });
    }, [onVerification]);

    // Initialize from props only once
    const isInitialized = React.useRef(false);
    useEffect(() => {
        if (!isInitialized.current && (initialDocuments.length > 0 || initialCode)) {
            setDocuments(initialDocuments);
            setVerificationCode(initialCode);
            // notifyParent(initialDocuments, videos, initialCode); // Causing infinite loop
            isInitialized.current = true;
        }
    }, [initialDocuments, initialCode]);

    const handleLocalDocs = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(evt.target.files || []).filter((f) => f.type === 'application/pdf');

        if (files.length === 0) {
            if (evt.target.files && evt.target.files.length > 0) {
                toast.error("Only PDF files are allowed");
            }
            evt.target.value = "";
            return;
        }

        if (documents.length + files.length > MAX_DOCUMENTS) {
            toast.error(`Maximum ${MAX_DOCUMENTS} documents allowed`);
            evt.target.value = "";
            return;
        }

        const invalidFiles: string[] = [];
        for (const file of files) {
            if (file.size > MAX_FILE_SIZE) {
                invalidFiles.push(file.name);
            }
        }

        if (invalidFiles.length > 0) {
            toast.error(`Files too large (max 10MB): ${invalidFiles.join(", ")}`);
            evt.target.value = "";
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
        notifyParent(nextDocs, videos, verificationCode);
        toast.success(`${files.length} document(s) added. They will be uploaded after listing creation.`);
        evt.target.value = "";
    }, [documents, videos, verificationCode, notifyParent]);

    const removeDocument = useCallback((index: number) => {
        const doc = documents[index];
        if (doc.previewUrl) {
            URL.revokeObjectURL(doc.previewUrl);
        }
        const updatedDocs = documents.filter((_, i) => i !== index);
        setDocuments(updatedDocs);
        notifyParent(updatedDocs, videos, verificationCode);
        toast.info("Document removed");
    }, [documents, videos, verificationCode, notifyParent]);

    const generateVerificationCode = useCallback(() => {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const charactersLength = characters.length;
        for (let i = 0; i < 6; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        setVerificationCode(result);
        notifyParent(documents, videos, result);
        toast.success("Verification code generated");
    }, [documents, videos, notifyParent]);

    // Cleanup blob URLs on unmount
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
        <div className="bg-opacity-50 overflow-y-auto h-full w-full">
            <div className="bg-white mx-auto relative rounded-md">
                <div>
                    <div className="px-7">
                        <div className="flex justify-between">
                            <div className="px-4 w-1/2">
                                <label className="flex justify-center w-full h-15 px-4 py-3 mt-5 rounded-lg border text-white border-rose-500 bg-rose-500 font-medium text-sm leading-5 shadow-xs hover:text-white hover:opacity-50 focus:outline-none cursor-pointer">
                                    <FiUpload className="h-5 w-5 text-white mr-2" aria-hidden="true" />
                                    <span>Upload Document/s (PDF)</span>
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        multiple
                                        className="hidden"
                                        onChange={handleLocalDocs}
                                    />
                                </label>
                                <p className="text-xs text-gray-500 mt-2">
                                    Maximum {MAX_DOCUMENTS} documents, 10MB each. Documents will be uploaded after listing creation.
                                </p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {documents.map((doc, index) => (
                                        <div key={index} className="relative group mt-2 w-1/3">
                                            <div className="border rounded-lg p-2 bg-gray-50">
                                                <CiFileOn className="mx-auto" size={48} />
                                                <strong className="text-xs truncate block text-center mt-1">
                                                    {doc.original_filename}
                                                </strong>
                                                {doc.bytes && (
                                                    <p className="text-xs text-gray-500 text-center">
                                                        {(doc.bytes / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => removeDocument(index)}
                                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                                                aria-label="Remove document"
                                                type="button"
                                            >
                                                <FiX size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="border-l pb-6 pl-6 pt-6 w-1/2">
                                <p className="text-xs text-black-500 font-semibold mb-2">Acceptable Documents for Verification:</p>
                                <ul className="text-xs list-disc list-inside text-black-600 space-y-1">
                                    <li>Property Deed</li>
                                    <li>Rental Agreement</li>
                                    <li>Utility Bills (Electricity/Water/Gas Bill)</li>
                                    <li>No Objection Certificate (NOC)</li>
                                </ul>
                                <p className="text-xs mt-4 text-gray-600">
                                    You can upload multiple or any one of the mentioned documents. Documents are stored locally and will be uploaded securely after listing creation.
                                </p>
                            </div>
                        </div>

                        <div className="flex my-2 mb-0">
                            <div style={{ width: "50%", paddingTop: "10px" }}>
                                <hr></hr>
                            </div>
                            <div className="px-2 font-semibold">OR</div>
                            <div style={{ width: "50%", paddingTop: "10px" }}>
                                <hr></hr>
                            </div>
                        </div>
                        <div className="flex">
                            <div className="items-center w-1/2 px-6 mt-10">
                                <div className="flex">
                                    <button
                                        onClick={generateVerificationCode}
                                        type="button"
                                        className="flex items-center px-4 py-2 bg-green-800 rounded-lg border text-white font-medium text-sm leading-5 shadow-xs hover:text-white hover:opacity-50 focus:outline-none"
                                    >
                                        Generate code
                                    </button>
                                    <input
                                        type="text"
                                        className="border focus:outline-none focus:shadow-outline leading-tight ml-2 px-2 py-2 rounded text-black-600 w-1/2 text-center font-mono"
                                        placeholder='XXXXXX'
                                        disabled={true}
                                        value={verificationCode}
                                        readOnly
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Generate a unique code for video verification
                                </p>
                            </div>

                            <div className="border-l mt-4 pl-6 w-1/2">
                                <p className="text-sm text-black-500 font-semibold mb-2">Steps to follow while filming property video:</p>
                                <ol className="text-xs list-decimal list-inside text-black-600 mt-2 space-y-2">
                                    <li><strong>Generate Code:</strong> Press the "Generate Code" button to create a unique verification code.</li>
                                    <li><strong>Write Down Code:</strong> Write the generated code on a slip of paper, ensuring it's clearly visible.</li>
                                    <li><strong>Include in Property Video:</strong> Display the slip with the code prominently while filming the property video.</li>
                                    <li><strong>Upload Video:</strong> Upload the video to the platform with the code visible in the footage.</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SpaceVerification;
