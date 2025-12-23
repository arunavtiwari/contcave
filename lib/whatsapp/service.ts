import axios from "axios";

const WHATSAPP_API_URL = "https://graph.facebook.com/v21.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

const axiosInstance = axios.create({
    timeout: 10000,
});

if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.warn("WhatsApp credentials missing in environment variables.");
}

type TemplateComponent = {
    type: "header" | "body" | "button";
    parameters: any[];
};

type SendTemplateInput = {
    to: string;
    templateName: string;
    languageCode?: string;
    components?: TemplateComponent[];
};

export const WhatsappService = {
    formatPhoneNumber(phone: string): string | null {
        const cleaned = phone.replace(/\D/g, "");

        if (cleaned.length === 10) {
            return `91${cleaned}`;
        }

        if (cleaned.length >= 10 && cleaned.length <= 15) {
            return cleaned;
        }
        return null;
    },

    async sendMessage({
        to,
        templateName,
        languageCode = "en",
        components = [],
    }: SendTemplateInput) {
        if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
            const error = new Error("Cannot send WhatsApp message: Credentials missing.");
            console.error(error.message);
            throw error;
        }

        const formattedTo = this.formatPhoneNumber(to);
        if (!formattedTo) {
            const error = new Error(`Invalid phone number: ${to}`);
            console.error(error.message);
            throw error;
        }

        const maxRetries = 3;
        let lastError: any;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;
                const data = {
                    messaging_product: "whatsapp",
                    to: formattedTo,
                    type: "template",
                    template: {
                        name: templateName,
                        language: {
                            code: languageCode,
                        },
                        components: components,
                    },
                };

                const response = await axiosInstance.post(url, data, {
                    headers: {
                        Authorization: `Bearer ${ACCESS_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                });

                console.log(`WhatsApp message sent to ${to}:`, response.data);
                return response.data;
            } catch (error: any) {
                lastError = error;
                const status = error.response?.status;
                const errorMessage = error.response?.data
                    ? JSON.stringify(error.response.data)
                    : error.message;

                const isRetryable =
                    status === 429 ||
                    (status >= 500 && status < 600) ||
                    error.code === 'ECONNABORTED' ||
                    error.code === 'ETIMEDOUT' ||
                    error.code === 'ECONNRESET';
                if (!isRetryable || status === 401 || status === 403) {
                    const whatsappError = new Error(
                        `WhatsApp API error: ${errorMessage}`
                    );
                    console.error("Error sending WhatsApp message (non-retryable):", {
                        to,
                        templateName,
                        error: errorMessage,
                        status,
                        attempt,
                    });
                    throw whatsappError;
                }

                if (attempt < maxRetries) {
                    const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                    console.warn(`WhatsApp API retry attempt ${attempt}/${maxRetries} after ${delayMs}ms:`, {
                        to,
                        templateName,
                        status,
                        error: errorMessage,
                    });
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }
        }

        const errorMessage = lastError.response?.data
            ? JSON.stringify(lastError.response.data)
            : lastError.message;
        const whatsappError = new Error(
            `WhatsApp API error after ${maxRetries} attempts: ${errorMessage}`
        );
        console.error("Error sending WhatsApp message (all retries exhausted):", {
            to,
            templateName,
            error: errorMessage,
            status: lastError.response?.status,
        });
        throw whatsappError;
    },

    async sendBookingReceivedHost(
        to: string,
        params: {
            hostName: string;
            customerName: string;
            listingTitle: string;
            startDate: string;
            startTime: string;
        }
    ) {
        return this.sendMessage({
            to,
            templateName: "booking_received_host",
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: params.hostName },
                        { type: "text", text: params.customerName },
                        { type: "text", text: params.listingTitle },
                        { type: "text", text: params.startDate },
                        { type: "text", text: params.startTime },
                    ],
                },
            ],
        });
    },

    async sendBookingConfirmedCustomer(
        to: string,
        params: {
            customerName: string;
            listingTitle: string;
            startDate: string;
            startTime: string;
            locationLink: string;
        }
    ) {
        return this.sendMessage({
            to,
            templateName: "booking_confirmed_customer",
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: params.customerName },
                        { type: "text", text: params.listingTitle },
                        { type: "text", text: params.startDate },
                        { type: "text", text: params.startTime },
                        { type: "text", text: params.locationLink },
                    ],
                },
            ],
        });
    },

    async sendBookingReminderCustomer(
        to: string,
        params: {
            customerName: string;
            listingTitle: string;
            startTime: string;
        }
    ) {
        return this.sendMessage({
            to,
            templateName: "booking_reminder_customer",
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: params.customerName },
                        { type: "text", text: params.listingTitle },
                        { type: "text", text: params.startTime },
                    ],
                },
            ],
        });
    },

    async sendPaymentTransferredHost(
        to: string,
        params: {
            hostName: string;
            amount: string;
            listingTitle: string;
            date: string;
        }
    ) {
        return this.sendMessage({
            to,
            templateName: "payment_transferred_host",
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: params.hostName },
                        { type: "text", text: params.amount },
                        { type: "text", text: params.listingTitle },
                        { type: "text", text: params.date },
                    ],
                },
            ],
        });
    },
};
