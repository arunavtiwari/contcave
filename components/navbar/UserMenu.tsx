"use client";

import { AnimatePresence, motion } from "framer-motion";
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
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);

  const getMenuCoords = useCallback(() => {
    const trigger = triggerRef.current;

    if (!trigger) return null;

    const rect = trigger.getBoundingClientRect();

    return {
      top: Math.round(rect.bottom + 12),
      right: Math.max(8, Math.round(window.innerWidth - rect.right)),
    };
  }, []);

  const updateMenuCoords = useCallback(() => {
    const nextCoords = getMenuCoords();

    if (!nextCoords) return;

    setCoords((prevCoords) => {
      if (prevCoords?.top === nextCoords.top && prevCoords.right === nextCoords.right) {
        return prevCoords;
      }

      return nextCoords;
    });
  }, [getMenuCoords]);

  const toggleOpen = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    const nextCoords = getMenuCoords();

    if (nextCoords) {
      setCoords(nextCoords);
    }

    setIsOpen(true);
  }, [getMenuCoords, isOpen]);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let animationFrameId = 0;
    const scheduleCoordsUpdate = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(updateMenuCoords);
    };

    updateMenuCoords();

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
    window.addEventListener("resize", scheduleCoordsUpdate);
    window.addEventListener("scroll", scheduleCoordsUpdate, true);

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener("pointerdown", handleClickOutside);
      window.removeEventListener("resize", scheduleCoordsUpdate);
      window.removeEventListener("scroll", scheduleCoordsUpdate, true);
    };
  }, [isOpen, updateMenuCoords]);

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
          aria-label="Open user menu"
          variant="ghost"
          size="md"
          outline
          rounded
          className="w-10! h-10! md:w-auto! md:h-11! px-0 md:px-2 flex items-center justify-center md:justify-start gap-3 transition-colors duration-200 border bg-background/80! hover:bg-background/90 active:scale-100!"
        >
          <AiOutlineMenu className="text-foreground shrink-0" />
          <div className="hidden md:block shrink-0">
            <Avatar src={currentUser?.image} />
          </div>
        </Button>
      </div>

      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && coords && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="fixed rounded-2xl min-w-72 bg-background/70 backdrop-blur-lg overflow-hidden text-sm p-2 border border-border z-100000 will-change-opacity"
              style={{
                top: coords.top,
                right: coords.right,
              }}
            >
              <div className="flex flex-col gap-1">
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

