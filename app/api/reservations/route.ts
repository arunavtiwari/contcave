import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { NextResponse } from "next/server";
import axios from 'axios';
import { format } from 'date-fns';

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  const body = await request.json();

  const { listingId, startDate, startTime, endTime, totalPrice, selectedAddons } = body;

  if (!listingId || !startDate || !startTime || !endTime || !totalPrice) {
    return NextResponse.error();
  }

  const listenAndReservation = await prisma.listing.update({
    where: {
      id: listingId,
    },
    data: {
      reservations: {
        create: {
          userId: currentUser.id,
          startDate,
          startTime,
          endTime,
          totalPrice,
          selectedAddons
        },
      },
    },
    include: {
      user: true, // Include the user (business owner) related to the listing
    },
  });

  const studio = await prisma.listing.findFirst({
    where: {
      id: listingId,
    },

    include: {
      user: true, // Include the user (business owner) related to the listing
    },
  });

  const businessOwner = listenAndReservation.user;
  const formattedStartDate = format(new Date(startDate), 'dd/MM/yyyy');
  const formattedStartTime = format(new Date(startTime), 'hh:mm a');
  const formattedEndTime = format(new Date(endTime), 'hh:mm a');
  const selectedAddonsList = selectedAddons ? selectedAddons.join(', ') : 'None';

  if (businessOwner && businessOwner.email) {
    const emailData = {
      from: {
        email: "MS_d3w7dy@trial-z3m5jgry3mz4dpyo.mlsender.net",  // Your verified sender email
        name: "Contcave"
      },
      to: [
        {
          email: businessOwner.email,
          name: businessOwner.name || "Business Owner"
        }
      ],
      subject: "New Reservation Created",
      html: `
      <p>Dear ${businessOwner.name || "Business Owner"},</p>
      <p>A new reservation has been created for your listing by ${currentUser.name}.</p>
      <p>Details:</p>
      <ul>
        <li>Start Date: ${formattedStartDate}</li>
        <li>Start Time: ${formattedStartTime}</li>
        <li>End Time: ${formattedEndTime}</li>
        <li>Total Price: ${totalPrice}</li>
        <li>Selected Add-ons: ${selectedAddonsList}</li>
      </ul>
      <p>Thank you!</p>
      `
    };



    try {
      await axios.post('https://api.mailersend.com/v1/email', emailData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mlsn.1c4f0b03ea83778b9404adde67de248c6501d4eec3f3d9b040efa630f3ff163a`  // Replace with your MailerSend API key
        }
      });
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }


  if (currentUser && currentUser.email) {
    const emailData = {
      from: {
        email: "MS_d3w7dy@trial-z3m5jgry3mz4dpyo.mlsender.net",  // Your verified sender email
        name: "Contcave"
      },
      to: [
        {
          email: currentUser.email,
          name: currentUser.name || "Customer"
        }
      ],
      subject: `Your Studio Booking with at ${studio?.title || "Studio Name"}  is Confirmed!`,
      html: `
      <p>Hi ${currentUser.name || "Customer"},</p>

      <p>This email confirms your booking for ${studio?.title || "Studio Name"} on ${formattedStartDate} from ${formattedStartTime} to ${formattedEndTime}. We're thrilled you chose ContCave to find the perfect space for your creative project!</p>
      
      <p><strong>Booking Details:</strong></p>
      <ul>
        <li>Studio: ${studio?.title || "Studio Name"}</li>
        <li>Date: ${formattedStartDate}</li>
        <li>Time: ${formattedStartTime} - ${formattedEndTime}</li>
      </ul>
      
      <p><strong>Next Steps:</strong></p>
      <ul>
        <li>Review Studio Guidelines: Please take a moment to review the studio's specific guidelines. These guidelines may include information about parking, equipment usage, and access procedures.</li>
      </ul>
      
      <p><strong>Need Help?</strong></p>
      <p>If you have any questions about your booking or need assistance with anything else, please don't hesitate to contact ContCave support at <a href="mailto:support@contcave.tech">support@contcave.tech</a></p>
      
      <p>We're here to ensure you have a smooth and successful shoot!</p>
      
      <p>Sincerely,</p>
      <p>The ContCave Team</p>
      
      `
    };

    

    try {
      await axios.post('https://api.mailersend.com/v1/email', emailData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mlsn.1c4f0b03ea83778b9404adde67de248c6501d4eec3f3d9b040efa630f3ff163a`  // Replace with your MailerSend API key
        }
      });
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }

  return NextResponse.json(listenAndReservation);
}
