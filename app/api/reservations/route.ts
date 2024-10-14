import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { NextResponse } from "next/server";
import axios from 'axios';
import { format } from 'date-fns';

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({
      message: 'Unauthorized',
    }, { status: 401 });
  }


  const body = await request.json();

  const { listingId, startDate, startTime, endTime, totalPrice, selectedAddons, instantBooking } = body;



  if (!listingId || !startDate || !startTime || !endTime || !totalPrice) {
    return NextResponse.json({
      message: 'Invalid data provided',
    }, { status: 400 });
  }

  const listenAndReservation = await prisma.listing.update({
    where: {
      id: listingId,
    },
    data: {
      reservations: {
        create: {
          userId: currentUser.id,
          isApproved: instantBooking ? 1 : 0,
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
        email: "MS_8Knbaw@contcave.com",
        name: "Contcave"
      },
      to: [
        {
          email: businessOwner.email,
          name: businessOwner.name || "Dear Studio Owner"
        }
      ],
      subject: "New Reservation for Your Listing!",
      html: `
      <p>Hi ${businessOwner.name || "Business Owner"},</p>
      <p>Great news! You have a new reservation for your listing from ${currentUser.name}.</p>
      <p>Here are the reservation details:</p>
      <ul>
        <li>Start Date: ${formattedStartDate}</li>
        <li>Start Time: ${formattedStartTime}</li>
        <li>End Time: ${formattedEndTime}</li>
        <li>Total Price: ${totalPrice}</li>
        <li>Selected Add-ons: ${selectedAddonsList}</li>
      </ul>
      <p>We recommend you contact ${currentUser.name} (their contact information might be available in the reservation details) to confirm any additional details.</p>
      <p>Thanks,</p>
      <p>The Contcave Team</p>
      `
    };



    try {
      await axios.post('https://api.mailersend.com/v1/email', emailData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MAILERSEND_KEY}` 
        }
      });
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }


  if (currentUser && currentUser.email) {
    const emailData = {
      from: {
        email: "MS_8Knbaw@contcave.com",
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
      <p>If you have any questions about your booking or need assistance with anything else, please don't hesitate to contact ContCave support at <a href="mailto:info@contcave.com">info@contcave.com</a></p>
      
      <p>We're here to ensure you have a smooth and successful shoot!</p>
      
      <p>Sincerely,</p>
      <p>The ContCave Team</p>
      
      `
    };



    try {
      await axios.post('https://api.mailersend.com/v1/email', emailData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MAILERSEND_KEY}` 
        }
      });
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }

  return NextResponse.json(listenAndReservation);
}