"use client";

import { memo } from "react";

import Container from "@/components/Container";
import Logo from "@/components/navbar/Logo";
import NotificationMenu from "@/components/navbar/NotificationMenu";
import Search from "@/components/navbar/Search";
import UserMenu from "@/components/navbar/UserMenu";
import { SafeUser } from "@/types/user";

type Props = {
  currentUser?: SafeUser | null;
};

const Navbar = memo(function Navbar({ currentUser }: Props) {
  return (
    <div className="fixed w-full bg-background/70 backdrop-blur-md z-30 border-b border-border min-h-16 md:min-h-20">
      <div className="py-4">
        <Container>
          <div className="flex flex-row items-center justify-between gap-3 md:gap-0">
            <Logo />
            <Search />
            <div className="flex items-center gap-3">
              <NotificationMenu currentUser={currentUser} />
              <UserMenu currentUser={currentUser} />
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
});

Navbar.displayName = "Navbar";

export default Navbar;
