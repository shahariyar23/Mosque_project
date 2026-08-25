import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { mockNotifications } from "@/data/mock-user-data";
import { Bell, HandCoins, CalendarDays, Ticket, Info, CheckCircle2 } from "lucide-react";

export default async function NotificationsPage() {
  const session = getSession();

  if (!session) {
    redirect("/signin");
  }

  const getIcon = (category: string) => {
    switch (category) {
      case "Donations": return <HandCoins className="h-5 w-5 text-green-600" />;
      case "Events": return <CalendarDays className="h-5 w-5 text-blue-600" />;
      case "Bookings": return <Ticket className="h-5 w-5 text-purple-600" />;
      case "Announcements": return <Info className="h-5 w-5 text-amber-600" />;
      default: return <Bell className="h-5 w-5 text-[#8d948f]" />;
    }
  };

  const getIconBg = (category: string) => {
    switch (category) {
      case "Donations": return "bg-green-50";
      case "Events": return "bg-blue-50";
      case "Bookings": return "bg-purple-50";
      case "Announcements": return "bg-amber-50";
      default: return "bg-gray-50";
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#17211d]">Notifications</h1>
          <p className="mt-1 text-sm text-[#69726d]">
            Stay updated with your mosque activities and announcements.
          </p>
        </div>
        
        <button className="flex items-center gap-2 rounded-md bg-white border border-[#e5e2d8] px-3 py-1.5 text-sm font-medium text-[#17211d] hover:bg-[#faf9f4] shrink-0 self-start sm:self-auto">
           <CheckCircle2 className="h-4 w-4 text-[#8d948f]"/>
           Mark all as read
        </button>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {["All", "Announcements", "Events", "Donations", "Bookings", "Classes", "System"].map((tab) => (
            <button
              key={tab}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === "All"
                  ? "bg-[#0d4d3b] text-white"
                  : "bg-white text-[#69726d] border border-[#e5e2d8] hover:bg-[#faf9f4]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {mockNotifications.length > 0 ? (
          <div className="flex flex-col rounded-xl border border-[#e5e2d8] bg-white shadow-sm overflow-hidden divide-y divide-[#e5e2d8]">
            {mockNotifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`flex gap-4 p-5 sm:p-6 transition-colors hover:bg-[#faf9f4]/50 ${!notification.read ? 'bg-[#faf9f4]' : 'bg-white'}`}
              >
                <div className="flex flex-col items-center gap-2 shrink-0">
                   <div className={`flex h-10 w-10 items-center justify-center rounded-full ${getIconBg(notification.category)}`}>
                     {getIcon(notification.category)}
                   </div>
                   {!notification.read && (
                      <span className="h-2 w-2 rounded-full bg-[#c79a45]"></span>
                   )}
                </div>
                
                <div className="flex-1">
                   <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                      <h3 className={`text-base ${!notification.read ? 'font-semibold text-[#17211d]' : 'font-medium text-[#17211d]'}`}>
                        {notification.title}
                      </h3>
                      <span className="text-xs text-[#8d948f] shrink-0">{notification.date}</span>
                   </div>
                   <p className={`text-sm ${!notification.read ? 'text-[#17211d]' : 'text-[#69726d]'}`}>
                     {notification.message}
                   </p>
                   
                   {!notification.read && (
                      <div className="mt-3">
                         <button className="text-xs font-medium text-[#0d4d3b] hover:underline">
                           Mark as read
                         </button>
                      </div>
                   )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-[#e5e2d8] border-dashed bg-[#faf9f4]/50 py-16 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm text-[#0d4d3b] mb-4">
               <Bell className="h-8 w-8" />
            </div>
            <h3 className="font-semibold text-[#17211d]">No notifications</h3>
            <p className="mt-2 text-sm text-[#69726d] max-w-sm">
              You're all caught up! We'll notify you when there's an update on your activities.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
