import { create } from "zustand";

type ModalType =
    | "login"
    | "register"
    | "ownerRegister"
    | "rent"
    | "search"
    | "addon"
    | "payout";

interface UIStore {
    modals: Record<ModalType, boolean>;
    onOpen: (type: ModalType) => void;
    onClose: (type: ModalType) => void;
    isOpen: (type: ModalType) => boolean;
}

const useUIStore = create<UIStore>((set, get) => ({
    modals: {
        login: false,
        register: false,
        ownerRegister: false,
        rent: false,
        search: false,
        addon: false,
        payout: false,
    },
    onOpen: (type) => set((state) => ({
        modals: { ...state.modals, [type]: true }
    })),
    onClose: (type) => set((state) => ({
        modals: { ...state.modals, [type]: false }
    })),
    isOpen: (type) => get().modals[type],
}));

export default useUIStore;
