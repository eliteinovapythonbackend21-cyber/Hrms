import { Link } from "react-router-dom";

import Avatar from "@/components/ui/Avatar";
import { getUser } from "@/utils/tokenHelpers";
import { resolveUploadUrl } from "@/utils/fileUrl";
import { formatDate } from "@/utils/formatDate";
import { useMyEmployee } from "@/hooks/useMyEmployee";

function Field({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
        {value || "—"}
      </p>
    </div>
  );
}

function Chip({ children }) {
  if (!children) return null;
  return (
    <span className="chip chip-primary">
      {children}
    </span>
  );
}

// Profile summary for an employee-role login: photo + edit-profile fields
// (username, email, contact, emergency contact) + org details from the
// full Employee record.
export default function MyProfileCard() {
  const user = getUser();
  const { employee } = useMyEmployee();

  if (user?.role !== "employee") return null;

  const name =
    [employee?.first_name, employee?.last_name].filter(Boolean).join(" ") ||
    user?.username ||
    "Employee";

  const code = employee?.employee_code || user?.employee?.employee_code;
  const dept = employee?.department?.department_name;
  const desig = employee?.designation?.designation_name;
  const company = employee?.department?.company?.name;
  const branch = employee?.department?.branch?.name;

  const location = [employee?.city, employee?.state, employee?.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="card overflow-hidden">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary-500 via-primary-400 to-transparent" />

      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start">
        {/* identity */}
        <div className="flex items-center gap-4">
          <Avatar
            name={name}
            src={resolveUploadUrl(user?.profile_picture?.url)}
            size="lg"
            className="ring-2 ring-primary-500/20 dark:ring-primary-400/20"
          />
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-slate-900 dark:text-white">
              {name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {code ? `${code}` : ""}
              {employee?.status === false ? " · Inactive" : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip>{dept}</Chip>
              <Chip>{desig}</Chip>
            </div>
          </div>
        </div>

        {/* details */}
        <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Field label="Company" value={company} />
          <Field label="Branch" value={branch} />
          <Field label="Phone" value={employee?.phone || user?.mobile} />
          <Field label="Email" value={user?.email || employee?.email} />
          <Field
            label="Emergency contact"
            value={
              user?.emergency_contact_number ||
              employee?.emergency_contact_number
            }
          />
          <Field label="Other number" value={user?.other_number} />
          <Field
            label="Date of birth"
            value={employee?.dob ? formatDate(employee.dob) : null}
          />
          <Field
            label="Joined"
            value={
              employee?.joining_date ? formatDate(employee.joining_date) : null
            }
          />
          <Field label="Location" value={location} />
          <Field label="Address" value={employee?.address} />
          <Field label="Pincode" value={employee?.pincode} />
        </div>
      </div>

      <div className="border-t border-slate-200/70 px-5 py-3 text-right dark:border-white/10">
        <Link
          to={user?.employee?.id ? `/employees/${user.employee.id}` : "/dashboard"}
          className="text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
        >
          View full profile →
        </Link>
      </div>
    </div>
  );
}
