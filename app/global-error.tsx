"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

type GlobalErrorProps = {
    error: Error & { digest?: string };
    reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
    useEffect(() => {
        console.error("[Global Error]", {
            message: error.message,
            digest: error.digest,
            stack: error.stack,
        });
    }, [error]);

    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    fontFamily:
                        "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
                    color: "#111827",
                    background: "#ffffff",
                }}
            >
                <main
                    style={{
                        minHeight: "100vh",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "32px",
                        textAlign: "center",
                    }}
                >
                    <section
                        style={{
                            width: "100%",
                            maxWidth: "480px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "20px",
                        }}
                    >
                        <Image
                            src="/images/logo/logo_small.png"
                            alt="ContCave"
                            width={120}
                            height={90}
                            style={{ borderRadius: "999px" }}
                        />
                        <div>
                            <h1
                                style={{
                                    margin: "0 0 8px",
                                    fontSize: "28px",
                                    lineHeight: 1.2,
                                    fontWeight: 700,
                                }}
                            >
                                Something went wrong
                            </h1>
                            <p
                                style={{
                                    margin: 0,
                                    color: "#6b7280",
                                    fontSize: "15px",
                                    lineHeight: 1.6,
                                }}
                            >
                                We could not load this page. Please try again or return to the homepage.
                            </p>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                justifyContent: "center",
                                gap: "12px",
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => reset()}
                                style={{
                                    minHeight: "44px",
                                    border: "1px solid #111827",
                                    borderRadius: "999px",
                                    padding: "0 20px",
                                    color: "#ffffff",
                                    background: "#111827",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                Try again
                            </button>
                            <Link
                                href="/"
                                style={{
                                    minHeight: "44px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "999px",
                                    padding: "0 20px",
                                    color: "#111827",
                                    background: "#ffffff",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    textDecoration: "none",
                                }}
                            >
                                Go home
                            </Link>
                        </div>
                    </section>
                </main>
            </body>
        </html>
    );
}
