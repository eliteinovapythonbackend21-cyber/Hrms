import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/routes/ProtectedRoute";
import RoleGuard from "@/routes/RoleGuard";
import AdminLayout from "@/layout/AdminLayout";

// Auth
import LoginPage from "@/features/auth/LoginPage";
import RegisterPage from "@/features/auth/RegisterPage";
import ForgotPasswordPage from "@/features/auth/ForgotPasswordPage";
import VerifyOtpPage from "@/features/auth/VerifyOtpPage";
import ResetPasswordPage from "@/features/auth/ResetPasswordPage";


// Dashboard
import DashboardPage from "@/features/dashboard/DashboardPage";
import MyCalendarPage from "@/features/dashboard/MyCalendarPage";

// Users
import UserListPage from "@/features/users/UserListPage";
import UserFormPage from "@/features/users/UserFormPage";
import UserProfilePage from "@/features/users/UserProfilePage";
import HrRoleUserListPage from "@/features/users/HrRoleUserListPage";

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
import MonthlyLeaveRecordPage from "@/features/leaves/MonthlyLeaveRecordPage";

// Master
import CompanyListPage from "@/features/master/company/CompanyListPage";
import BranchListPage from "@/features/master/branches/BranchListPage";
import DepartmentListPage from "@/features/master/departments/DepartmentListPage";
import DesignationListPage from "@/features/master/designations/DesignationListPage";
import LeaveTypeListPage from "@/features/leaveTypes/LeaveTypeListPage";
import HolidayListPage from "@/features/holidays/HolidayListPage";
// import ComingSoonPage from "@/features/master/ComingSoonPage";

// Network
import NetworkLogPage from "@/features/network/NetworkLogPage";

// Roles
import RoleListPage from "@/features/roles/RoleListPage";
import RolesMatrixPage from "@/features/roles/RolesMatrixPage";

// Employee lifecycle
import DocumentListPage from "@/features/employee/documents/DocumentListPage";
import PermissionRequestListPage from "@/features/employee/permissions/PermissionRequestListPage";
import OvertimeListPage from "@/features/employee/overtime/OvertimeListPage";
import PayrollRecordListPage from "@/features/employee/payroll/PayrollRecordListPage";
import PerformanceReviewListPage from "@/features/employee/performance/PerformanceReviewListPage";
import TrainingProgramListPage from "@/features/employee/training/TrainingProgramListPage";
import PromotionListPage from "@/features/employee/promotions/PromotionListPage";
import TransferListPage from "@/features/employee/transfers/TransferListPage";
import ResignationListPage from "@/features/employee/resignations/ResignationListPage";
import ExitManagementListPage from "@/features/employee/exit-management/ExitManagementListPage";

// CRM
import LeadListPage from "@/features/crm/leads/LeadListPage";
import CustomerListPage from "@/features/crm/customers/CustomerListPage";
import CustomerDetailPage from "@/features/crm/customers/CustomerDetailPage";
import FollowUpListPage from "@/features/crm/follow-ups/FollowUpListPage";
import MeetingListPage from "@/features/crm/meetings/MeetingListPage";
import QuotationListPage from "@/features/crm/quotations/QuotationListPage";
import InvoiceListPage from "@/features/crm/invoices/InvoiceListPage";
import PaymentListPage from "@/features/crm/payments/PaymentListPage";
import SupportTicketListPage from "@/features/crm/support-tickets/SupportTicketListPage";
import LeadUploadPage from "@/features/crm/leads/LeadUploadPage";
import LeadWeeklySnapshotPage from "@/features/crm/leads/LeadWeeklySnapshotPage";
import DepartmentHeadcountPage from "@/features/crm/leads/DepartmentHeadcountPage";
import EmployeeTargetPage from "@/features/crm/leads/EmployeeTargetPage";
import IncentiveSlabPage from "@/features/crm/leads/IncentiveSlabPage";
import IncentivePayoutPage from "@/features/crm/leads/IncentivePayoutPage";
import IncentiveDashboardPage from "@/features/crm/incentives/IncentiveDashboardPage";

// Finance
import AccountListPage from "@/features/finance/accounts/AccountListPage";
import VendorListPage from "@/features/finance/vendors/VendorListPage";
import ExpenseListPage from "@/features/finance/expenses/ExpenseListPage";
import IncomeListPage from "@/features/finance/income/IncomeListPage";
import FinanceAttendanceMonthlyPage from "@/features/attendance/FinanceAttendanceMonthlyPage";

// Reports
import ReportsPage from "@/features/reports/ReportsPage";

export default function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

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
        <Route path="/employees" element={<RoleGuard><EmployeeListPage restricted /></RoleGuard>} />
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
        <Route path="/leaves/monthly-record" element={<RoleGuard><MonthlyLeaveRecordPage /></RoleGuard>} />

        {/* Master */}
        <Route path="/master/company" element={<RoleGuard><CompanyListPage /></RoleGuard>} />
        <Route path="/master/branches" element={<RoleGuard><BranchListPage  /></RoleGuard>} />
        <Route path="/master/departments" element={<RoleGuard><DepartmentListPage /></RoleGuard>} />
        <Route path="/master/designations" element={<RoleGuard><DesignationListPage /></RoleGuard>} />
        <Route path="/master/employees" element={<RoleGuard><EmployeeListPage /></RoleGuard>} />
        <Route path="/leave-types" element={<RoleGuard><LeaveTypeListPage /></RoleGuard>} />
        <Route path="/holidays" element={<RoleGuard><HolidayListPage /></RoleGuard>} />
        <Route path="/my-calendar" element={<RoleGuard><MyCalendarPage /></RoleGuard>} />

        {/* HR — users filtered by HR sub-role */}
        <Route path="/users/hr/:roleSlug" element={<RoleGuard><HrRoleUserListPage /></RoleGuard>} />

        {/* Network */}
        <Route path="/network" element={<RoleGuard><NetworkLogPage /></RoleGuard>} />

        {/* Roles */}
        <Route path="/roles" element={<RoleGuard><RoleListPage /></RoleGuard>} />
        <Route path="/roles/:id/permissions" element={<RoleGuard><RolesMatrixPage /></RoleGuard>} />

        {/* Employee lifecycle */}
        <Route path="/employee/documents" element={<RoleGuard><DocumentListPage /></RoleGuard>} />
        <Route path="/employee/permissions" element={<RoleGuard><PermissionRequestListPage /></RoleGuard>} />
        <Route path="/employee/overtime" element={<RoleGuard><OvertimeListPage /></RoleGuard>} />
        <Route path="/employee/payroll" element={<RoleGuard><PayrollRecordListPage /></RoleGuard>} />
        <Route path="/employee/performance" element={<RoleGuard><PerformanceReviewListPage /></RoleGuard>} />
        <Route path="/employee/training" element={<RoleGuard><TrainingProgramListPage /></RoleGuard>} />
        <Route path="/employee/promotions" element={<RoleGuard><PromotionListPage /></RoleGuard>} />
        <Route path="/employee/transfers" element={<RoleGuard><TransferListPage /></RoleGuard>} />
        <Route path="/employee/resignations" element={<RoleGuard><ResignationListPage /></RoleGuard>} />
        <Route path="/employee/exit-management" element={<RoleGuard><ExitManagementListPage /></RoleGuard>} />

        {/* CRM */}
        <Route path="/crm" element={<Navigate to="/crm/leads" replace />} />
        {/* CRM's own employees view: scoped to the "CRM" department
            (Voice / Non-Voice designations), table+card UI matched to
            DesignationListPage, View-only action (no Add/Edit). Rendered
            by EmployeeListPage's crmOnly branch — a completely separate
            code path from the default view, so /master/employees (Admin,
            Finance) is unaffected. */}
        <Route path="/crm/employees" element={<RoleGuard><EmployeeListPage crmOnly /></RoleGuard>} />
        <Route path="/crm/leads" element={<RoleGuard><LeadListPage /></RoleGuard>} />
        <Route path="/crm/customers" element={<RoleGuard><CustomerListPage /></RoleGuard>} />
        <Route path="/crm/customers/:id" element={<RoleGuard><CustomerDetailPage /></RoleGuard>} />
        <Route path="/crm/follow-ups" element={<RoleGuard><FollowUpListPage /></RoleGuard>} />
        <Route path="/crm/meetings" element={<RoleGuard><MeetingListPage /></RoleGuard>} />
        <Route path="/crm/quotations" element={<RoleGuard><QuotationListPage /></RoleGuard>} />
        <Route path="/crm/invoices" element={<RoleGuard><InvoiceListPage /></RoleGuard>} />
        <Route path="/crm/payments" element={<RoleGuard><PaymentListPage /></RoleGuard>} />
        <Route path="/crm/support-tickets" element={<RoleGuard><SupportTicketListPage /></RoleGuard>} />
        <Route path="/crm/leads/upload" element={<RoleGuard><LeadUploadPage /></RoleGuard>} />
        <Route path="/crm/leads/weekly" element={<RoleGuard><LeadWeeklySnapshotPage /></RoleGuard>} />
        <Route path="/crm/leads/employees/headcount" element={<RoleGuard><DepartmentHeadcountPage /></RoleGuard>} />
        <Route path="/crm/leads/employees/targets" element={<RoleGuard><EmployeeTargetPage /></RoleGuard>} />
        <Route path="/crm/leads/incentive-slabs" element={<RoleGuard><IncentiveSlabPage /></RoleGuard>} />
        <Route path="/crm/leads/payouts" element={<RoleGuard><IncentivePayoutPage /></RoleGuard>} />
        <Route path="/crm/incentives" element={<RoleGuard><IncentiveDashboardPage /></RoleGuard>} />

        {/* Finance */}
        <Route path="/finance" element={<Navigate to="/finance/accounts" replace />} />
        <Route path="/finance/accounts" element={<RoleGuard><AccountListPage /></RoleGuard>} />
        <Route path="/finance/vendors" element={<RoleGuard><VendorListPage /></RoleGuard>} />
        <Route path="/finance/expenses" element={<RoleGuard><ExpenseListPage /></RoleGuard>} />
        <Route path="/finance/income" element={<RoleGuard><IncomeListPage /></RoleGuard>} />
         
        <Route path="/finance/attendance" element={<RoleGuard><FinanceAttendanceMonthlyPage /></RoleGuard>} />

        {/* Reports */}
        <Route path="/reports" element={<RoleGuard><ReportsPage /></RoleGuard>} />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}