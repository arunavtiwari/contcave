"use client";

import { SafeUser } from "@/types/user";
import Container from "@/components/Container";
import Logo from "./Logo";
import Search from "./Search";
import UserMenu from "./UserMenu";


type Props = {
  currentUser?: SafeUser | null;
};

function Navbar({ currentUser }: Props) {
  return (
    <div className="fixed w-full bg-white z-30 shadow-xs">
      <div className="py-4 border-b">
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
}

export default Navbar;
