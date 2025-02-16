import Link from "next/link";
import { FaCalendar, FaClock, FaArrowUpRightDots } from "react-icons/fa6";
import { FaHome, FaCogs } from "react-icons/fa"

interface SidebarProps {
    selectedMenu: string;
    setSelectedMenu: (menu: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedMenu, setSelectedMenu }) => {
    const sidebarMenuItems = [
        { name: "Edit Property", icon: <FaHome size={22} className="hover:text-white sm:hover:text-black transition" /> },
        { name: "Sync Calendar", icon: <FaCalendar size={22} className="hover:text-white sm:hover:text-black transition" /> },
        { name: "Manage Timings", icon: <FaClock size={22} className="hover:text-white sm:hover:text-black transition" /> },
        { name: "Settings", path: "/services", icon: <FaCogs size={22} className="hover:text-white sm:hover:text-black transition" /> },
    ];

    return (
        <div className="flex fixed flex-col sm:sticky sm:h-screen top-[90px] sm:top-[85px] sm:border-r-2 border-gray-200 px-4 py-1.5 sm:py-10 min-w-[250px] bg-black/30 sm:bg-white h-fit rounded-full sm:rounded-none backdrop-blur-md z-1">
            <nav>
                <ul className="flex sm:flex-col sm:gap-2 gap-2">
                    {sidebarMenuItems.map((item, index) => (
                        <li
                            key={index}
                            className={`px-4 py-3 flex items-center gap-3 sm:hover:bg-gray-100 rounded-full cursor-pointer group ${selectedMenu === item.name ? "bg-gray-200" : ""
                                }`}
                            onClick={() => setSelectedMenu(item.name)}
                        >
                            <span>{item.icon}</span>
                            <span className="hidden sm:block">{item.name}</span>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="mt-5">
                <Link href="/reservations" className="px-4 py-2.5 gap-3 flex items-center bg-black text-white hover:opacity-90 rounded-full cursor-pointer group">
                    <span>
                        <FaArrowUpRightDots size={22} />
                    </span>
                    <span>Check Bookings</span>
                </Link>
            </div>
        </div>
    );
};

export default Sidebar;
