"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { signOut } from "next-auth/react";
import { memo } from "react";
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
import { MENU_OFFSET, MENU_SURFACE } from "@/components/navbar/menuSurface";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import useUIStore from "@/hooks/useUIStore";
import { isOwner } from "@/lib/user/permissions";
import { cn } from "@/lib/utils";
import { SafeUser } from "@/types/user";

type Props = {
  currentUser?: SafeUser | null;
};

const UserMenu = memo(function UserMenu({ currentUser }: Props) {
  const uiStore = useUIStore();

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button
          aria-label="Open user menu"
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
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={MENU_OFFSET} className={cn(MENU_SURFACE, "min-w-72 p-2")}>
          <div className="flex flex-col gap-1">
            {currentUser ? (
              <>
                <MenuItem href="/dashboard/bookings" label="My Bookings" icon={FiCalendar} />
                <MenuItem href="/dashboard/favorites" label="My Favorites" icon={FiHeart} />
                {isOwner(currentUser.role) && (
                  <>
                    <MenuItem href="/dashboard/reservations" label="Guest Reservations" icon={FiUserCheck} />
                    <MenuItem href="/dashboard/properties" label="My Properties" icon={MdApartment} />
                    <MenuItem onSelect={() => uiStore.onOpen("rent")} label="List your space" icon={FiPlusCircle} />
                  </>
                )}
                <MenuItem href="/dashboard/profile" label="My Profile" icon={FiUser} />
                <DropdownMenu.Separator className="mx-2 my-2 border-t border-neutral-300" />
                <MenuItem onSelect={() => signOut({ callbackUrl: "/" })} label="Logout" icon={FiLogOut} />
              </>
            ) : (
              <>
                <MenuItem onSelect={() => uiStore.onOpen("login")} label="Login" icon={FiLogIn} />
                <MenuItem onSelect={() => uiStore.onOpen("register")} label="Sign up" icon={FiUserPlus} />
              </>
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
});

export default UserMenu;
