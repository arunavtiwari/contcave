import { create } from "zustand";

interface OwnerModalStore {
  isOpen: boolean;
  shouldOpenOnLoad: boolean;
  onOpen: () => void;
  onClose: () => void;
  setShouldOpenOnLoad: (shouldOpen: boolean) => void;
}

const useOwnerModal = create<OwnerModalStore>((set) => ({
  isOpen: false,
  shouldOpenOnLoad: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
  setShouldOpenOnLoad: (shouldOpen) => set({ shouldOpenOnLoad: shouldOpen }),
}));

export default useOwnerModal;
