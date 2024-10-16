"use client";

import Image from "next/image";
import { FC, useState, useEffect } from "react";
import Ably from "ably";
import { Reservation } from "@prisma/client";
export const dynamic = "force-dynamic"

interface ChatClientProps {
  profile: any;
}

interface Message {
  text: string;
  email: string;
  name: string;
  timestamp: string;
}

const ChatClient: FC<ChatClientProps> = ({ profile }) => {
  const reservationId = window.location.pathname.substring(
    window.location.pathname.lastIndexOf("/") + 1
  );
  const [booking, setBooking] = useState<any>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [channel, setChannel] = useState<Ably.RealtimeChannel | null>(null);
  const email1 = profile.email; // Logged-in user's email
  const name = profile.name;

  useEffect(() => {
    const initializeChat = async () => {
      const reservation = await fetch(`/api/reservations/${reservationId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      setBooking(await reservation.json());

      const response = await fetch("/api/ablychat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId }),
      });

      const tokenRequest = await response.json();
      const ably = new Ably.Realtime({
        key: "mqScEw.KR_mtA:hXN4SyJS62x5aW_oF3ZUL5QpkxzgpYltXFl1jmtJfMc",
      });

      const chatChannel = ably.channels.get(`${reservationId}`);
      setChannel(chatChannel);

      // Fetch chat history
      const historyResult = await chatChannel.history({ limit: 100 });
      const historyMessages: Message[] = historyResult.items.map((message) => ({
        text: message.data.text,
        email: message.data.email,
        name: message.data.name,
        timestamp: new Date(message.timestamp).toISOString(),
      }));
      setMessages(historyMessages.reverse()); // Reverse to show oldest first

      // Subscribe to new messages
      chatChannel.subscribe("chat", (message) => {
        setMessages((prev) => [...prev, message.data]);
      });
    };

    initializeChat();
  }, [email1]);

  const sendMessage = () => {
    if (newMessage.trim() && channel) {
      const messageData = {
        text: newMessage,
        email: email1,
        name: name,
        timestamp: new Date().toISOString(),
      };

      channel.publish("chat", messageData);
      setNewMessage(""); // Clear the input after sending
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex flex-grow overflow-hidden">
        {/* Chat Section */}
        <div className="flex flex-col flex-grow bg-gray-50 overflow-hidden">
          <div className="flex-grow overflow-y-auto p-4">
            <div className="flex flex-col space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.email === email1 ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-sm">
                    <div className="text-xs text-gray-600">
                      {msg.name} - {new Date(msg.timestamp).toLocaleString()}
                    </div>
                    <div
                      className={`p-3 rounded-lg ${msg.email === email1 ? "bg-purple-500 text-white" : "bg-gray-200 text-gray-800"
                        }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Input */}
          <footer className="flex-none p-4 border-t bg-white">
            <div className="flex items-center">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-grow p-3 border rounded-lg"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    sendMessage();
                  }
                }}
              />
              <button
                className="ml-2 p-3 rounded-full bg-black text-white"
                onClick={sendMessage}
              >
                &#10148;
              </button>
            </div>
          </footer>
        </div>

        {/* Booking Details Section */}
        <div className="w-1/3 p-4 border-l bg-white flex-none">
          <Image
            src={booking?.listing.imageSrc[0]}
            alt="Property Image"
            width={200}
            height={200}
            className="rounded-lg"
          />
          <h2 className="text-xl font-semibold mt-4">{booking?.listing?.title}</h2>
          <div className="mt-2 text-sm">
            <p>
              Date of booking: <span className="font-semibold">{new Date(booking?.startDate).toLocaleDateString()}</span>
            </p>
            <p>
              Time: <span className="font-semibold">{new Date(booking?.startTime).toLocaleTimeString()} - {new Date(booking?.endTime).toLocaleTimeString()}</span>
            </p>
            <p>
              Duration:
              <span className="font-semibold">
                {(() => {
                  const startTime = new Date(booking?.startTime);
                  const endTime = new Date(booking?.endTime);
                  const durationInMs = endTime.getTime() - startTime.getTime();
                  const durationInHours = durationInMs / (1000 * 60 * 60);
                  return `${durationInHours} hours`;
                })()}
              </span>
            </p>
            <p>
              Add-ons: <span className="font-semibold">{
                booking?.selectedAddons.map((item) => item.name).join(", ") || "None"
              }</span>
            </p>
            <p>
              Add-ons Charge: <span className="font-semibold">₹ {booking?.selectedAddons.reduce((acc, value) => acc + (value.qty * value.price), 0)}</span>
            </p>
            <p>
              Property Charge: <span className="font-semibold">₹ {booking?.totalPrice - booking?.selectedAddons.reduce((acc, value) => acc + (value.qty * value.price), 0)}</span>
            </p>
            <p className="mt-2">
              Total: <span className="font-semibold">₹ {booking?.totalPrice}</span>
            </p>
         
          </div>
        </div>

      </div>
    </div>
  );
};

export default ChatClient;
