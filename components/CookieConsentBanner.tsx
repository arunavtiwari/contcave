"use client"
import Link from "next/link";
import React from "react";
import CookieConsent from "react-cookie-consent";

const CookieConsentBanner = () => {
    return (
        <CookieConsent
            location="bottom"
            buttonText="Accept All"
            declineButtonText="Decline"
            enableDeclineButton
            cookieName="ContcavCookieConsent"
            style={{
                background: "rgba(0, 0, 0, 0.9)", color: "#FFF", justifyContent: "center", alignItems: "center"
            }}
            buttonStyle={{ backgroundColor: "#4CAF50", color: "#FFF", fontSize: "14px", borderRadius: "40px" }}
            declineButtonStyle={{ backgroundColor: "#f44336", color: "#FFF", fontSize: "14px", borderRadius: "40px" }}
            expires={365}
            onAccept={() => {
            }}
            onDecline={() => {
            }}
        >
            This website uses cookies to enhance your experience. By using our website, you consent to the use of cookies.
            You can read more in our <Link href="/privacy-policy" className="text-white underline font-medium">Privacy Policy</Link>.
        </CookieConsent>
    );
};

export default CookieConsentBanner;