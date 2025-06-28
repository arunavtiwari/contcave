"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FaCalendar, FaClock, FaArrowUpRightDots } from "react-icons/fa6";
import { FaHome, FaCogs } from "react-icons/fa";

interface SidebarProps {
    selectedMenu: string;
    setSelectedMenu: (menu: string) => void;
    listingId?: string;
    menuType?: "main" | "profile";
}

const Sidebar: React.FC<SidebarProps> = ({ selectedMenu, setSelectedMenu, listingId, menuType = "main" }) => {
    const router = useRouter();

    const sidebarMenuItems = [
        { name: "Edit Property", icon: <FaHome size={22} className="hover:text-white sm:hover:text-black transition" /> },
        { name: "Sync Calendar", icon: <FaCalendar size={22} className="hover:text-white sm:hover:text-black transition" /> },
        { name: "Manage Timings", icon: <FaClock size={22} className="hover:text-white sm:hover:text-black transition" /> },
        { name: "Settings", icon: <FaCogs size={22} className="hover:text-white sm:hover:text-black transition" />},
        {
            name: "Profile",
            icon: <Image src="/assets/user.svg" width={22} height={22} alt="Profile" className="object-contain" />,
            path: "/Profile",
        },
        {
            name: "Manage Payments",
            icon: <Image src="/assets/faCreditCard-black.svg" width={22} height={22} alt="Payment Details" className="object-contain" />,
            path: "/profile-transaction",
        },
        {
            name: "Share and Refer",
            icon: <Image src="/assets/faUserPlus-black.svg" width={22} height={22} alt="Profile Share" className="object-contain" />,
            path: "/profile-share",
        },
        {
            name: "Settings",
            icon: <Image src="/assets/settings-black.svg" width={22} height={22} alt="Profile Settings" className="object-contain" />,
            path: "/profile-settings",
        },
    ];

    const itemsToDisplay = menuType === "profile" ? sidebarMenuItems.slice(4) : sidebarMenuItems.slice(0, 4);

    return (
        <div className="flex fixed flex-col sm:sticky top-[90px] sm:top-[85px] pr-4 pl-0 py-1.5 sm:py-10 min-w-[250px] bg-black/30 sm:bg-white h-fit rounded-full sm:rounded-none backdrop-blur-md z-1">
            <nav>
                <ul className="flex sm:flex-col sm:gap-2 gap-2">
                    {itemsToDisplay.map((item, index) => (
                        <li
                            key={index}
                            className={`px-4 py-3 flex items-center gap-3 sm:hover:bg-gray-100 rounded-full cursor-pointer group ${selectedMenu === item.name ? "bg-gray-200" : ""
                                }`}
                            onClick={() => {
                                if (item.path) {
                                    router.push(item.path);
                                } else {
                                    setSelectedMenu(item.name);
                                }
                            }}
                        >
                            <span>{item.icon}</span>
                            <span className="hidden sm:block">{item.name}</span>
                        </li>
                    ))}
                </ul>
            </nav>

            {menuType === "main" && (
                <>
                    <div className="mt-5">
                        <Link
                            href="/reservations"
                            className="px-4 py-2.5 gap-3 flex items-center bg-black text-white hover:opacity-90 rounded-full cursor-pointer group justify-center"
                        >
                            <span>
                                <FaArrowUpRightDots size={22} />
                            </span>
                            <span>Check Bookings</span>
                        </Link>
                    </div>

                    {listingId && (
                        <div className="mt-5">
                            <Link
                                href={`/listings/${listingId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 gap-3 flex items-center border border-black rounded-full cursor-pointer group justify-center"
                            >
                                <span>
                                    <FaArrowUpRightDots size={22} />
                                </span>
                                <span>Preview</span>
                            </Link>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Sidebar;