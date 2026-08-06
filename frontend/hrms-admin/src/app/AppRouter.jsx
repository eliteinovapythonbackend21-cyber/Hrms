import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/routes/ProtectedRoute";
import RoleGuard from "@/routes/RoleGuard";
import AdminLayout from "@/layout/AdminLayout";

// Auth
import LoginPage from "@/features/auth/LoginPage";
import RegisterPage from "@/features/auth/RegisterPage";

// Dashboard
import DashboardPage from "@/features/dashboard/DashboardPage";

// Users
import UserListPage from "@/features/users/UserListPage";
import UserFormPage from "@/features/users/UserFormPage";
import UserProfilePage from "@/features/users/UserProfilePage";

// Employees
import EmployeeListPage from "@/features/employees/EmployeeListPage";
import EmployeeDetailPage from "@/features/employees/EmployeeDetailPage";
import EmployeeFormPage from "@/features/employees/EmployeeFormPage";
import EmployeeSalaryPage from "@/features/employees/EmployeeSalaryPage";
import PayslipPage from "@/features/employees/PayslipPage";

// Attendance
import AttendanceListPage from "@/features/attendance/AttendanceListPage";
import ManualAttendancePage from "@/features/attendance/ManualAttendancePage";
import AttendanceReportsPage from "@/features/attendance/AttendanceReportsPage";

// Leaves
import LeaveListPage from "@/features/leaves/LeaveListPage";
import LeaveFormPage from "@/features/leaves/LeaveFormPage";
import LeaveApprovalsPage from "@/features/leaves/LeaveApprovalsPage";

// Master
import DepartmentListPage from "@/features/master/departments/DepartmentListPage";
import DesignationListPage from "@/features/master/designations/DesignationListPage";
import LeaveTypeListPage from "@/features/master/leaveTypes/LeaveTypeListPage";

// Network
import NetworkLogPage from "@/features/network/NetworkLogPage";

// Roles CRUD is disabled for now — see navConfig.js for how to re-enable.
// import RoleListPage from "@/features/roles/RoleListPage";

export default function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected admin routes */}
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<RoleGuard><DashboardPage /></RoleGuard>} />

        {/* Users */}
        <Route path="/users" element={<Navigate to="/users/employees" replace />} />
        <Route path="/users/admins" element={<RoleGuard><UserListPage role="admin" /></RoleGuard>} />
        <Route path="/users/employees" element={<RoleGuard><UserListPage role="employee" /></RoleGuard>} />
        <Route path="/users/new" element={<RoleGuard><UserFormPage /></RoleGuard>} />
        <Route path="/users/:id/edit" element={<RoleGuard><UserFormPage /></RoleGuard>} />
        <Route path="/users/:id" element={<RoleGuard><UserProfilePage /></RoleGuard>} />

        {/* Employees */}
        <Route path="/employees" element={<RoleGuard><EmployeeListPage /></RoleGuard>} />
        <Route path="/employees/new" element={<RoleGuard><EmployeeFormPage /></RoleGuard>} />
        <Route path="/employees/:id" element={<RoleGuard><EmployeeDetailPage /></RoleGuard>} />
        <Route path="/employees/:id/edit" element={<RoleGuard><EmployeeFormPage /></RoleGuard>} />
        <Route path="/employees/:id/salary" element={<RoleGuard><EmployeeSalaryPage /></RoleGuard>} />
        <Route path="/employees/:id/payslip" element={<RoleGuard><PayslipPage /></RoleGuard>} />

        {/* Attendance */}
        <Route path="/attendance" element={<RoleGuard><AttendanceListPage /></RoleGuard>} />
        <Route path="/attendance/manual" element={<RoleGuard><ManualAttendancePage /></RoleGuard>} />
        <Route path="/attendance/reports" element={<RoleGuard><AttendanceReportsPage /></RoleGuard>} />

        {/* Leaves */}
        <Route path="/leaves" element={<RoleGuard><LeaveListPage /></RoleGuard>} />
        <Route path="/leaves/new" element={<RoleGuard><LeaveFormPage /></RoleGuard>} />
        <Route path="/leaves/:id/edit" element={<RoleGuard><LeaveFormPage /></RoleGuard>} />
        <Route path="/leaves/approvals" element={<RoleGuard><LeaveApprovalsPage /></RoleGuard>} />

        {/* Master */}
        <Route path="/master/departments" element={<RoleGuard><DepartmentListPage /></RoleGuard>} />
        <Route path="/master/designations" element={<RoleGuard><DesignationListPage /></RoleGuard>} />
        <Route path="/master/leave-types" element={<RoleGuard><LeaveTypeListPage /></RoleGuard>} />

        {/* Network */}
        <Route path="/network" element={<RoleGuard><NetworkLogPage /></RoleGuard>} />

        {/* Roles CRUD is disabled for now — see navConfig.js for how to re-enable. */}
        {/* <Route path="/roles" element={<RoleGuard><RoleListPage /></RoleGuard>} /> */}

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
