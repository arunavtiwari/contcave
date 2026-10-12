"use client";

import { signOut } from "next-auth/react";
import { memo, useCallback, useRef, useState } from "react";
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
import MenuPanel from "@/components/navbar/MenuPanel";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import { useDismiss } from "@/hooks/useDismiss";
import useUIStore from "@/hooks/useUIStore";
import { SafeUser, UserRole } from "@/types/user";

type Props = {
  currentUser?: SafeUser | null;
};

const UserMenu = memo(function UserMenu({ currentUser }: Props) {
  const uiStore = useUIStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  useDismiss(menuRef, isOpen, closeMenu);

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
    <div ref={menuRef} className="relative">
      <div className="flex">
        <Button
          onClick={toggleOpen}
          aria-label="Open user menu"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          variant="ghost"
          size="md"
          outline
          rounded
          className="w-10! h-10! md:w-auto! md:h-11! px-0 md:px-2 flex items-center justify-center md:justify-start gap-3 transition-colors duration-200 border border-neutral-300! bg-background! ring-1 ring-neutral-300/70 hover:bg-muted active:transform-none!"
        >
          <AiOutlineMenu className="text-foreground shrink-0" />
          <div className="hidden md:block shrink-0">
            <Avatar src={currentUser?.image} />
          </div>
        </Button>
      </div>

      <MenuPanel open={isOpen} className="min-w-72 p-2">
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
              <div className="mx-2 my-2 border-t border-border" role="separator" />
              <MenuItem onClick={handleLogout} label="Logout" icon={FiLogOut} />
            </>
          ) : (
            <>
              <MenuItem onClick={openLogin} label="Login" icon={FiLogIn} />
              <MenuItem onClick={openRegister} label="Sign up" icon={FiUserPlus} />
            </>
          )}
        </div>
      </MenuPanel>
    </div>
  );
});

UserMenu.displayName = "UserMenu";

export default UserMenu;

