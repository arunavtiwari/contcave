export interface PhonePeConfig {
    merchantId: string;
    saltKey: string;
    saltIndex: number;
    apiUrl: string;
    redirectUrl: string;
    callbackUrl: string;
}

export interface PhonePePaymentRequest {
    merchantTransactionId: string;
    amount: number;
    redirectUrl: string;
    callbackUrl: string;
    mobileNumber?: string;
    deviceContext?: {
        deviceOS: string;
    };
}

export interface PhonePePaymentResponse {
    success: boolean;
    code: string;
    message: string;
    data?: {
        merchantId: string;
        merchantTransactionId: string;
        transactionId: string;
        amount: number;
        state: string;
        responseCode: string;
        paymentInstrument: {
            type: string;
            utr?: string;
        };
        instrumentResponse?: {
            redirectInfo?: {
                url: string;
                method: string;
            };
        };
    };
}

export interface PhonePeCallbackResponse {
    success: boolean;
    code: string;
    message: string;
    data: {
        merchantId: string;
        merchantTransactionId: string;
        transactionId: string;
        amount: number;
        state: 'COMPLETED' | 'FAILED' | 'PENDING';
        responseCode: string;
        paymentInstrument: {
            type: string;
            utr?: string;
        };
    };
}