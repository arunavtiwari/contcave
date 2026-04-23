import getCurrentUser from "@/app/actions/getCurrentUser";
import Navbar from "@/components/navbar/Navbar";

export default async function NavbarWrapper() {
    const currentUser = await getCurrentUser();
    return <Navbar currentUser={currentUser} />;
}
