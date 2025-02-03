"use client";

import useLoginModel from "@/hook/useLoginModal";
import useRegisterModal from "@/hook/useRegisterModal";
import useRentModal from "@/hook/useRentModal";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SafeUser } from "@/types";
import { signOut } from "next-auth/react";
import { useCallback, useState, useRef, useEffect } from "react";
import { AiOutlineMenu } from "react-icons/ai";
import Avatar from "../Avatar";
import MenuItem from "./MenuItem";

type Props = {
  currentUser?: SafeUser | null;
};

function UserMenu({ currentUser }: Props) {
  const router = useRouter();
  const registerModel = useRegisterModal();
  const loginModel = useLoginModel();
  const rentModel = useRentModal();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const toggleOpen = useCallback(() => {
    setIsOpen((isOpen) => !isOpen);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('.ai-outline-menu')
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleClickOutside);

    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, [closeMenu]);

  const onRentEquip = useCallback(() => {
    window.alert("Coming soon");
  }, []);

  const onHireTalent = useCallback(() => {
    window.alert("Coming soon");
  }, []);

  const onRent = useCallback(() => {
    rentModel.onOpen();
  }, [rentModel]);

  return (
    <div className="relative">
      <div className="flex flex-row items-center gap-3">
        <div className="flex flex-row items-center gap-1">
          <div
            className="hidden md:block text-sm font-semibold p-3 rounded-full hover:bg-neutral-100 transition cursor-pointer"
            onClick={onRent}
          >
            List Your Space
          </div>
          <div
            className="hidden md:block text-sm font-semibold p-3 rounded-full hover:bg-neutral-100 transition cursor-pointer"
            onClick={onRentEquip}
          >
            Rent Equipment
          </div>
          <div
            className="hidden md:block text-sm font-semibold p-3 rounded-full hover:bg-neutral-100 transition cursor-pointer"
            onClick={onHireTalent}
          >
            Hire Talent
          </div>
        </div>
        <div
          onClick={toggleOpen}
          className="ai-outline-menu p-4 md:py-1 md:px-2 border-[2px] flex flex-row items-center gap-3 rounded-full cursor-pointer hover:shadow-md transition"
        >
          <AiOutlineMenu />
          <div className="hidden md:block">
            {currentUser ? (
              <Avatar src={currentUser?.image!} userName={currentUser?.name} />
            ) : (
              <Image
                className="rounded-full"
                height="30"
                width="30"
                alt="Avatar"
                src="/assets/avatar.png"
              />
            )}
          </div>
        </div>
      </div>
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute rounded-xl shadow-solid-6 w-[40vw] md:w-3/4 bg-white overflow-hidden right-0 top-[3.2rem] text-sm p-3"
        >
          <div className="flex flex-col cursor-pointer">
            {currentUser ? (
              <>
                <MenuItem onClick={() => { router.push("/bookings"); closeMenu(); }} label="My Bookings" />
                <MenuItem onClick={() => { router.push("/favorites"); closeMenu(); }} label="My Favorites" />
                <MenuItem onClick={() => { router.push("/reservations"); closeMenu(); }} label="Guest Reservations" />
                <MenuItem onClick={() => { router.push("/properties"); closeMenu(); }} label="My Properties" />
                <MenuItem onClick={() => { onRent(); closeMenu(); }} label="List your space" />
                <MenuItem onClick={() => { router.push("/Profile"); closeMenu(); }} label="My Profile" />
                <MenuItem onClick={() => { signOut(); closeMenu(); }} label="Logout" />
              </>
            ) : (
              <>
                <MenuItem onClick={() => { loginModel.onOpen(); closeMenu(); }} label="Login" />
                <MenuItem onClick={() => { registerModel.onOpen(); closeMenu(); }} label="Sign up" />

              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
