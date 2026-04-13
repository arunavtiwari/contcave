export interface ChatListingSummary {
  title: string;
  imageSrc: string[];
}

export interface ChatBooking {
  listing: ChatListingSummary | null;
  startDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  selectedAddons: unknown;
}

export interface SelectedAddon {
  name: string;
  qty: number;
  price: number;
}
