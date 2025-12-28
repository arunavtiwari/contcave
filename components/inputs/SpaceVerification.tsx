"use client";
import React, { useEffect, useState } from 'react';
import { FiUpload } from "react-icons/fi";
import { CiFileOn } from "react-icons/ci";

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
}

const SpaceVerification: React.FC<Props> = ({ onVerification }) => {
    const [documents, setDocuments] = useState<VerificationDocument[]>([]);
    const [videos, setVideos] = useState<VerificationVideo[]>([]);
    const [verificationCode, setVerificationCode] = useState('');

    // Local file capture; actual upload will happen after listing creation
    const handleLocalDocs = (evt: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(evt.target.files || []).filter((f) => f.type === 'application/pdf');
        if (files.length === 0) return;
        const mapped: VerificationDocument[] = files.map((f) => ({
            file: f,
            original_filename: f.name,
            bytes: f.size,
            format: 'pdf',
            resource_type: 'image',
            previewUrl: URL.createObjectURL(f),
        }));
        const nextDocs = [...documents, ...mapped];
        setDocuments(nextDocs);
        setVerificationPayload(nextDocs, videos, verificationCode);
    };

    const handleUploadVideoSuccess = (result: unknown) => {
        const info = (result as { info: any })?.info || {};
        const newItems: VerificationVideo[] = Array.isArray(info.secure_url)
            ? info.secure_url
            : [{
                resource_type: info.resource_type,
                original_filename: info.original_filename,
                public_id: info.public_id,
                bytes: info.bytes,
                version: info.version,
                thumbnail: info.thumbnail_url,
                url: info.secure_url,
                format: info.format
            }];
        const nextVideos = [...videos, ...newItems];
        setVideos(nextVideos);
        setVerificationPayload(documents, nextVideos, verificationCode)

    };

    const generateVerificationCode = () => {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const charactersLength = characters.length;
        for (let i = 0; i < 6; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        setVerificationCode(result);
        setVerificationPayload(documents, videos, result)
    }

    const setVerificationPayload = ((documents: VerificationDocument[] = [], videos: VerificationVideo[] = [], code: string = "") => {
        const verifications: VerificationPayload = {
            documents: documents,
            videos: videos,
            code: code
        }
        onVerification(verifications)
    })
    useEffect(() => {
        // Keep parent in sync whenever docs/videos/code change
        setVerificationPayload(documents, videos, verificationCode);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [documents, videos, verificationCode]);
    return (
        <div className=" bg-opacity-50 overflow-y-auto h-full w-full" id="my-">
            <div className="bg-white mx-auto relative rounded-md">
                <div >

                    <div className="px-7">
                        <div className="flex justify-between">
                            <div className="px-4 w-1/2">
                                <label className="flex justify-center w-full h-15 px-4 py-3  mt-5 rounded-lg border text-white  border-rose-500 bg-rose-500 font-medium text-sm leading-5 shadow-xs hover:text-white hover:opacity-50 focus:outline-none cursor-pointer">
                                    <FiUpload className="h-5 w-5 text-white  mr-2 " aria-hidden="true" />
                                    <span>Upload Document/s (PDF)</span>
                                    <input type="file" accept="application/pdf" multiple className="hidden" onChange={handleLocalDocs} />
                                </label>
                                <div className="flex flex-wrap">
                                    {documents.map((doc, index) => (
                                        <div key={index} className="mt-2 w-1/3 mx-auto h-15 truncate">
                                            <CiFileOn className="rounded border h-15" size={62} />
                                            <strong className="text-xs truncate">{doc.original_filename}.pdf</strong>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="border-l pb-6 pl-6 pt-6 w-1/2">
                                <p className="text-xs text-black-500">Acceptable Documents for Verification are</p>
                                <ul className="text-xs list-disc list-inside text-black-600">
                                    <li>Property Deed</li>
                                    <li>Rental Agreement</li>
                                    <li>Utility Bills (Electricity/Water/Gas Bill)</li>
                                    <li>No Objection Certificate (NOC)</li>
                                </ul>
                                <p className="text-xs mt-4">
                                    You can upload multiple or any one of the mentioned documents
                                </p>
                            </div>
                        </div>

                        <div className="flex my-2 mb-0">
                            <div style={{ width: "50%", paddingTop: "10px" }}>
                                <hr></hr>
                            </div>
                            <div className="px-2">OR</div>
                            <div style={{ width: "50%", paddingTop: "10px" }}>
                                <hr></hr>
                            </div>
                        </div>
                        <div className="flex">
                            <div className="items-center w-1/2 px-6 mt-10">
                                <div className="flex ">
                                    <button
                                        onClick={generateVerificationCode}
                                        className="flex items-center px-4 py-2 bg-green-800 rounded-lg border text-white font-medium text-sm leading-5 shadow-xs hover:text-white hover:opacity-50 focus:outline-none">

                                        Generate code
                                    </button>
                                    <input type="text" className="border focus:outline-none focus:shadow-outline leading-tight ml-2 px-2 py-2 rounded text-black-600 w-1/2 text-center" placeholder='XXXXXX'
                                        disabled={true} value={verificationCode}
                                    />
                                </div><br />
                                {/* Video upload disabled */}
                            </div>

                            <div className="border-l mt-4 pl-6 w-1/2">
                                <p className="text-sm text-black-500">Steps to follow while filming property video are</p>
                                <ol className="text-xs list-decimal list-inside text-black-600 mt-6">
                                    <li><strong>Generate Code:</strong> Hosts should press the "Generate Code" button on the platform to create a unique verification code associated with their property listing.</li>
                                    <li className='mt-4'><strong>Write Down Code:</strong> Hosts must write down the generated code on a slip of paper, ensuring it's clearly visible and legible.</li>
                                    <li className='mt-4'><strong>Include in Property Video:</strong> While filming the property video, hosts should prominently display the slip with the written code to ensure its visibility throughout the video recording.</li>
                                    <li className='mt-4'><strong>Upload Video:</strong> Once the property video is recorded, hosts should upload it to the platform, ensuring that the slip with the verification code remains visible in the video footage. This helps verify the authenticity of the property listing.</li>
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
