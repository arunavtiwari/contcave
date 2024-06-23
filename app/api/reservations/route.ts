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

  return NextResponse.json(listenAndReservation);
}
