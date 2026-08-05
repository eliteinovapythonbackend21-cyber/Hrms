# HRMS Admin Frontend - Build Plan

## Phase 1: Project Scaffolding
- [x] package.json
- [x] vite.config.js
- [x] index.html
- [x] tailwind.config.js
- [x] .env
- [x] src/main.jsx
- [x] src/app/App.jsx
- [x] src/app/AppRouter.jsx
- [x] src/app/queryClient.js
- [x] src/styles/globals.css

## Phase 2: Core Infrastructure
- [x] src/api/axiosClient.js
- [x] src/api/endpoints.js
- [x] src/api/auth.api.js
- [x] src/api/users.api.js
- [x] src/api/employees.api.js
- [x] src/api/attendance.api.js
- [x] src/api/leaves.api.js
- [x] src/api/master.api.js
- [x] src/api/network.api.js
- [x] src/api/roles.api.js
- [x] src/utils/formatDate.js
- [x] src/utils/formatCurrency.js
- [x] src/utils/validators.js
- [x] src/utils/tokenHelpers.js
- [x] src/constants/roles.js
- [x] src/constants/leaveStatus.js
- [x] src/constants/attendanceStatus.js
- [x] src/hooks/usePagination.js
- [x] src/hooks/useDebouncedSearch.js
- [x] src/hooks/useFileDownload.js
- [x] src/hooks/useGeolocation.js

## Phase 3: Theme & UI Kit
- [x] src/theme/* (tokens, themes, ThemeProvider, useTheme, ThemeToggle)
- [x] src/components/ui/* (Button, Input, Select, DatePicker, Modal, Badge, FileUpload)
- [x] src/components/table/* (DataTable, TablePagination, TableSearchBar)
- [x] src/components/feedback/* (Toast, ConfirmDialog, ErrorBoundary, LoadingSpinner)
- [x] src/components/charts/DashboardCard.jsx

## Phase 4: Layout & Routing
- [x] src/layout/* (AdminLayout, Sidebar, Topbar, navConfig)
- [x] src/routes/* (ProtectedRoute, RoleGuard, routePermissions)
- [x] src/context/UIContext.jsx

## Phase 5: Feature Pages
- [x] auth: LoginPage, RegisterPage, useAuth, authValidation
- [x] dashboard: DashboardPage, useDashboardCounts, CountsSummary
- [x] users: UserListPage, UserFormPage, UserProfilePage, useUsers, UserTable, UserForm
- [x] employees: EmployeeListPage, EmployeeDetailPage, EmployeeFormPage, EmployeeSalaryPage, useEmployees, useEmployeeSalary, EmployeeTable, EmployeeForm, SalaryEditForm
- [x] attendance: AttendanceListPage, CheckInOutWidget, ManualAttendancePage, AttendanceReportsPage, useAttendance, useCheckInOut, useAttendanceReports, AttendanceTable, ManualAttendanceForm, ReportFilterBar
- [x] leaves: LeaveListPage, LeaveFormPage, LeaveApprovalsPage, useLeaves, useLeaveApprovals, LeaveTable, LeaveForm, LeaveStatusBadge
- [x] master: departments, designations, leaveTypes (list + form + hooks)
- [x] network: NetworkLogPage, useNetworkLogs
- [x] roles: RoleListPage, useRoles, RoleForm

## Phase 6: Verification
- [x] npm install
- [x] npm run build
- [ ] Manual smoke test (run `npm run dev` and log in against the Flask backend)
