"use client";

import { memo } from "react";

import Container from "@/components/Container";
import { SafeUser } from "@/types/user";

import Logo from "./Logo";
import Search from "./Search";
import UserMenu from "./UserMenu";

type Props = {
  currentUser?: SafeUser | null;
};

const Navbar = memo(function Navbar({ currentUser }: Props) {
  return (
    <div className="fixed w-full bg-white/70 backdrop-blur-md z-30 shadow-sm border-b border-gray-100">
      <div className="py-4">
        <Container>
          <div className="flex flex-row items-center justify-between gap-3 md:gap-0">
            <Logo />
            <Search />
            <UserMenu currentUser={currentUser} />
          </div>
        </Container>
      </div>
    </div>
  );
});

Navbar.displayName = "Navbar";

export default Navbar;
