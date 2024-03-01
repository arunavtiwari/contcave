import React, { useState } from 'react';

const TermsAndConditionsModal = ({ onChange }:any) => {
    const [agree, setAgree] = useState(false);

    const handleAgreeChange = (event:any) => {
        setAgree(event.target.checked);
        onChange(event.target.checked);
    };

    return (
        <div className=" flex justify-center items-center">
            <div className="bg-white w-full max-w-xl mx-auto rounded-lg overflow-auto" style={{ maxHeight: '90vh' }}>
                <div className="px-4">
                    <div className="my-4 text-sm overflow-auto scrollbar-thin" style={{ maxHeight: '65vh' }}>
                        This agreement (&apos;Agreement&apos;) is entered into between CONTCAVE (&apos;Company&apos;), a company registered under the laws of India, and the individual or entity (&apos;Host&apos;) who wishes to list their property (&apos;Property&apos;) on the Company's platform (&apos;Platform&apos;). By listing the Property on the Platform, Host agrees to comply with the terms and conditions outlined in this Agreement.<br/><br/>
                        <strong>1. Listing Property</strong><br/>
                        1.1 Host agrees to provide accurate and up-to-date information about the Property, including property type, location, amenities, availability, pricing, and any rules or restrictions associated with the Property.<br/>
                        1.2 Host acknowledges that any photos, descriptions, or other content provided for the Property listing must accurately represent the Property and may be subject to review by the Company.<br/>
                        <strong>2. Host Responsibilities</strong><br/><br/>
                        2.1 Host agrees to maintain the Property in a safe and habitable condition, in compliance with all applicable laws, regulations, and building codes.<br/>
                        2.2 Host acknowledges responsibility for ensuring that guests comply with any rules, regulations, or restrictions related to the use of the Property.<br/>
                        2.3 Host agrees to promptly respond to guest inquiries, booking requests, and any issues or concerns raised by guests during their stay at the Property.<br/>
                        <strong> 3. Booking and Payments</strong><br/><br/>
                        3.1 Host agrees to honor all bookings made through the Platform and to provide guests with the agreed-upon accommodations and services.<br/>
                        3.2 Host acknowledges that the Company may collect payments from guests on behalf of the Host and remit the applicable fees to the Host in accordance with the agreed-upon terms and conditions.<br/>
                        <strong>4. Compliance with Laws</strong><br/><br/>
                        4.1 Host agrees to comply with all applicable laws, regulations, and ordinances, including but not limited to zoning laws, tax laws, and rental regulations, related to the use and rental of the Property.<br/>
                        4.2 Host acknowledges that they are solely responsible for obtaining any necessary permits, licenses, or approvals required for the operation of the Property as a rental accommodation.<br/>
                        4.3 If the Property is subject to any legal disputes or restrictions, Host agrees to provide a No Objection Certificate from relevant authorities confirming that there are no objections to renting out the Property.<br/>
                        <strong>5. Insurance and Liability</strong><br/><br/>
                        5.1 Host acknowledges that they are responsible for obtaining and maintaining appropriate insurance coverage for the Property, including liability insurance, to protect against any losses, damages, or claims arising from the use of the Property by guests.<br/>
                        5.2 Host agrees to indemnify and hold harmless the Company, its officers, directors, employees, and agents from any claims, damages, losses, or liabilities arising from the Host's breach of this Agreement or the use of the Property by guests.<br/>
                        <strong>6. Termination</strong><br/><br/>
                        6.1 This Agreement may be terminated by either party upon written notice to the other party.<br/>
                        6.2 Upon termination of this Agreement, Host agrees to remove the Property listing from the Platform and cease all use of the Company's services and resources.<br/>
                        <strong>7. Miscellaneous</strong><br/><br/>
                        7.1 This Agreement constitutes the entire agreement between the parties regarding the subject matter herein and supersedes all prior or contemporaneous agreements, understandings, or representations, whether written or oral.<br/>
                        7.2 This Agreement shall be governed by and construed in accordance with the laws of India, without regard to its conflict of laws principles.<br/>
                        IN WITNESS WHEREOF, the parties have executed this Agreement as of<br/><br/>

                        Hostname<br/>

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
};

export default TermsAndConditionsModal;
