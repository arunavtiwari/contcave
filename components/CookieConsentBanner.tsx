"use client"
import Link from "next/link";
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
                background: "var(--color-foreground)", opacity: 0.9, color: "var(--color-background)", justifyContent: "center", alignItems: "center"
            }}
            buttonStyle={{ backgroundColor: "var(--color-success)", color: "var(--color-background)", fontSize: "14px", borderRadius: "40px" }}
            declineButtonStyle={{ backgroundColor: "var(--color-danger)", color: "var(--color-background)", fontSize: "14px", borderRadius: "40px" }}
            expires={365}
            onAccept={() => {
            }}
            onDecline={() => {
            }}
        >
            This website uses cookies to enhance your experience. By using our website, you consent to the use of cookies.
            You can read more in our <Link href="/privacy-policy" className="text-background underline font-medium">Privacy Policy</Link>.
        </CookieConsent>
    );
};

export default CookieConsentBanner;
