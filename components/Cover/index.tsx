"use client";
import Image from "next/image";
import React from "react";

import Container from "../Container";

const Cover = () => {
  return (
    <>
      <section className="py-section bg-black">
        <Container>
          <div className="relative z-1 ">
            <Image
              width={0}
              height={0}
              src="/images/cover.svg"
              alt="Cover"
              className="w-full h-full object-cover"
            />
          </div>
        </Container>
      </section>

    </>
  );
};

export default Cover;
