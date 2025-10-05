import React, { useCallback, useState } from 'react';
import { FiUpload } from "react-icons/fi";
type Props = {
  onSubmit: () => void;
}
const UserVerification = ({onSubmit}: Props) => {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otpPhone, setOtpPhone] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const disabled = false;
  const handleSubmit = useCallback(() => {
    if (disabled) {
      return;
    }

    onSubmit();
  }, [onSubmit, disabled]);

  return (
    <div className="bg-opacity-50 overflow-y-auto h-full w-full" id="my-modal">
      <div className="bg-white">
        <div className=" text-center">
          <div className="mt-2 px-7 ">
            <h4 className="font-semibold text-gray-700">Identity Proof Verification</h4>

            <div className='flex gap-10  pb-6 mt-3'>

              <div className="flex-1 p-3 rounded">
                <button className="flex bg-rose-500 shadow-lg text-white py-2 px-4 rounded-lg hover:bg-rose-500 focus:outline-none focus:bg-rose-700 mx-auto">
                  <FiUpload /> &nbsp; <label className="text-sm">Upload Document/s</label>
                </button>
                {/* Placeholder for uploaded documents */}
                <div className="mt-4 flex gap-2">
                  <div className="relative">
                    {/*  <img src="/path/to/example-pdf-thumbnail.png" alt="example.pdf" className="h-20" />
                    <button className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 text-xs">x</button>
                    <p className="text-xs text-center">example.pdf</p> */}
                  </div>
                  <div className="relative">
                    {/*   <img src="/path/to/agreement-pdf-thumbnail.png" alt="agreement.pdf" className="h-20" />
                    <button className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 text-xs">x</button>
                    <p className="text-xs text-center">agreement.pdf</p> */}
                  </div>
                </div>
              </div>
              <div className="border-l pl-8 flex-1">
                <p className="text-xs text-left text-gray-600 font-bold">Acceptable Identity proof for Verification are</p>
                <ul className="text-sm text-left text-gray-600 list-disc list-inside mt-4">
                  <li>Aadhar Card</li>
                  <li>Pan Card</li>
                  <li>Voter Id Card</li>
                  <li>Driver's License</li>
                </ul>
                <p className="text-xs text-left text-gray-500 mt-2">Please upload (Front and Back of) any one of the mentioned ID-proof</p>
              </div>

            </div>
            <div className="flex">
              <div style={{ width: "56%", paddingTop: "10px" }}>
                <hr></hr>
              </div>
              <div className="px-2">OR</div>
              <div style={{ width: "50%", paddingTop: "10px" }}>
                <hr></hr>
              </div>
            </div>
            <div className="mt-6">
            </div>
            <div className="mt-4">
              <h4 className="font-semibold text-gray-700 mb-4">Phone number and Email verification</h4>
              <div className="flex items-center gap-3 mb-4 justify-center">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Verify Phone Number"
                  className="border-2 border-gray-300 px-2 rounded w-1/3"
                />
                <button
                  className="focus:outline-none font-semibold hover:bg-purple-700 rounded text-blue-500 text-xs"
                >
                  Get OTP
                </button>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  className="border-2 border-gray-300 px-2 rounded w-1/4"
                />
                <button
                  className="text-purple-600  px-4 rounded border border-purple-600 hover:bg-purple-600 hover:text-white focus:outline-none text-sm"
                >
                  Verify
                </button>
              </div>
              <div className="flex items-center gap-3 justify-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Verify Email Id"
                  className="border-2 border-gray-300 px-2 rounded w-1/3"
                />
                <button
                  className="focus:outline-none font-semibold hover:bg-purple-700 rounded text-blue-500 text-xs"
                >
                  Get OTP
                </button>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  className="border-2 border-gray-300 px-2 rounded w-1/4"
                />
               
               <button
                  className="text-purple-600  px-4 rounded border border-purple-600 hover:bg-purple-600 hover:text-white focus:outline-none text-sm"
                >
                  Verify
                </button>
              </div>
            </div>

            <div className="items-center px-4 py-3">
              <button id="ok-btn"
              onClick={handleSubmit}
              className="bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 font-medium hover:opacity-80 mt-4 px-4 py-3 rounded-xl shadow-sm text-base text-white w-[40vw]">
                Complete Verification
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserVerification;
