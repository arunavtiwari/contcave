"use client";

import Ably from "ably";
import { SendHorizontal } from "lucide-react";
import Image from "next/image";
import { FC, useEffect, useRef, useState } from "react";

import Heading from "@/components/ui/Heading";
import {
  calculateDurationHours,
  formatBookingDate,
  formatTimeString,
  normalizeAddons,
} from "@/lib/chat/bookingDisplay";
import type { ChatBooking } from "@/lib/chat/types";
import { SafeUser } from "@/types/user";

interface ChatClientProps {
  initialBooking: ChatBooking;
  profile: SafeUser | null;
  reservationId: string;
}

const MAX_MESSAGE_LENGTH = 2000;

interface Message {
  id: string;
  text: string;
  email: string;
  name: string;
  timestamp: string;
}

interface AblyMessageData {
  text?: string;
  email?: string;
  name?: string;
  timestamp?: string;
}

interface AblyMessageLike {
  id?: string | null;
  timestamp?: number | null;
  data?: AblyMessageData;
}

function buildMessageId(message: Pick<Message, "text" | "email" | "timestamp">) {
  return `${message.timestamp}:${message.email}:${message.text}`;
}

function toChatMessage(message: AblyMessageLike): Message | null {
  if (!message?.data || typeof message.data !== "object") {
    return null;
  }

  const { text, email, name, timestamp } = message.data;

  if (typeof text !== "string" || typeof email !== "string") {
    return null;
  }

  const normalizedTimestamp =
    typeof timestamp === "string" && !Number.isNaN(Date.parse(timestamp))
      ? timestamp
      : typeof message.timestamp === "number"
        ? new Date(message.timestamp).toISOString()
        : new Date().toISOString();

  return {
    id:
      typeof message.id === "string" && message.id.length > 0
        ? message.id
        : buildMessageId({
          text,
          email,
          timestamp: normalizedTimestamp,
        }),
    text,
    email,
    name: typeof name === "string" && name.trim().length > 0 ? name : "Anonymous",
    timestamp: normalizedTimestamp,
  };
}

function mergeMessages(existing: Message[], incoming: Message[]) {
  const messageMap = new Map<string, Message>();

  for (const message of [...existing, ...incoming]) {
    messageMap.set(message.id, message);
  }

  return Array.from(messageMap.values()).sort(
    (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
  );
}

const ChatClient: FC<ChatClientProps> = ({ initialBooking, profile, reservationId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isChannelReady, setIsChannelReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ablyRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userId = profile?.id ?? null;
  const userEmail = profile?.email ?? null;
  const userName = profile?.name ?? "Anonymous";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!reservationId || !userId || !userEmail) {
      setIsChannelReady(false);
      setError("Authentication is required to access this chat.");
      return;
    }

    let isDisposed = false;
    let handleIncomingMessage: ((incoming: AblyMessageLike) => void) | null = null;

    const handleConnectionFailed = () => {
      if (!isDisposed) {
        setIsChannelReady(false);
        setError("Realtime connection failed. Please refresh and try again.");
      }
    };

    const handleConnectionSuspended = () => {
      if (!isDisposed) {
        setIsChannelReady(false);
        setError("Realtime connection was suspended. Trying to recover.");
      }
    };

    const handleConnectionConnected = () => {
      if (!isDisposed) {
        setIsChannelReady(true);
        setError(null);
      }
    };

    const initialize = async () => {
      try {
        setError(null);
        setMessages([]);
        setIsChannelReady(false);

        const ably = new Ably.Realtime({
          authUrl: "/api/ablychat",
          authMethod: "POST",
          authParams: { reservationId },
          clientId: userId,
          useTokenAuth: true,
        });
        ablyRef.current = ably;

        ably.connection.on("failed", handleConnectionFailed);
        ably.connection.on("suspended", handleConnectionSuspended);
        ably.connection.on("connected", handleConnectionConnected);

        const chatChannel = ably.channels.get(reservationId);
        channelRef.current = chatChannel;

        handleIncomingMessage = (incoming: AblyMessageLike) => {
          if (isDisposed) {
            return;
          }

          const normalized = toChatMessage(incoming);
          if (!normalized) {
            return;
          }

          setMessages((previousMessages) => mergeMessages(previousMessages, [normalized]));
        };

        chatChannel.subscribe("chat", handleIncomingMessage);
        await chatChannel.attach();
        setIsChannelReady(true);

        const history = await chatChannel.history({ limit: 100 });
        const historyMessages = history.items
          .map((message) => toChatMessage(message as AblyMessageLike))
          .filter((message): message is Message => Boolean(message));

        if (!isDisposed) {
          setMessages((previousMessages) => mergeMessages(previousMessages, historyMessages));
        }
      } catch (err) {
        if (isDisposed) {
          return;
        }

        console.error("[ChatClient] Initialization error:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize chat.");
      }
    };

    void initialize();

    return () => {
      isDisposed = true;
      const currentChannel = channelRef.current;
      const currentAbly = ablyRef.current;

      channelRef.current = null;
      ablyRef.current = null;

      if (currentChannel && handleIncomingMessage) {
        currentChannel.unsubscribe("chat", handleIncomingMessage);
      }

      if (currentAbly) {
        currentAbly.connection.off("failed", handleConnectionFailed);
        currentAbly.connection.off("suspended", handleConnectionSuspended);
        currentAbly.connection.off("connected", handleConnectionConnected);

        const connectionState = currentAbly.connection.state;

        if (connectionState !== "closed" && connectionState !== "closing") {
          try {
            currentAbly.close();
          } catch (closeError) {
            console.warn("[ChatClient] Ignored Ably close error during cleanup:", closeError);
          }
        }
      }
    };
  }, [reservationId, userEmail, userId]);

  const handleSend = async () => {
    const channel = channelRef.current;
    const trimmedMessage = newMessage.trim();

    if (!trimmedMessage || !channel || !userEmail || isSending || !isChannelReady) {
      return;
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      setError(`Message is too long. Maximum ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    setIsSending(true);
    setError(null);
    setNewMessage("");

    try {
      await channel.publish("chat", {
        text: trimmedMessage,
        email: userEmail,
        name: userName,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[ChatClient] Send message error:", err);
      setNewMessage(trimmedMessage);
      setError("Message could not be sent. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const addons = normalizeAddons(initialBooking.selectedAddons);
  const addonsCharge = addons.reduce((acc, value) => acc + value.qty * value.price, 0);
  const duration = calculateDurationHours(initialBooking.startTime, initialBooking.endTime);
  const propertyCharge = Math.max(0, initialBooking.totalPrice - addonsCharge);
  const bookingDateLabel = formatBookingDate(initialBooking.startDate);
  const bookingTimeLabel =
    initialBooking.startTime && initialBooking.endTime
      ? `${formatTimeString(initialBooking.startTime)} – ${formatTimeString(initialBooking.endTime)}`
      : "—";
  const propertyImage = initialBooking.listing?.imageSrc?.find(
    (image): image is string => typeof image === "string" && image.trim().length > 0
  );

  return (
    <div className="flex flex-col gap-5">
      <Heading title={`Chat with ${initialBooking.listing?.title || "Host"}`} />
      <div className="flex h-[calc(100vh-180px)] w-full grow flex-col gap-5 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-muted">
          <div className="grow overflow-y-auto p-4">
            <div className="flex flex-col space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {messages.length === 0 ? (
                <div className="text-sm text-gray-500">No messages yet.</div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.email === userEmail ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[85%] md:max-w-sm">
                      <div
                        className={`p-2.5 rounded-full px-4 ${message.email === userEmail
                          ? "bg-black text-white"
                          : "border border-border bg-background text-foreground"
                          }`}
                      >
                        {message.text}
                      </div>
                      <div className="text-xs text-gray-600 mt-2">
                        {message.name} - {new Date(message.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="flex-none p-4 border-t bg-background">
            <div className="text-xs text-gray-500 mb-2 flex items-center justify-between">
              <span>{isChannelReady ? "Connected" : "Connecting..."}</span>
              <span>{newMessage.length}/{MAX_MESSAGE_LENGTH}</span>
            </div>
            <div className="flex items-stretch">
              <input
                type="text"
                placeholder="Type a message..."
                className="grow rounded-l-full border border-neutral-300 px-4 py-2 outline-none focus:border-black"
                value={newMessage}
                onChange={(event) => {
                  setNewMessage(event.target.value);
                  setError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                disabled={isSending}
                maxLength={MAX_MESSAGE_LENGTH}
              />
              <button
                className="flex items-center justify-center rounded-r-full bg-black px-4 text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
                onClick={() => {
                  void handleSend();
                }}
                disabled={!newMessage.trim() || isSending || !isChannelReady}
                aria-label="Send message"
              >
                <SendHorizontal size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="w-full shrink-0 rounded-xl border border-border bg-background p-5 lg:w-85">
          {propertyImage ? (
            <Image
              src={propertyImage}
              alt="Property Image"
              width={340}
              height={220}
              className="aspect-16/10 w-full rounded-lg object-cover"
            />
          ) : null}
          <h2 className="mt-4 text-xl font-semibold leading-tight text-gray-900">
            {initialBooking.listing?.title}
          </h2>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <span className="text-gray-600">Date of booking:</span>
              <span className="text-right font-semibold text-gray-900">{bookingDateLabel}</span>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <span className="text-gray-600">Time:</span>
              <span className="text-right font-semibold text-gray-900">{bookingTimeLabel}</span>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <span className="text-gray-600">Duration:</span>
              <span className="text-right font-semibold text-gray-900">
                {duration > 0 ? `${duration} hours` : "—"}
              </span>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <span className="text-gray-600">Add-ons:</span>
              <span className="text-right font-semibold text-gray-900">
                {addons.length > 0 ? addons.map((item) => item.name).join(", ") : "None"}
              </span>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-t border-border pt-3">
              <span className="text-gray-600">Add-ons Charge:</span>
              <span className="text-right font-semibold text-gray-900">₹ {addonsCharge}</span>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
              <span className="text-gray-600">Property Charge:</span>
              <span className="text-right font-semibold text-gray-900">
                ₹ {propertyCharge}
              </span>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-t border-neutral-300 pt-3">
              <span className="font-semibold text-gray-800">Total:</span>
              <span className="text-right font-semibold text-gray-900">₹ {initialBooking.totalPrice}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatClient;
