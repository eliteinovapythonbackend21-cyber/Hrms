import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { employeesApi } from "@/api/employees.api";
import { attendanceApi } from "@/api/attendance.api";

// The backend has no server-side duplicate-checkin guard (repeated check-ins
// create separate Attendance rows for the same employee+date), so the widget
// checks for today's record itself to decide whether to allow check-in/out.
export function useTodayAttendance(employeeId, attendanceDate) {
  return useQuery({
    queryKey: ["today-attendance", employeeId, attendanceDate],
    queryFn: async () => {
      const res = await attendanceApi.list({
        employee_id: employeeId,
        attendance_date: attendanceDate,
        per_page: 1,
      });
      return res.data.data.items[0] || null;
    },
    enabled: !!employeeId && !!attendanceDate,
  });
}

// Global attendance-workflow config: late cutoff, required hours,
// permission cap, fixed break durations.
export function useAttendanceSettings() {
  return useQuery({
    queryKey: ["attendance-settings"],
    queryFn: async () => (await attendanceApi.getSettings()).data.data,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => employeesApi.checkin(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => employeesApi.checkout(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

// Wipes an employee's attendance for a day (row + timeline events) so they
// can check in again from scratch.
export function useResetAttendanceDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => employeesApi.resetAttendance(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useManualAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => employeesApi.manualAttendance(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-attendance"] });
    },
  });
}

export function useManualAttendanceList(params) {
  return useQuery({
    queryKey: ["manual-attendance", params],
    queryFn: async () => {
      const res = await employeesApi.listManualAttendance(params);
      return res.data.data;
    },
  });
}

export function useUpdateManualAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => employeesApi.updateManualAttendance(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-attendance"] });
    },
  });
}

export function useDeactivateManualAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => employeesApi.deactivateManualAttendance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-attendance"] });
    },
  });
}
