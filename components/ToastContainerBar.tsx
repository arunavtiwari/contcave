"use client";


import "react-toastify/dist/ReactToastify.css";

import { ToastContainer } from "react-toastify";

type Props = {};

function ToastContainerBar({ }: Props) {
  return (
    <>
      <ToastContainer
        position="bottom-left"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        pauseOnFocusLoss
        pauseOnHover
        theme="colored"
      />
    </>
  );
}

export default ToastContainerBar;
