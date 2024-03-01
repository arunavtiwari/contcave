"use client";
import { CldUploadWidget } from "next-cloudinary";
import React, { useCallback, useState } from 'react';
import { FiUpload } from "react-icons/fi";
import { CiFileOn } from "react-icons/ci";


const SpaceVerification = ({ onVerification }: any) => {


    const [documents, setDocuments] = useState<any[]>([]);
    const [videos, setVideos] = useState<any[]>([]);
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationDocs, setVerificationDocs] = useState({});
    // Function that gets called when the upload widget process is complete
    const handleUploadDocSuccess = (result: any) => {
        const urls = Array.isArray(result.info.secure_url)
            ? result.info.secure_url
            : [{
                resource_type: result.info.resource_type,
                original_filename: result.info.original_filename,
                thumbnail: result.info.thumbnail_url,
                url: result.info.secure_url,
                format: result.info.format ?? result.info.secure_url.substring(result.info.secure_url.lastIndexOf('.') + 1)

            }];
        const finalList = [...documents, ...urls];
        setDocuments(finalList);
        setVerificationPayload()
        setVerificationPayload(urls, videos, verificationCode)

    };

    const handleUploadVideoSuccess = (result: any) => {
        const urls = Array.isArray(result.info.secure_url)
            ? result.info.secure_url
            : [{
                resource_type: result.info.resource_type,
                original_filename: result.info.original_filename,
                thumbnail: result.info.thumbnail_url,
                url: result.info.secure_url,
                format: result.info.format
            }];
        const finalList = [...videos, ...urls];
        setVideos(finalList);
        setVerificationPayload()
        setVerificationPayload(documents, urls, verificationCode)

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

    const setVerificationPayload = ((documents: any[] = [], videos: any[] = [], code: string = "") => {
        const verifications = {
            documents: documents,
            videos: videos,
            code: code
        }
        onVerification(verifications)
    })
    return (
        <div className=" bg-opacity-50 overflow-y-auto h-full w-full" id="my-">
            <div className="bg-white mx-auto relative rounded-md">
                <div >

                    <div className="px-7">
                        <div className="flex justify-between">
                            <div className="px-4 w-1/2">
                                <CldUploadWidget
                                    onUpload={handleUploadDocSuccess}
                                    uploadPreset="phxjukr6"
                                    options={{
                                        maxFiles: 10,
                                        multiple: true
                                    }}
                                >
                                    {({ open }) => {
                                        return (
                                            <button onClick={() => open?.()} className="flex justify-center w-full h-15 px-4 py-3  mt-5 rounded-lg border text-white  border-rose-500 bg-rose-500 font-medium text-sm leading-5 shadow-sm hover:text-white hover:opacity-50 focus:outline-none">
                                                <FiUpload className="h-5 w-5 text-white  mr-2 " aria-hidden="true" />
                                                Upload Document/s
                                            </button>
                                        );
                                    }}
                                </CldUploadWidget>
                                <div className="flex flex-wrap">
                                    {documents.map((doc: any,index:number) => doc.thumbnail ? (
                                        <div key={index} className="mt-2 w-1/3 mx-auto h-15 truncate">
                                            <img  src={doc.thumbnail ?? doc.url} className="rounded border" />
                                            <strong className="text-xs truncate">{doc.original_filename}.{doc.format}</strong>
                                        </div>

                                    ) : (
                                        <div  key={index} className="mt-2 w-1/3 mx-auto h-15 truncate">
                                            {/* <img src={doc.thumbnail ?? doc.url} className="rounded border" /> */}
                                            <CiFileOn  className="rounded border h-15"  size={62}/>
                                            <strong className="text-xs truncate">{doc.original_filename}.{doc.format}</strong>
                                        </div>
                                    )

                                    )}
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
                                        className="flex items-center px-4 py-2 bg-green-800 rounded-lg border text-white font-medium text-sm leading-5 shadow-sm hover:text-white hover:opacity-50 focus:outline-none">

                                        Generate code
                                    </button>
                                    <input type="text" className="border focus:outline-none focus:shadow-outline leading-tight ml-2 px-2 py-2 rounded text-black-600 w-1/2 text-center" placeholder='XXXXXX'
                                        disabled={true} value={verificationCode}
                                    />
                                </div><br />
                                <CldUploadWidget
                                    onUpload={handleUploadVideoSuccess}
                                    uploadPreset="phxjukr6"
                                    options={{
                                        maxFiles: 10,
                                        multiple: true
                                    }}
                                >
                                    {({ open }) => {
                                        return (
                                            <button onClick={() => open?.()} className="flex justify-center w-full  px-4 py-3 rounded-lg border text-white  border-rose-500 bg-rose-500 font-medium text-sm leading-5 shadow-sm hover:text-white hover:opacity-50 focus:outline-none">
                                                <FiUpload className="h-5 w-5 text-white mr-2 " aria-hidden="true" />
                                                Upload Video

                                            </button>
                                        )

                                    }}
                                </CldUploadWidget>
                                <div className="flex flex-wrap">
                                    {videos.map((video: any,index:number) => video.thumbnail ? (
                                        <div key={index} className="mt-2 w-1/3 mx-auto h-15 truncate">
                                            <img    src={video.thumbnail ?? video.url} className="rounded border" />
                                            <strong className="text-xs truncate">{video.original_filename}.{video.format}</strong>
                                        </div>

                                    ) : (
                                        <div  key={index} className="mt-2 w-1/3 mx-auto h-15 truncate">
                                            {/* <img src={video.thumbnail ?? video.url} className="rounded border" /> */}
                                            <CiFileOn  className="rounded border h-15"  size={62}/>
                                            <strong className="text-xs truncate">{video.original_filename}.{video.format}</strong>
                                        </div>
                                    )

                                    )}
                                </div>
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
