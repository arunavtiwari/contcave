const configuredGtmId = process.env.NEXT_PUBLIC_GTM_ID?.trim() || "GTM-NDX4DMK2";
export const GTM_ID = /^GTM-[A-Z0-9]{4,12}$/.test(configuredGtmId) ? configuredGtmId : "";
