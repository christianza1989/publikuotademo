import { Bell, Settings, UserCircle } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex items-center justify-between p-4 h-16">
        <div>
          <p className="text-sm text-gray-500">{'Publish Your Article > Create'}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-semibold">€0.00</span>
          <Bell className="h-6 w-6 text-gray-600" />
          <UserCircle className="h-6 w-6 text-gray-600" />
          <Settings className="h-6 w-6 text-gray-600" />
        </div>
      </div>
    </header>
  );
}
