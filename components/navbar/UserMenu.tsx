"use client";

import Image from "next/image";
import { signOut } from "next-auth/react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AiOutlineMenu } from "react-icons/ai";
import {
  FiCalendar,
  FiHeart,
  FiLogIn,
  FiLogOut,
  FiPlusCircle,
  FiUser,
  FiUserCheck,
  FiUserPlus,
} from "react-icons/fi";
import { MdApartment } from "react-icons/md";

import Avatar from "@/components/ui/Avatar";
import useLoginModel from "@/hook/useLoginModal";
import useRegisterModal from "@/hook/useRegisterModal";
import useRentModal from "@/hook/useRentModal";
import { SafeUser } from "@/types/user";

import MenuItem from "./MenuItem";

type Props = {
  currentUser?: SafeUser | null;
};

const UserMenu = memo(function UserMenu({ currentUser }: Props) {

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
    if (!isOpen) return;

    const handleClickOutside = (event: PointerEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest(".ai-outline-menu")
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleClickOutside);

    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, [isOpen]);



  const handleRent = useCallback(() => {
    rentModel.onOpen();
    closeMenu();
  }, [rentModel, closeMenu]);

  const handleLogout = useCallback(() => {
    signOut({ callbackUrl: "/" });
    closeMenu();
  }, [closeMenu]);

  const openLogin = useCallback(() => {
    loginModel.onOpen();
    closeMenu();
  }, [loginModel, closeMenu]);

  const openRegister = useCallback(() => {
    registerModel.onOpen();
    closeMenu();
  }, [registerModel, closeMenu]);

  return (
    <div className="relative">
      <div className="flex">
        <button
          type="button"
          onClick={toggleOpen}
          className="ai-outline-menu p-4 md:py-1 md:px-2 border-2 flex flex-row items-center gap-3 rounded-full cursor-pointer hover:shadow-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-black bg-white"
        >
          <AiOutlineMenu />
          <div className="hidden md:block">
            {currentUser ? (
              <Avatar src={currentUser?.image!} />
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
        </button>
      </div>
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute rounded-xl min-w-60 bg-white overflow-hidden right-0 top-[3.2rem] text-sm p-3 border border-neutral-200"
        >
          <div className="flex flex-col">
            {currentUser ? (
              <>
                <MenuItem onClick={closeMenu} href="/bookings" label="My Bookings" icon={FiCalendar} />
                <MenuItem onClick={closeMenu} href="/favorites" label="My Favorites" icon={FiHeart} />
                {currentUser?.is_owner && (
                  <>
                    <MenuItem onClick={closeMenu} href="/reservations" label="Guest Reservations" icon={FiUserCheck} />
                    <MenuItem onClick={closeMenu} href="/properties" label="My Properties" icon={MdApartment} />
                    <MenuItem onClick={handleRent} label="List your space" icon={FiPlusCircle} />
                  </>
                )}
                <MenuItem onClick={closeMenu} href="/profile" label="My Profile" icon={FiUser} />
                <hr className="my-2" />
                <MenuItem onClick={handleLogout} label="Logout" icon={FiLogOut} />
              </>
            ) : (
              <>
                <MenuItem onClick={openLogin} label="Login" icon={FiLogIn} />
                <MenuItem onClick={openRegister} label="Sign up" icon={FiUserPlus} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

UserMenu.displayName = "UserMenu";

export default UserMenu;
