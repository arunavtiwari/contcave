// test-whatsapp.ts
/**
 * Standalone test script to verify WhatsApp API credentials and all 6 templates.
 * 
 * Usage:
 * 1. Ensure .env has WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN
 * 2. Run: npx ts-node test-whatsapp.ts <your_phone_number_with_country_code>
 *    Example: npx ts-node test-whatsapp.ts 919876543210
 */

import { WhatsappService } from "../lib/whatsapp/service.ts";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function runTests() {
    const args = process.argv.slice(2);
    const targetPhone = args[0];

    if (!targetPhone) {
        console.error("❌ Please provide a target phone number.");
        console.error("Usage: npx ts-node test-whatsapp.ts <phone_number>");
        process.exit(1);
    }

    console.log(`\n🧪 Testing WhatsApp API for number: ${targetPhone}\n`);

    try {
        // 1. Test booking_received_host
        console.log("Testing 1/6: 'booking_received_host'...");
        await WhatsappService.sendBookingReceivedHost(targetPhone, {
            hostName: "Test Host",
            customerName: "Test Customer",
            listingTitle: "Test Studio Space",
            startDate: "2026-04-01",
            startTime: "10:00 AM",
        });
        console.log("✅ Success\n");

        // 2. Test booking_confirmed_customer
        console.log("Testing 2/6: 'booking_confirmed_customer'...");
        await WhatsappService.sendBookingConfirmedCustomer(targetPhone, {
            customerName: "Test Customer",
            listingTitle: "Test Studio Space",
            startDate: "2026-04-01",
            startTime: "10:00 AM",
            locationLink: "https://maps.google.com/?q=Test",
        });
        console.log("✅ Success\n");

        // 3. Test booking_reminder_customer
        console.log("Testing 3/6: 'booking_reminder_customer'...");
        await WhatsappService.sendBookingReminderCustomer(targetPhone, {
            customerName: "Test Customer",
            listingTitle: "Test Studio Space",
            startTime: "10:00 AM",
        });
        console.log("✅ Success\n");

        // 4. Test payment_transferred_host
        console.log("Testing 4/6: 'payment_transferred_host'...");
        await WhatsappService.sendPaymentTransferredHost(targetPhone, {
            hostName: "Test Host",
            amount: "₹5,000",
            listingTitle: "Test Studio Space",
            date: "2026-04-01",
        });
        console.log("✅ Success\n");

        // 5. Test booking_received_customer
        console.log("Testing 5/6: 'booking_received_customer'...");
        await WhatsappService.sendBookingReceivedCustomer(targetPhone, {
            customerName: "Test Customer",
            listingTitle: "Test Studio Space",
            startDate: "2026-04-01",
            startTime: "10:00 AM",
        });
        console.log("✅ Success\n");

        // 6. Test booking_cancelled_host
        console.log("Testing 6/6: 'booking_cancelled_host'...");
        await WhatsappService.sendBookingCancelledHost(targetPhone, {
            hostName: "Test Host",
            customerName: "Test Customer",
            listingTitle: "Test Studio Space",
            startDate: "2026-04-01",
        });
        console.log("✅ Success\n");

        console.log("🎉 All 6 templates sent successfully!");

    } catch (error) {
        console.error("\n❌ Test Failed!");
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error(error);
        }

        console.log("\nIf you are getting a 'Template not found' or 'parameter mismatch' error:");
        console.log("1. Ensure you have created the template exactly as named in Meta Manager.");
        console.log("2. Ensure the template is approved (Utility category).");
        console.log("3. Ensure the exact number of variables (e.g. {{1}}, {{2}}) match the properties sent above.");
        process.exit(1);
    }
}

// Ignore self-signed certs in dev testing if needed
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

runTests();
