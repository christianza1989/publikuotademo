import Link from "next/link";
import { Globe, File, BarChart2, History, BookOpen } from "lucide-react";

const menuItems = [
  { name: "Dashboard", icon: BarChart2, href: "/" },
  { name: "Statistics", icon: BarChart2, href: "/statistics" },
  { name: "My articles", icon: File, href: "/my-articles" },
  { name: "Available portals", icon: Globe, href: "/portals" },
  { name: "Submit a Publication", icon: BookOpen, href: "/write" },
  { name: "Active Publications", icon: File, href: "/active-publications" },
  { name: "History", icon: History, href: "/history" },
];

export default function Sidebar() {
  return (
    <aside className="w-64 flex-shrink-0 bg-gray-50 border-r p-4 flex flex-col">
      <div className="mb-8">
        <h2 className="text-lg font-semibold">I am Advertiser</h2>
      </div>
      <nav className="flex flex-col gap-2">
        {menuItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-md"
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
