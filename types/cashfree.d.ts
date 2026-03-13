declare module '@cashfreepayments/cashfree-js' {
    export interface CashfreeInitOptions {
        mode: 'sandbox' | 'production';
    }

    export interface CashfreePaymentOptions {
        paymentSessionId: string;
        redirectTarget?: '_self' | '_blank' | '_modal';
        returnUrl?: string;
    }

    export interface CashfreeCheckoutOptions {
        paymentSessionId: string;
        returnUrl?: string;
        redirectTarget?: '_self' | '_blank' | '_modal';
    }

    export interface CashfreeLoadOptions {
        mode: 'sandbox' | 'production';
    }

    export interface Cashfree {
        initialise(options: CashfreeInitOptions): Promise<void>;
        pay(options: CashfreePaymentOptions): Promise<void>;
        checkout(options: CashfreeCheckoutOptions): Promise<void>;
    }

    export function load(options: CashfreeLoadOptions): Promise<Cashfree>;
}
