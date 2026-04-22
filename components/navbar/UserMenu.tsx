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

import MenuItem from "@/components/navbar/MenuItem";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import useUIStore from "@/hooks/useUIStore";
import { SafeUser } from "@/types/user";

type Props = {
  currentUser?: SafeUser | null;
};

const UserMenu = memo(function UserMenu({ currentUser }: Props) {

  const uiStore = useUIStore();
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
    uiStore.onOpen("rent");
    closeMenu();
  }, [uiStore, closeMenu]);

  const handleLogout = useCallback(() => {
    signOut({ callbackUrl: "/" });
    closeMenu();
  }, [closeMenu]);

  const openLogin = useCallback(() => {
    uiStore.onOpen("login");
    closeMenu();
  }, [uiStore, closeMenu]);

  const openRegister = useCallback(() => {
    uiStore.onOpen("register");
    closeMenu();
  }, [uiStore, closeMenu]);

  return (
    <div className="relative">
      <div className="flex">
        <Button
          onClick={toggleOpen}
          variant="ghost"
          rounded
          classNames="ai-outline-menu p-4 md:py-1 md:px-2 border-2 flex flex-row items-center gap-3 bg-background"
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
        </Button>
      </div>
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute rounded-xl min-w-60 bg-background/80 backdrop-blur-md overflow-hidden right-0 top-[3.2rem] text-sm p-3 border border-border shadow-xs"
        >
          <div className="flex flex-col">
            {currentUser ? (
              <>
                <MenuItem onClick={closeMenu} href="/dashboard/bookings" label="My Bookings" icon={FiCalendar} />
                <MenuItem onClick={closeMenu} href="/dashboard/favorites" label="My Favorites" icon={FiHeart} />
                {currentUser?.is_owner && (
                  <>
                    <MenuItem onClick={closeMenu} href="/dashboard/reservations" label="Guest Reservations" icon={FiUserCheck} />
                    <MenuItem onClick={closeMenu} href="/dashboard/properties" label="My Properties" icon={MdApartment} />
                    <MenuItem onClick={handleRent} label="List your space" icon={FiPlusCircle} />
                  </>
                )}
                <MenuItem onClick={closeMenu} href="/dashboard/profile" label="My Profile" icon={FiUser} />
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

