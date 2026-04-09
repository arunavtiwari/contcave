import { Suspense } from "react";

import getCurrentUser from "@/app/actions/getCurrentUser";
import Navbar from "@/components/navbar/Navbar";

async function NavbarLoader() {
    const currentUser = await getCurrentUser();
    return <Navbar currentUser={currentUser} />;
}

export default function NavbarWrapper() {
    return (
        <Suspense fallback={<Navbar currentUser={null} />}>
            <NavbarLoader />
        </Suspense>
    );
}
