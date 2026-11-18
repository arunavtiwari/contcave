"use client";

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

import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import useUIStore from "@/hooks/useUIStore";
import { isOwner } from "@/lib/user/permissions";
import { SafeUser } from "@/types/user";

type Props = {
  currentUser?: SafeUser | null;
};

const UserMenu = memo(function UserMenu({ currentUser }: Props) {
  const uiStore = useUIStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
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
      </DropdownMenuTrigger>

      <DropdownMenuContent className="min-w-72 p-2">
          <div className="flex flex-col gap-1">
            {currentUser ? (
              <>
                <DropdownMenuItem href="/dashboard/bookings" label="My Bookings" icon={FiCalendar} />
                <DropdownMenuItem href="/dashboard/favorites" label="My Favorites" icon={FiHeart} />
                {isOwner(currentUser.role) && (
                  <>
                    <DropdownMenuItem href="/dashboard/reservations" label="Guest Reservations" icon={FiUserCheck} />
                    <DropdownMenuItem href="/dashboard/properties" label="My Properties" icon={MdApartment} />
                    <DropdownMenuItem onSelect={() => uiStore.onOpen("rent")} label="List your space" icon={FiPlusCircle} />
                  </>
                )}
                <DropdownMenuItem href="/dashboard/profile" label="My Profile" icon={FiUser} />
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => signOut({ callbackUrl: "/" })} label="Logout" icon={FiLogOut} />
              </>
            ) : (
              <>
                <DropdownMenuItem onSelect={() => uiStore.onOpen("login")} label="Login" icon={FiLogIn} />
                <DropdownMenuItem onSelect={() => uiStore.onOpen("register")} label="Sign up" icon={FiUserPlus} />
              </>
            )}
          </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export default UserMenu;
