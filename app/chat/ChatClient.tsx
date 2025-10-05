"use client";

import Image from "next/image";
import { FC, useState, useEffect } from "react";
import Ably from "ably";
import Heading from "@/components/Heading";
import Loader from "@/components/Loader";
export const dynamic = "force-dynamic";

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
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [channel, setChannel] = useState<Ably.RealtimeChannel | null>(null);
  const email1 = profile.email;
  const name = profile.name;

  useEffect(() => {
    let chatChannel: Ably.RealtimeChannel;
    let ably: Ably.Realtime;

    const initializeChat = async () => {
      try {
        const reservationRes = await fetch(`/api/reservations/${reservationId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const bookingData = await reservationRes.json();
        setBooking(bookingData);

        await fetch("/api/ablychat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reservationId }),
        });

        ably = new Ably.Realtime({
          key: process.env.NEXT_PUBLIC_ABLY_CHAT_API!,
          clientId: email1,
        });

        chatChannel = ably.channels.get(`${reservationId}`);
        setChannel(chatChannel);

        const historyResult = await chatChannel.history({ limit: 100 });
        const historyMessages: Message[] = historyResult.items.map((message) => ({
          text: message.data.text,
          email: message.data.email,
          name: message.data.name,
          timestamp: new Date(message.timestamp).toISOString(),
        }));
        setMessages(historyMessages.reverse());

        chatChannel.subscribe("chat", (msg) => {
          setMessages((prev) => {
            if (prev.some((existingMsg) => existingMsg.timestamp === msg.data.timestamp)) {
              return prev;
            }
            return [...prev, msg.data as Message];
          });
        });
      } catch (error) {
        console.error("Error initializing chat:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeChat();

    return () => {
      if (chatChannel) {
        chatChannel.unsubscribe("chat");
      }
      if (ably) {
        ably.close();
      }
    };
  }, [email1, reservationId]);

  if (loading) {
    return <Loader />;
  }

  const sendMessage = () => {
    if (newMessage.trim() && channel) {
      const messageData = {
        text: newMessage,
        email: email1,
        name: name,
        timestamp: new Date().toISOString(),
      };

      channel.publish("chat", messageData);
      setNewMessage("");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Heading title={`Chat with ${booking?.listing?.title}`} />
      <div className="flex flex-grow overflow-hidden w-full items-stretch h-[calc(100vh-180px)]">
        {/* Chat Section */}
        <div className="flex flex-col flex-grow bg-gray-50 overflow-hidden rounded-l-xl border w-3/4">
          <div className="flex-grow overflow-y-auto p-4">
            <div className="flex flex-col space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.email === email1 ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-sm">
                    <div
                      className={`p-2.5 rounded-full px-4 ${msg.email === email1
                        ? "bg-black text-white"
                        : "bg-gray-200 text-gray-800"
                        }`}
                    >
                      {msg.text}
                    </div>
                    <div className="text-xs text-gray-600 mt-2">
                      {msg.name} - {new Date(msg.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Input */}
          <div className="flex-none p-4 border-t bg-white">
            <div className="flex items-stretch">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-grow p-2 border rounded-l-full"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendMessage();
                  }
                }}
              />
              <button className="button rounded-r-full bg-black text-white" onClick={sendMessage}>
                &#10148;
              </button>
            </div>
          </div>
        </div>

        {/* Booking Details Section */}
        {booking && (
          <div className="border bg-white border-l-0 rounded-r-xl p-5 w-1/4">
            <Image
              src={booking?.listing?.imageSrc?.[0]}
              alt="Property Image"
              width={200}
              height={200}
              className="rounded-lg w-full"
            />
            <h2 className="text-xl font-semibold mt-4">{booking?.listing?.title}</h2>
            <div className="mt-2 text-sm flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Date of booking:</span>
                <span className="font-semibold text-gray-900">
                  {new Date(booking?.startDate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  }).replace(" ", ", ")}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span className="font-semibold text-gray-900">
                  {new Date(booking?.startTime).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })} –{" "}
                  {new Date(booking?.endTime).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-semibold text-gray-900">
                  {(() => {
                    const startTime = new Date(booking?.startTime);
                    const endTime = new Date(booking?.endTime);
                    const durationInMs = endTime.getTime() - startTime.getTime();
                    const durationInHours = durationInMs / (1000 * 60 * 60);
                    return `${durationInHours} hours`;
                  })()}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Add-ons:</span>
                <span className="font-semibold text-gray-900">
                  {booking?.selectedAddons.map((item) => item.name).join(", ") || "None"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Add-ons Charge:</span>
                <span className="font-semibold text-gray-900">
                  ₹{" "}
                  {booking?.selectedAddons.reduce((acc, value) => acc + value.qty * value.price, 0)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Property Charge:</span>
                <span className="font-semibold text-gray-900">
                  ₹{" "}
                  {booking?.totalPrice -
                    booking?.selectedAddons.reduce((acc, value) => acc + value.qty * value.price, 0)}
                </span>
              </div>

              <div className="flex justify-between border-t border-gray-300 pt-2 mt-2">
                <span className="text-gray-700 font-semibold">Total:</span>
                <span className="font-semibold text-gray-900">
                  ₹ {booking?.totalPrice}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatClient;