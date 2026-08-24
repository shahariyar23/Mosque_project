export const mockDashboardStats = {
  totalDonations: 45000,
  upcomingEvents: 2,
  activeBookings: 1,
  registeredClasses: 1,
};

export const mockRecentActivity = [
  { id: "1", action: "Donation completed", date: "Today", icon: "donation" },
  { id: "2", action: "Event registration confirmed", date: "Yesterday", icon: "event" },
  { id: "3", action: "Service booking confirmed", date: "Aug 20, 2026", icon: "booking" },
  { id: "4", action: "Class registration completed", date: "Aug 15, 2026", icon: "class" },
];

export const mockDonationHistory = [
  { id: "DON-001", date: "24 Aug 2026", fund: "General Fund", amount: 5000, method: "Card", status: "Completed" },
  { id: "DON-002", date: "10 Aug 2026", fund: "Zakat", amount: 10000, method: "Bank Transfer", status: "Completed" },
  { id: "DON-003", date: "05 Aug 2026", fund: "Mosque Development", amount: 2000, method: "Card", status: "Completed" },
  { id: "DON-004", date: "28 Jul 2026", fund: "Sadaqah", amount: 1500, method: "Mobile Money", status: "Completed" },
];

export const mockDonationSummary = {
  total: 45000,
  thisYear: 28500,
  thisMonth: 15000,
  recurring: 1000,
};

export const mockMyEvents = [
  { id: "EVT-001", title: "Weekly Tafsir", date: "Aug 28, 2026", time: "7:30 PM", location: "Main Prayer Hall", status: "Registered", image: "/placeholder-event.jpg", isPast: false },
  { id: "EVT-002", title: "Youth Faith Circle", date: "Aug 30, 2026", time: "4:00 PM", location: "Community Room A", status: "Registered", image: "/placeholder-event.jpg", isPast: false },
  { id: "EVT-003", title: "Eid Celebration prep", date: "Jun 15, 2026", time: "10:00 AM", location: "Mosque Courtyard", status: "Attended", image: "/placeholder-event.jpg", isPast: true },
];

export const mockMyBookings = [
  { id: "BKG-001", service: "Community Assistance", date: "Sep 05, 2026", time: "11:00 AM", location: "Office 2", status: "Upcoming" },
  { id: "BKG-002", service: "Counselling", date: "Aug 10, 2026", time: "2:00 PM", location: "Office 1", status: "Completed" },
  { id: "BKG-003", service: "Facility Booking", date: "Jul 22, 2026", time: "5:00 PM", location: "Community Hall", status: "Completed" },
];

export const mockMyClasses = [
  { id: "CLS-001", name: "Quran Recitation Level 2", teacher: "Imam Abdul Karim", schedule: "Mondays, 6:00 PM", location: "Classroom 1", status: "Enrolled" },
  { id: "CLS-002", name: "Introduction to Hadith", teacher: "Shaykh Ahmad", schedule: "Wednesdays, 7:00 PM", location: "Classroom 3", status: "Enrolled" },
  { id: "CLS-003", name: "Basic Arabic", teacher: "Ustadh Mahmud", schedule: "Thursdays, 5:30 PM", location: "Classroom 2", status: "Completed" },
];

export const mockSavedContent = [
  { id: "SAV-001", title: "Surah Al-Kahf Explanation", category: "Quran", dateSaved: "Aug 22, 2026" },
  { id: "SAV-002", title: "Patience and Gratitude", category: "Khutbah", dateSaved: "Aug 15, 2026" },
  { id: "SAV-003", title: "The Importance of Zakat", category: "Articles", dateSaved: "Jul 30, 2026" },
  { id: "SAV-004", title: "Weekly Tafsir", category: "Events", dateSaved: "Jul 10, 2026" },
];

export const mockNotifications = [
  { id: "NOT-001", title: "Donation Received", message: "Your donation of ৳5,000 to the General Fund was successfully received.", date: "2 hours ago", category: "Donations", read: false },
  { id: "NOT-002", title: "Event Reminder", message: "Your registered event 'Weekly Tafsir' is happening tomorrow at 7:30 PM.", date: "1 day ago", category: "Events", read: false },
  { id: "NOT-003", title: "Jumu'ah Time Updated", message: "Jumu'ah khutbah will now begin at 1:15 PM starting this Friday.", date: "3 days ago", category: "Announcements", read: true },
  { id: "NOT-004", title: "Booking Confirmed", message: "Your service booking for Community Assistance is confirmed for Sep 05.", date: "Aug 20", category: "Bookings", read: true },
];
