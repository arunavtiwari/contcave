import Container from "../Container";
import Logo from "./Logo";
import Search from "./Search";
import UserMenu from "./UserMenu";
import { SafeUser } from "@/types";

type Props = { currentUser?: SafeUser | null };

export default function Navbar({ currentUser }: Props) {
  return (
    <div className="fixed inset-x-0 top-0 z-30 bg-white shadow-sm">
      <div className="py-4 border-b">
        <Container>
          <div className="flex items-center justify-between gap-3 md:gap-0">
            <Logo />
            <Search />
            <UserMenu currentUser={currentUser} />
          </div>
        </Container>
      </div>
    </div>
  );
}
