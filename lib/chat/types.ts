export interface ChatListingSummary {
  title: string;
  imageSrc: string[];
}

export interface ChatBooking {
  listing: ChatListingSummary | null;
  /** Who the viewer is talking to: the guest's name for hosts, the studio name for guests. */
  counterpartName: string;
  /** wa.me link to the other party, only while the booking is active and they have a valid phone. */
  counterpartWhatsAppUrl: string | null;
  startDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  selectedAddons: unknown;
  status: string;
  readOnly: boolean;
  messages: ChatPersistedMessage[];
}

export interface ChatPersistedMessage {
  id: string;
  text: string;
  senderId: string | null;
  name: string;
  timestamp: string;
  kind: "USER" | "SYSTEM";
}

export interface SelectedAddon {
  name: string;
  qty: number;
  price: number;
}
