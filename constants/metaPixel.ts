export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

export const MetaStandardEvent = {
    PageView: "PageView",
    ViewContent: "ViewContent",
    Search: "Search",
    AddToCart: "AddToCart",
    AddToWishlist: "AddToWishlist",
    InitiateCheckout: "InitiateCheckout",
    AddPaymentInfo: "AddPaymentInfo",
    Purchase: "Purchase",
    Lead: "Lead",
    CompleteRegistration: "CompleteRegistration",
    Contact: "Contact",
    FindLocation: "FindLocation",
    Schedule: "Schedule",
    StartTrial: "StartTrial",
    SubmitApplication: "SubmitApplication",
    Subscribe: "Subscribe",
} as const;
