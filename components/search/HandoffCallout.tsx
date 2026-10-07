"use client";

import { IoChatbubblesOutline } from "react-icons/io5";

import { logSearchEventAction } from "@/app/actions/searchActions";
import Callout from "@/components/ui/Callout";
import WhatsAppLinkButton from "@/components/ui/WhatsAppLinkButton";
import { buildWhatsAppUrl,searchEnquiryMessage } from "@/lib/whatsapp/urls";

type HandoffCalloutProps = { summary: string; sessionToken: string; title?: string };

export default function HandoffCallout({ summary, sessionToken, title = "Want us to find the right space for you?" }: HandoffCalloutProps) {
    return (
        <Callout
            title={title}
            icon={IoChatbubblesOutline}
            action={(
                <WhatsAppLinkButton
                    href={buildWhatsAppUrl(searchEnquiryMessage(summary))}
                    label="Help me find a space"
                    className="sm:w-auto"
                    onClick={() => void logSearchEventAction({ sessionToken, type: "handoff" })}
                />
            )}
        >
            Share your shoot details with the ContCave team on WhatsApp. We will shortlist studios and confirm availability for you.
        </Callout>
    );
}
