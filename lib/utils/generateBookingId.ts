import * as crypto from "crypto";

/**
 * Generates a collision-resistant, human-readable 8-character Enterprise Booking ID.
 * Excludes confusing characters like 0, O, 1, and I for premium user experience.
 */
export function generateBookingId(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(crypto.randomInt(0, chars.length));
    }
    return "BKG-" + result;
}
