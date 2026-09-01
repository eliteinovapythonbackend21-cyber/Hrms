import MyAttendanceCalendar from "./components/MyAttendanceCalendar";

// Standalone page for the "My Holidays ▸ Calendar" sidebar entry — same
// widget shown on the Dashboard, just given its own screen/route so it
// can be reached directly from the sidebar.
export default function MyCalendarPage() {
  return (
    <div className="space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">My Calendar</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Your attendance, holidays and approved leaves for the month.
        </p>
      </div>

      <MyAttendanceCalendar />
    </div>
  );
}
