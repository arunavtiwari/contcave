"use client";

import dynamic from "next/dynamic";

const ClientOverlays = dynamic(() => import("./ClientOverlays"), { ssr: false });

export default function LazyOverlaysHost() {
    return <ClientOverlays />;
}
