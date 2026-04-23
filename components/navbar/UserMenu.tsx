"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { SafeUser, UserRole } from "@/types/user";

type Props = {
  currentUser?: SafeUser | null;
};

const UserMenu = memo(function UserMenu({ currentUser }: Props) {
  const uiStore = useUIStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0 });

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const updateCoords = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({
          top: rect.bottom + 12,
          right: window.innerWidth - rect.right,
        });
      }
    };

    updateCoords();

    const handleClickOutside = (event: PointerEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleClickOutside);
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, true);

    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
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
          ref={triggerRef}
          onClick={toggleOpen}
          variant="ghost"
          outline
          rounded
          classNames="ai-outline-menu p-4 md:py-1 md:px-2 flex items-center gap-3 transition-all duration-300 border bg-background/80!"
        >
          <AiOutlineMenu className="text-foreground" />
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

      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed rounded-2xl min-w-72 bg-background/70 backdrop-blur-lg overflow-hidden text-sm p-2 border border-border z-100000 flex flex-col gap-1"
              style={{
                top: coords.top,
                right: coords.right,
              }}
            >
              <div className="flex flex-col">
                {currentUser ? (
                  <>
                    <MenuItem onClick={closeMenu} href="/dashboard/bookings" label="My Bookings" icon={FiCalendar} />
                    <MenuItem onClick={closeMenu} href="/dashboard/favorites" label="My Favorites" icon={FiHeart} />
                    {(currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.ADMIN) && (
                      <>
                        <MenuItem onClick={closeMenu} href="/dashboard/reservations" label="Guest Reservations" icon={FiUserCheck} />
                        <MenuItem onClick={closeMenu} href="/dashboard/properties" label="My Properties" icon={MdApartment} />
                        <MenuItem onClick={handleRent} label="List your space" icon={FiPlusCircle} />
                      </>
                    )}
                    <MenuItem onClick={closeMenu} href="/dashboard/profile" label="My Profile" icon={FiUser} />
                    <hr className="my-2 border-white/10" />
                    <MenuItem onClick={handleLogout} label="Logout" icon={FiLogOut} />
                  </>
                ) : (
                  <>
                    <MenuItem onClick={openLogin} label="Login" icon={FiLogIn} />
                    <MenuItem onClick={openRegister} label="Sign up" icon={FiUserPlus} />
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
});

UserMenu.displayName = "UserMenu";

export default UserMenu;

