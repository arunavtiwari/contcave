import { create } from "zustand";

interface AddonModelStore {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const useAddonModal = create<AddonModelStore>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));

export default useAddonModal;
