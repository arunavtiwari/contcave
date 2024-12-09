import { create } from "zustand";

interface OwnerRegisterModalState {
    isOpen: boolean;
    onOpen: () => void;
    onClose: () => void;
}

const useOwnerRegisterModal = create<OwnerRegisterModalState>((set) => ({
    isOpen: false,
    onOpen: () => set({ isOpen: true }),
    onClose: () => set({ isOpen: false }),
}));

export default useOwnerRegisterModal;
