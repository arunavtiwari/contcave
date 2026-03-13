# WhatsApp Meta Templates

## 1. `booking_received_host`
**Category:** Utility
**Recipient:** Studio Owner
**Body Content:** 
```text
Hello {{1}}, you have a new booking request that requires your attention. The request is for your studio {{3}} by the customer named {{2}}. The requested date is {{4}} and the time slot is {{5}}. Please log in to your dashboard to either approve or reject this booking.
```
**Sample Information:**
* `{{1}}`: (Host Name) e.g., *Sita*
* `{{2}}`: (Customer Name) e.g., *Arun*
* `{{3}}`: (Studio Name) e.g., *Contcave Studio Delhi*
* `{{4}}`: (Date) e.g., *15 Oct 2026*
* `{{5}}`: (Time) e.g., *10:00 AM to 12:00 PM*

---

## 2. `booking_confirmed_customer`
**Category:** Utility
**Recipient:** Customer
**Body Content:** 
```text
Hello {{1}}, great news! Your upcoming booking for the studio {{2}} scheduled on the date {{3}} at the time {{4}} has been successfully confirmed. You can find the exact venue location here: {{5}}. We hope you have a fantastic experience at the studio!
```
**Sample Information:**
* `{{1}}`: (Customer Name) e.g., *Arun*
* `{{2}}`: (Studio Name) e.g., *Contcave Studio Delhi*
* `{{3}}`: (Date) e.g., *15 Oct 2026*
* `{{4}}`: (Time) e.g., *10:00 AM to 12:00 PM*
* `{{5}}`: (Google Maps Link) e.g., *https://goo.gl/maps/QWERTY*

---

## 3. `booking_reminder_customer`
**Category:** Utility
**Recipient:** Customer
**Body Content:** 
```text
Hello {{1}}, this is a quick reminder about your upcoming session. Your booking at our studio {{2}} is scheduled for tomorrow at {{3}}. Please make sure to arrive on time. We look forward to seeing you there!
```
**Sample Information:**
* `{{1}}`: (Customer Name) e.g., *Arun*
* `{{2}}`: (Studio Name) e.g., *Contcave Studio Delhi*
* `{{3}}`: (Time) e.g., *10:00 AM to 12:00 PM*

---

## 4. `payment_transferred_host`
**Category:** Utility
**Recipient:** Studio Owner
**Body Content:** 
```text
Hello {{1}}, we wanted to inform you that your recent payout amount of {{2}} for the completed booking at your studio {{3}} on the date {{4}} has been successfully processed and transferred to your registered bank account. Thank you for hosting with us!
```
**Sample Information:**
* `{{1}}`: (Host Name) e.g., *Sita*
* `{{2}}`: (Amount) e.g., *₹1500*
* `{{3}}`: (Studio Name) e.g., *Contcave Studio Delhi*
* `{{4}}`: (Date) e.g., *16 Oct 2026*

---

## 5. `booking_received_customer`
**Category:** Utility
**Recipient:** Customer 
**Body Content:** 
```text
Hello {{1}}, thank you for choosing us! We have successfully received your new booking request for the studio {{2}} on the date {{3}} for the time slot {{4}}. We will notify you via a new message as soon as the host reviews and approves your request.
```
**Sample Information:**
* `{{1}}`: (Customer Name) e.g., *Arun*
* `{{2}}`: (Studio Name) e.g., *Contcave Studio Delhi*
* `{{3}}`: (Date) e.g., *15 Oct 2026*
* `{{4}}`: (Time) e.g., *10:00 AM to 12:00 PM*

---

## 6. `booking_cancelled_host`
**Category:** Utility
**Recipient:** Studio Owner
**Body Content:** 
```text
Hello {{1}}, we are writing to inform you that the upcoming booking for your studio {{3}} scheduled on the date {{4}} has unfortunately been cancelled by the customer, whose name is {{2}}. Your calendar has been updated accordingly.
```
**Sample Information:**
* `{{1}}`: (Host Name) e.g., *Sita*
* `{{2}}`: (Customer Name) e.g., *Arun*
* `{{3}}`: (Studio Name) e.g., *Contcave Studio Delhi*
* `{{4}}`: (Date) e.g., *15 Oct 2026*
