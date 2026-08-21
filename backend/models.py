from datetime import datetime, date, time, timedelta
from decimal import Decimal
from io import BytesIO

from extensions import db
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from sqlalchemy import Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import validates


def _summary(item, fields):
    if not item:
        return None
    return {field: getattr(item, field) for field in fields}


class TimestampMixin(object):

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        data = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            if isinstance(value, datetime):
                data[column.name] = value.isoformat()
            elif isinstance(value, date):
                data[column.name] = value.isoformat()
            elif isinstance(value, time):
                data[column.name] = value.isoformat()
            elif isinstance(value, Decimal):
                data[column.name] = float(value)
            else:
                data[column.name] = value
        return data

    @classmethod
    def get_next_id(cls, active_only=False):
        query = db.session.query(cls.id)
        if active_only and hasattr(cls, "is_active"):
            query = query.filter(cls.is_active == True)

        ids = [row.id for row in query.order_by(cls.id).all()]
        next_id = 1
        for current_id in ids:
            if current_id != next_id:
                break
            next_id += 1
        return next_id


class Role(TimestampMixin, db.Model):

    __tablename__ = "roles"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True, index=True)
    # Master category this role belongs to (Admin / HR / Employee / Finance) —
    # drives the master/sub-master grouping on the Roles screen. Free-form
    # roles created under a sub-master category inherit it automatically.
    category = db.Column(db.String(20), nullable=False, default="HR", server_default="HR")
    is_active = db.Column(db.Boolean, default=True)
    actions = db.Column(db.Text, nullable=True)
    users = db.relationship("BaseUser", back_populates="role_obj", cascade="all, delete-orphan")
    permission_links = db.relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Role {self.name}>"

    def to_dict(self):
        data = super().to_dict()
        data["permissions"] = [
            _summary(link.permission, ["id", "module", "action"])
            for link in self.permission_links
        ]
        return data


class Permission(TimestampMixin, db.Model):
    """One row per (module, action) pair, e.g. ("Employee", "add").
    Seeded for the six modules x four actions; see migrations for the seed."""

    __tablename__ = "permissions"

    id = db.Column(db.Integer, primary_key=True)
    module = db.Column(db.String(50), nullable=False)
    action = db.Column(db.String(20), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    role_links = db.relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")

    __table_args__ = (db.UniqueConstraint("module", "action", name="uq_permission_module_action"),)

    def to_dict(self):
        return super().to_dict()


class RolePermission(TimestampMixin, db.Model):
    """Join table granting a Permission to a Role — replaces the free-form
    Role.actions text field with a real matrix for the Roles & Permissions
    screen. Role.actions is left in place for backward compatibility."""

    __tablename__ = "role_permissions"

    id = db.Column(db.Integer, primary_key=True)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    permission_id = db.Column(db.Integer, db.ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False)
    role = db.relationship("Role", back_populates="permission_links")
    permission = db.relationship("Permission", back_populates="role_links")

    __table_args__ = (db.UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),)

    def to_dict(self):
        data = super().to_dict()
        data["permission"] = _summary(self.permission, ["id", "module", "action"])
        return data


class BaseUser(TimestampMixin, db.Model):

    __tablename__ = "base_users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False, unique=True)
    email = db.Column(db.String(150), nullable=False, unique=True, index=True)
    mobile = db.Column(db.String(15), unique=True)
    password = db.Column(db.String(255), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), nullable=False, index=True)
    role = db.Column(db.String(20), nullable=False, index=True)
    profile_picture = db.Column(JSONB, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    last_login = db.Column(db.DateTime)
    role_obj = db.relationship("Role", back_populates="users")
    employee = db.relationship("Employee", back_populates="user", uselist=False, cascade="all, delete")
    audit_logs = db.relationship("AuditLog", back_populates="user")

    def __repr__(self):
        return f"<User {self.username}>"

    def to_dict(self):
        data = super().to_dict()
        data.pop("password", None)
        data["role_name"] = self.role_obj.name if self.role_obj else self.role
        data["employee"] = _summary(self.employee, ["id", "employee_code", "first_name", "last_name"]) if self.employee else None
        return data


class Department(TimestampMixin, db.Model):

    __tablename__ = "departments"

    id = db.Column(db.Integer, primary_key=True)
    department_code = db.Column(db.String(20), nullable=False, unique=True)
    department_name = db.Column(db.String(100), nullable=False, unique=True)
    company_id = db.Column(
        db.Integer,
        db.ForeignKey("companies.id"),
        nullable=True,
        index=True,
    )
    branch_id = db.Column(
        db.Integer,
        db.ForeignKey("branches.id"),
        nullable=True,
        index=True,
    )
    description = db.Column(db.Text)
    status = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)
    company = db.relationship("Company", back_populates="departments")
    branch = db.relationship("Branch", back_populates="departments")
    employees = db.relationship("Employee", back_populates="department")
    designations = db.relationship("Designation", back_populates="department")

    def __repr__(self):
        return self.department_name

    def to_dict(self):
        data = super().to_dict()
        data["company"] = (
            {"id": self.company.id, "name": self.company.name, "code": self.company.code}
            if self.company
            else None
        )

        data["branch"] = (
            {"id": self.branch.id, "name": self.branch.name, "code": self.branch.code}
            if self.branch
            else None
        )

        data["employees"] = [
            _summary(employee, ["id", "employee_code", "first_name", "last_name"])
            for employee in self.employees
        ]

        data["designations"] = [
            _summary(designation, ["id", "designation_name", "designation_code"])
            for designation in self.designations
            if designation.is_active
        ]

        return data



class Designation(TimestampMixin, db.Model):

    __tablename__ = "designations"

    id = db.Column(db.Integer,primary_key=True)
    designation_code = db.Column(db.String(20),unique=True)
    designation_name = db.Column(db.String(100),nullable=False)
    department_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "departments.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )
    # Self-referential FK for sub-designations, e.g. IT > Backend > Python/Java.
    # NULL means this is a top-level designation.
    parent_designation_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "designations.id",
            ondelete="CASCADE"
        ),
        nullable=True
    )
    description = db.Column(db.Text)
    status = db.Column(db.Boolean,default=True)
    is_active = db.Column(db.Boolean, default=True)
    is_admin_designation = db.Column(db.Boolean, nullable=False, default=False)
    department = db.relationship("Department",back_populates="designations")
    employees = db.relationship("Employee",back_populates="designation")
    parent_designation = db.relationship(
        "Designation",
        remote_side=[id],
        back_populates="sub_designations"
    )
    sub_designations = db.relationship(
        "Designation",
        back_populates="parent_designation",
        cascade="all, delete-orphan"
    )

    __table_args__ = (

        db.UniqueConstraint(
            "designation_name",
            "department_id",
            name="uq_designation_department"
        ),

    )

    def __repr__(self):
        return self.designation_name

    def to_dict(self):
        data = super().to_dict()
        data["department"] = (
            {
                "id": self.department.id,
                "department_name": self.department.department_name,
                "department_code": self.department.department_code,
                "company": (
                    {"id": self.department.company.id, "name": self.department.company.name}
                    if self.department.company
                    else None
                ),
                "branch": (
                    {"id": self.department.branch.id, "name": self.department.branch.name}
                    if self.department.branch
                    else None
                ),
            }
            if self.department
            else None
        )
        data["employees"] = [
            _summary(employee, ["id", "employee_code", "first_name", "last_name"])
            for employee in self.employees
        ]
        return data


class LeaveType(TimestampMixin, db.Model):

    __tablename__ = "leave_types"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    is_active = db.Column(db.Boolean, default=True)
    leaves = db.relationship("Leave", back_populates="leave_type")

    def __repr__(self):
        return f"<LeaveType {self.name}>"

    def to_dict(self):
        data = super().to_dict()
        return data


class Holiday(TimestampMixin, db.Model):
    """Single-branch business — no branch_id FK (see implementation_plan.md
    decision log). Organization master, full CRUD."""

    __tablename__ = "holidays"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    holiday_date = db.Column(db.Date, nullable=False)
    is_active = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return super().to_dict()


class Company(TimestampMixin, db.Model):

    __tablename__ = "companies"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, unique=True)
    code = db.Column(db.String(50), nullable=False, unique=True)
    email = db.Column(db.String(150))
    phone = db.Column(db.String(30))
    website = db.Column(db.String(255))
    address = db.Column(db.Text)
    city = db.Column(db.String(100))
    state = db.Column(db.String(100))
    country = db.Column(db.String(100))
    pincode = db.Column(db.String(20))
    status = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)

    branches = db.relationship(
        "Branch",
        back_populates="company",
        cascade="all, delete-orphan"
    )

    departments = db.relationship(
        "Department",
        back_populates="company",
    )

    def __repr__(self):
        return self.name

    def to_dict(self):
        data = super().to_dict()

        data["branches"] = [
            {
                "id": branch.id,
                "name": branch.name,
                "code": branch.code,
                "email": branch.email,
                "phone": branch.phone,
                "address": branch.address,
                "city": branch.city,
                "state": branch.state,
                "country": branch.country,
                "pincode": branch.pincode,
                "status": branch.status,
                "is_active": branch.is_active,
            }
            for branch in self.branches
            if branch.is_active
        ]

        return data


class Branch(TimestampMixin, db.Model):
    
    __tablename__ = "branches"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(
        db.Integer,
        db.ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    name = db.Column(db.String(150), nullable=False)
    code = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(150))
    phone = db.Column(db.String(30))
    address = db.Column(db.Text)
    city = db.Column(db.String(100))
    state = db.Column(db.String(100))
    country = db.Column(db.String(100))
    pincode = db.Column(db.String(20))
    status = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)

    company = db.relationship(
        "Company",
        back_populates="branches"
    )

    departments = db.relationship(
        "Department",
        back_populates="branch",
    )

    __table_args__ = (
        db.UniqueConstraint(
            "company_id",
            "code",
            name="uq_branch_company_code"
        ),
        db.UniqueConstraint(
            "company_id",
            "name",
            name="uq_branch_company_name"
        ),
    )

    def __repr__(self):
        return self.name

    def to_dict(self):
        data = super().to_dict()

        data["company"] = (
            {
                "id": self.company.id,
                "name": self.company.name,
                "code": self.company.code,
            }
            if self.company
            else None
        )

        return data



class Employee(TimestampMixin, db.Model):

    __tablename__ = "employees"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer,db.ForeignKey("base_users.id"),nullable=False,unique=True)
    employee_code = db.Column(db.String(20),unique=True,nullable=False)
    department_id = db.Column(db.Integer,db.ForeignKey("departments.id"),nullable=False)
    designation_id = db.Column(db.Integer,db.ForeignKey("designations.id"),nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100))
    gender = db.Column(db.String(20))
    dob = db.Column(db.Date)
    phone = db.Column(db.String(15))
    emergency_contact = db.Column(db.String(15))
    address = db.Column(db.Text)
    city = db.Column(db.String(100))
    state = db.Column(db.String(100))
    country = db.Column(db.String(100))
    pincode = db.Column(db.String(10))
    joining_date = db.Column(db.Date)
    salary = db.Column(db.Numeric(12, 2), default=0)
    allowance = db.Column(db.Numeric(12, 2), default=0)
    pf_number = db.Column(db.String(30))
    esi_number = db.Column(db.String(30))
    account_number = db.Column(db.String(30))
    status = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)
    # profile_picture = db.Column(JSONB, nullable=True)
    user = db.relationship("BaseUser", back_populates="employee")
    department = db.relationship("Department",back_populates="employees")
    designation = db.relationship("Designation",back_populates="employees")
    attendances = db.relationship("Attendance",back_populates="employee",cascade="all, delete-orphan")
    manual_attendances = db.relationship("ManualAttendance", back_populates="employee", cascade="all, delete-orphan")
    leaves = db.relationship("Leave",back_populates="employee",cascade="all, delete-orphan")
    network_logs = db.relationship("NetworkStatus",back_populates="employee",cascade="all, delete-orphan")

    def to_dict(self):
        data = super().to_dict()
        data["user"] = _summary(self.user, ["id", "username", "email", "role"]) if self.user else None
        data["department"] = (
            {
                "id": self.department.id,
                "department_name": self.department.department_name,
                "department_code": self.department.department_code,
                "company": (
                    {"id": self.department.company.id, "name": self.department.company.name}
                    if self.department.company
                    else None
                ),
                "branch": (
                    {"id": self.department.branch.id, "name": self.department.branch.name}
                    if self.department.branch
                    else None
                ),
            }
            if self.department
            else None
        )
        data["designation"] = _summary(self.designation, ["id", "designation_name", "designation_code"])
        data["attendance_count"] = len(self.attendances) if self.attendances is not None else 0
        data["leave_count"] = len(self.leaves) if self.leaves is not None else 0
        data["network_log_count"] = len(self.network_logs) if self.network_logs is not None else 0
        return data

    CODE_PREFIX = "ET"

    @classmethod
    def generate_next_code(cls):
        """Next sequential employee code, e.g. ET001, ET002, ... continuing
        from the highest numbered code already in use."""
        prefix = cls.CODE_PREFIX
        max_seq = 0
        codes = db.session.query(cls.employee_code).filter(
            cls.employee_code.like(f"{prefix}%")
        ).all()
        for (code,) in codes:
            suffix = code[len(prefix):]
            if suffix.isdigit():
                max_seq = max(max_seq, int(suffix))
        return f"{prefix}{max_seq + 1:03d}"

    @classmethod
    def generate_employee_report(cls, department_id=None, designation_id=None):
        query = cls.query
        if department_id is not None:
            query = query.filter(cls.department_id == department_id)
        if designation_id is not None:
            query = query.filter(cls.designation_id == designation_id)
        query = query.order_by(cls.id)

        rows = []
        for employee in query.all():
            rows.append([
                employee.employee_code,
                f"{employee.first_name or ''} {employee.last_name or ''}".strip(),
                employee.department.department_name if employee.department else "",
                employee.designation.designation_name if employee.designation else "",
                employee.joining_date.isoformat() if employee.joining_date else "",
                float(employee.salary or 0),
                "Active" if employee.is_active else "Inactive",
            ])
        headers = ["Employee Code", "Name", "Department", "Designation", "Joining Date", "Salary", "Status"]
        return Attendance._create_workbook("Employee Report", headers, rows)


class Attendance(TimestampMixin, db.Model):

    __tablename__ = "attendance"

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer,db.ForeignKey("employees.id"),nullable=False)
    attendance_date = db.Column(db.Date,nullable=False)
    check_in = db.Column(db.DateTime)
    check_out = db.Column(db.DateTime)
    working_hours = db.Column(db.Float)
    checkin_latitude = db.Column(db.Numeric(10,7))
    checkin_longitude = db.Column(db.Numeric(10,7))
    checkout_latitude = db.Column(db.Numeric(10,7))
    checkout_longitude = db.Column(db.Numeric(10,7))
    attendance_status = db.Column(db.String(20),default="Present")
    description = db.Column(db.String(255), nullable=True, default="user")
    is_active = db.Column(db.Boolean, default=True)
    employee = db.relationship("Employee",back_populates="attendances")

    def to_dict(self):
        data = super().to_dict()
        data["employee"] = _summary(self.employee, ["id", "employee_code", "first_name", "last_name"])
        return data

    @classmethod
    def _create_workbook(cls, title, headers, rows):
        wb = Workbook()
        ws = wb.active
        ws.title = title[:31]

        thin = Side(border_style="thin", color="000000")
        header_fill = PatternFill("solid", fgColor="4F81BD")
        centered = Alignment(horizontal="center", vertical="center")

        ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(headers))
        ws.cell(row=1, column=1, value="HRMS").font = Font(size=18, bold=True)
        ws.cell(row=1, column=1).alignment = centered

        ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=len(headers))
        ws.cell(row=2, column=1, value=title).font = Font(size=14, bold=True)
        ws.cell(row=2, column=1).alignment = centered

        header_row = 4
        for index, header in enumerate(headers, start=1):
            cell = ws.cell(row=header_row, column=index, value=header)
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = header_fill
            cell.alignment = centered
            cell.border = Border(left=thin, right=thin, top=thin, bottom=thin)

        for row_index, row_data in enumerate(rows, start=header_row + 1):
            for col_index, value in enumerate(row_data, start=1):
                cell = ws.cell(row=row_index, column=col_index, value=value)
                cell.alignment = Alignment(horizontal="left", vertical="center")
                cell.border = Border(left=thin, right=thin, top=thin, bottom=thin)

        column_widths = [18, 30, 18, 16, 16, 16, 16]
        for index, width in enumerate(column_widths, start=1):
            ws.column_dimensions[ws.cell(row=header_row, column=index).column_letter].width = width

        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer

    @classmethod
    def generate_attendance_report(cls, from_date=None, to_date=None, employee_id=None):
        query = cls.query.join(Employee)
        if employee_id is not None:
            query = query.filter(cls.employee_id == employee_id)
        if from_date and to_date:
            query = query.filter(cls.attendance_date.between(from_date, to_date))
        elif from_date:
            query = query.filter(cls.attendance_date >= from_date)
        elif to_date:
            query = query.filter(cls.attendance_date <= to_date)

        query = query.order_by(cls.attendance_date, cls.employee_id)

        rows = []
        for attendance in query.all():
            rows.append([
                attendance.employee_id,
                f"{attendance.employee.first_name or ''} {attendance.employee.last_name or ''}".strip(),
                attendance.attendance_date.isoformat(),
                attendance.check_in.strftime("%H:%M") if attendance.check_in else "",
                attendance.check_out.strftime("%H:%M") if attendance.check_out else "",
            ])

        headers = ["Employee ID", "Employee Name", "Date", "Check-in Time", "Check-out Time"]
        return cls._create_workbook("Attendance Report", headers, rows)

    @classmethod
    def generate_salary_report(cls, from_date=None, to_date=None, employee_id=None):
        query = Employee.query
        if employee_id is not None:
            query = query.filter(Employee.id == employee_id)

        rows = []
        for employee in query.order_by(Employee.id).all():
            attendance_query = cls.query.filter(cls.employee_id == employee.id)
            if from_date and to_date:
                attendance_query = attendance_query.filter(cls.attendance_date.between(from_date, to_date))
            elif from_date:
                attendance_query = attendance_query.filter(cls.attendance_date >= from_date)
            elif to_date:
                attendance_query = attendance_query.filter(cls.attendance_date <= to_date)

            attendance_records = attendance_query.all()
            attendance_count = len(attendance_records)
            salary_value = float(employee.salary or 0)

            # Approved leave dates in range — these are excluded from any
            # absent-day salary deduction and are surfaced for management.
            leave_query = Leave.query.filter(
                Leave.employee_id == employee.id,
                Leave.status == "Approved",
                Leave.is_active == True,
            )
            if from_date and to_date:
                leave_query = leave_query.filter(Leave.from_date <= to_date, Leave.to_date >= from_date)
            elif from_date:
                leave_query = leave_query.filter(Leave.to_date >= from_date)
            elif to_date:
                leave_query = leave_query.filter(Leave.from_date <= to_date)

            approved_leave_dates = set()
            for leave in leave_query.all():
                leave_start = max(from_date, leave.from_date) if from_date else leave.from_date
                leave_end = min(to_date, leave.to_date) if to_date else leave.to_date
                day = leave_start
                while day <= leave_end:
                    approved_leave_dates.add(day)
                    day += timedelta(days=1)

            # Absent days not covered by an approved leave are the only days
            # that reduce salary; absences on approved-leave dates are not deducted.
            deductible_absent_dates = {
                record.attendance_date
                for record in attendance_records
                if record.attendance_status == "Absent" and record.attendance_date not in approved_leave_dates
            }

            if from_date and to_date:
                days_in_period = (to_date - from_date).days + 1
            else:
                days_in_period = 30
            per_day_salary = (salary_value / days_in_period) if days_in_period else 0.0
            absent_deduction = round(per_day_salary * len(deductible_absent_dates), 2)
            net_salary = round(salary_value - absent_deduction, 2)

            approved_leave_dates_label = ", ".join(d.isoformat() for d in sorted(approved_leave_dates))

            rows.append([
                employee.id,
                employee.employee_code,
                f"{employee.first_name or ''} {employee.last_name or ''}".strip(),
                salary_value,
                attendance_count,
                len(deductible_absent_dates),
                len(approved_leave_dates),
                approved_leave_dates_label,
                absent_deduction,
                net_salary,
                from_date.isoformat() if from_date else "",
                to_date.isoformat() if to_date else "",
            ])

        headers = [
            "Employee ID", "Employee Code", "Employee Name", "Salary", "Attendance Count",
            "Absent Days (Deducted)", "Approved Leave Days", "Approved Leave Dates",
            "Absent Deduction", "Net Salary", "From Date", "To Date",
        ]
        return cls._create_workbook("Salary Report", headers, rows)


class ManualAttendance(TimestampMixin, db.Model):

    __tablename__ = "manual_attendance"

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey("employees.id"), nullable=False)
    attendance_date = db.Column(db.Date, nullable=False)
    check_in = db.Column(db.DateTime)
    check_out = db.Column(db.DateTime)
    working_hours = db.Column(db.Float)
    checkin_latitude = db.Column(db.Numeric(10,7))
    checkin_longitude = db.Column(db.Numeric(10,7))
    checkout_latitude = db.Column(db.Numeric(10,7))
    checkout_longitude = db.Column(db.Numeric(10,7))
    attendance_status = db.Column(db.String(20), default="Present")
    description = db.Column(db.String(255), nullable=True, default="admin")
    is_active = db.Column(db.Boolean, default=True)
    employee = db.relationship("Employee", back_populates="manual_attendances")

    def to_dict(self):
        data = super().to_dict()
        data["employee"] = _summary(self.employee, ["id", "employee_code", "first_name", "last_name"])
        return data


class Leave(TimestampMixin, db.Model):

    __tablename__ = "leave"

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey("employees.id"), nullable=False)
    leave_type_id = db.Column(db.Integer, db.ForeignKey("leave_types.id"), nullable=False)
    from_date = db.Column(db.Date)
    to_date = db.Column(db.Date)
    total_days = db.Column(db.Integer)
    reason = db.Column(db.Text)
    status = db.Column(db.String(20), default="Pending")
    is_active = db.Column(db.Boolean, default=True)
    employee = db.relationship("Employee", back_populates="leaves")
    leave_type = db.relationship("LeaveType", back_populates="leaves")

    def to_dict(self):
        data = super().to_dict()
        data["employee"] = _summary(self.employee, ["id", "employee_code", "first_name", "last_name"])
        data["leave_type"] = _summary(self.leave_type, ["id", "name"]) if self.leave_type else None
        return data

    @classmethod
    def generate_leave_report(cls, from_date=None, to_date=None, employee_id=None):
        query = cls.query.join(Employee)
        if employee_id is not None:
            query = query.filter(cls.employee_id == employee_id)
        if from_date and to_date:
            query = query.filter(cls.from_date <= to_date, cls.to_date >= from_date)
        elif from_date:
            query = query.filter(cls.to_date >= from_date)
        elif to_date:
            query = query.filter(cls.from_date <= to_date)
        query = query.order_by(cls.from_date, cls.employee_id)

        rows = []
        for leave in query.all():
            rows.append([
                leave.employee_id,
                f"{leave.employee.first_name or ''} {leave.employee.last_name or ''}".strip(),
                leave.leave_type.name if leave.leave_type else "",
                leave.from_date.isoformat() if leave.from_date else "",
                leave.to_date.isoformat() if leave.to_date else "",
                leave.total_days or 0,
                leave.status,
            ])
        headers = ["Employee ID", "Employee Name", "Leave Type", "From Date", "To Date", "Total Days", "Status"]
        return Attendance._create_workbook("Leave Report", headers, rows)


class NetworkStatus(TimestampMixin, db.Model):

    __tablename__ = "network_status"

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer,db.ForeignKey("employees.id"),nullable=False)
    latitude = db.Column(db.Numeric(10,7))
    longitude = db.Column(db.Numeric(10,7))
    ip_address = db.Column(db.String(50))
    network_type = db.Column(db.String(50))
    device_name = db.Column(db.String(100))
    battery_percentage = db.Column(db.Integer)
    is_online = db.Column(db.Boolean,default=True)
    is_active = db.Column(db.Boolean, default=True)
    employee = db.relationship("Employee",back_populates="network_logs")

    def to_dict(self):
        data = super().to_dict()
        data["employee"] = _summary(self.employee, ["id", "employee_code", "first_name", "last_name"])
        return data


class AuditLog(TimestampMixin, db.Model):

    __tablename__ = "audit_logs"

    id = db.Column(db.Integer,primary_key=True)
    user_id = db.Column(db.Integer,db.ForeignKey("base_users.id"),nullable=False)
    action = db.Column(db.String(100),nullable=False)
    table_name = db.Column(db.String(100))
    record_id = db.Column(db.Integer)
    description = db.Column(db.Text)
    ip_address = db.Column(db.String(50))
    is_active = db.Column(db.Boolean, default=True)
    user = db.relationship("BaseUser",back_populates="audit_logs")

    def to_dict(self):
        data = super().to_dict()
        data["user"] = _summary(self.user, ["id", "username", "email", "role"])
        return data


# ===========================================================================
# Phase 2 — Employee lifecycle (add-only lists; soft-delete via is_active)
# ===========================================================================

class EmployeeDocument(TimestampMixin, db.Model):
    __tablename__ = "employee_documents"

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey("employees.id"), nullable=False)
    doc_type = db.Column(db.String(50), nullable=False)
    file_url = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    employee = db.relationship("Employee")

    def to_dict(self):
        data = super().to_dict()
        data["employee"] = _summary(self.employee, ["id", "employee_code", "first_name", "last_name"])
        return data


class EmployeePermission(TimestampMixin, db.Model):
    """Short-leave / gate-pass request — distinct from Role/RolePermission."""
    __tablename__ = "employee_permissions"

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey("employees.id"), nullable=False)
    permission_date = db.Column(db.Date, nullable=False)
    from_time = db.Column(db.Time, nullable=False)
    to_time = db.Column(db.Time, nullable=False)
    reason = db.Column(db.Text)
    status = db.Column(db.String(20), default="Pending")
    is_active = db.Column(db.Boolean, default=True)
    employee = db.relationship("Employee")

    def to_dict(self):
        data = super().to_dict()
        data["employee"] = _summary(self.employee, ["id", "employee_code", "first_name", "last_name"])
        return data


class Overtime(TimestampMixin, db.Model):
    __tablename__ = "overtime"

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey("employees.id"), nullable=False)
    overtime_date = db.Column(db.Date, nullable=False)
    hours = db.Column(db.Numeric(4, 2), nullable=False)
    status = db.Column(db.String(20), default="Pending")
    is_active = db.Column(db.Boolean, default=True)
    employee = db.relationship("Employee")

    def to_dict(self):
        data = super().to_dict()
        data["employee"] = _summary(self.employee, ["id", "employee_code", "first_name", "last_name"])
        return data


class Payroll(TimestampMixin, db.Model):
    __tablename__ = "payroll"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    employee_id = db.Column(
        db.Integer,
        db.ForeignKey("employees.id"),
        nullable=False,
    )

    pay_month = db.Column(
        db.String(7),
        nullable=False,
    )

    gross_salary = db.Column(
        db.Numeric(12, 2),
        default=0,
    )

    deductions = db.Column(
        db.Numeric(12, 2),
        default=0,
    )

    net_salary = db.Column(
        db.Numeric(12, 2),
        default=0,
    )

    status = db.Column(
        db.String(20),
        default="Draft",
    )

    is_active = db.Column(
        db.Boolean,
        default=True,
    )

    employee = db.relationship(
        "Employee"
    )

    def to_dict(self):
        data = super().to_dict()

        employee = self.employee

        if not employee:
            data["employee"] = None

            data["company_id"] = None
            data["branch_id"] = None
            data["department_id"] = None
            data["designation_id"] = None

            return data

        department = getattr(
            employee,
            "department",
            None,
        )

        designation = getattr(
            employee,
            "designation",
            None,
        )

        company = (
            getattr(
                department,
                "company",
                None,
            )
            if department
            else None
        )

        branch = (
            getattr(
                department,
                "branch",
                None,
            )
            if department
            else None
        )

        employee_data = _summary(
            employee,
            [
                "id",
                "employee_code",
                "first_name",
                "last_name",
            ],
        )

        if department:
            department_data = _summary(
                department,
                [
                    "id",
                    "department_name",
                    "department_code",
                ],
            )

            if company:
                department_data["company"] = _summary(
                    company,
                    [
                        "id",
                        "name",
                        "company_name",
                    ],
                )
            else:
                department_data["company"] = None

            if branch:
                department_data["branch"] = _summary(
                    branch,
                    [
                        "id",
                        "name",
                        "branch_name",
                    ],
                )
            else:
                department_data["branch"] = None

            employee_data["department"] = department_data

        else:
            employee_data["department"] = None

        if designation:
            employee_data["designation"] = _summary(
                designation,
                [
                    "id",
                    "designation_name",
                    "designation_code",
                ],
            )
        else:
            employee_data["designation"] = None

        data["employee"] = employee_data

        # =====================================================
        # HIERARCHY IDS
        # These are response fields only.
        # No migration required.
        # =====================================================

        data["department_id"] = (
            employee.department_id
        )

        data["designation_id"] = (
            employee.designation_id
        )

        data["branch_id"] = (
            branch.id
            if branch
            else None
        )

        data["company_id"] = (
            company.id
            if company
            else None
        )

        return data

    @classmethod
    def generate_payroll_report(cls, from_month=None, to_month=None, employee_id=None):
        query = cls.query.join(Employee)
        if employee_id is not None:
            query = query.filter(cls.employee_id == employee_id)
        if from_month:
            query = query.filter(cls.pay_month >= from_month)
        if to_month:
            query = query.filter(cls.pay_month <= to_month)
        query = query.order_by(cls.pay_month, cls.employee_id)

        rows = []
        for payroll in query.all():
            rows.append([
                payroll.employee_id,
                f"{payroll.employee.first_name or ''} {payroll.employee.last_name or ''}".strip(),
                payroll.pay_month,
                float(payroll.gross_salary or 0),
                float(payroll.deductions or 0),
                float(payroll.net_salary or 0),
                payroll.status,
            ])
        headers = ["Employee ID", "Employee Name", "Pay Month", "Gross Salary", "Deductions", "Net Salary", "Status"]
        return Attendance._create_workbook("Payroll Report", headers, rows)


class Performance(TimestampMixin, db.Model):
    __tablename__ = "performance_reviews"

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey("employees.id"), nullable=False)
    review_period = db.Column(db.String(20), nullable=False)
    rating = db.Column(db.Numeric(3, 1))
    remarks = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    employee = db.relationship("Employee")

    def to_dict(self):
        data = super().to_dict()
        data["employee"] = _summary(self.employee, ["id", "employee_code", "first_name", "last_name"])
        return data


class Training(TimestampMixin, db.Model):
    __tablename__ = "trainings"

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey("employees.id"), nullable=False)
    program_name = db.Column(db.String(150), nullable=False)
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    status = db.Column(db.String(20), default="Scheduled")
    is_active = db.Column(db.Boolean, default=True)
    employee = db.relationship("Employee")

    def to_dict(self):
        data = super().to_dict()
        data["employee"] = _summary(self.employee, ["id", "employee_code", "first_name", "last_name"])
        return data


class Promotion(TimestampMixin, db.Model):
    __tablename__ = "promotions"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    employee_id = db.Column(
        db.Integer,
        db.ForeignKey("employees.id"),
        nullable=False,
    )

    from_designation_id = db.Column(
        db.Integer,
        db.ForeignKey("designations.id"),
        nullable=False,
    )

    to_designation_id = db.Column(
        db.Integer,
        db.ForeignKey("designations.id"),
        nullable=False,
    )

    promotion_date = db.Column(
        db.Date,
        nullable=False,
    )

    reason = db.Column(
        db.String(255),
        nullable=False,
        default="Other",
    )

    accomplishments = db.Column(
        db.Text,
        nullable=True,
    )

    is_active = db.Column(
        db.Boolean,
        default=True,
        nullable=False,
    )

    employee = db.relationship(
        "Employee",
        foreign_keys=[employee_id],
    )

    from_designation = db.relationship(
        "Designation",
        foreign_keys=[from_designation_id],
    )

    to_designation = db.relationship(
        "Designation",
        foreign_keys=[to_designation_id],
    )

    def to_dict(self):
        data = super().to_dict()

        data["promotion_date"] = (
            self.promotion_date
        )

        data["reason"] = (
            self.reason or "Other"
        )

        data["accomplishments"] = (
            self.accomplishments or ""
        )

        data["employee"] = _summary(
            self.employee,
            [
                "id",
                "employee_code",
                "first_name",
                "last_name",
            ],
        )

        data["from_designation"] = _summary(
            self.from_designation,
            [
                "id",
                "designation_name",
            ],
        )

        data["to_designation"] = _summary(
            self.to_designation,
            [
                "id",
                "designation_name",
            ],
        )

        return data


class Transfer(TimestampMixin, db.Model):
    __tablename__ = "transfers"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    employee_id = db.Column(
        db.Integer,
        db.ForeignKey("employees.id"),
        nullable=False,
    )

    from_department_id = db.Column(
        db.Integer,
        db.ForeignKey("departments.id"),
        nullable=True,
    )

    to_department_id = db.Column(
        db.Integer,
        db.ForeignKey("departments.id"),
        nullable=False,
    )

    transfer_reason = db.Column(
        db.String(255),
        nullable=False,
        default="Other",
    )

    transfer_apply_date = db.Column(
        db.Date,
        nullable=False,
    )

    relieving_date = db.Column(
        db.Date,
        nullable=False,
    )

    joining_date = db.Column(
        db.Date,
        nullable=False,
    )

    location = db.Column(
        db.String(255),
        nullable=True,
    )

    accomplishments = db.Column(
        db.Text,
        nullable=True,
    )

    is_active = db.Column(
        db.Boolean,
        default=True,
        nullable=False,
    )

    employee = db.relationship(
        "Employee",
        foreign_keys=[employee_id],
    )

    from_department = db.relationship(
        "Department",
        foreign_keys=[from_department_id],
    )

    to_department = db.relationship(
        "Department",
        foreign_keys=[to_department_id],
    )

    def to_dict(self):
        data = super().to_dict()

        data["transfer_reason"] = (
            self.transfer_reason or "Other"
        )

        data["transfer_apply_date"] = (
            self.transfer_apply_date
        )

        data["relieving_date"] = (
            self.relieving_date
        )

        data["joining_date"] = (
            self.joining_date
        )

        data["location"] = (
            self.location or ""
        )

        data["accomplishments"] = (
            self.accomplishments or ""
        )

        data["employee"] = _summary(
            self.employee,
            [
                "id",
                "employee_code",
                "first_name",
                "last_name",
            ],
        )

        data["from_department"] = _summary(
            self.from_department,
            [
                "id",
                "department_name",
            ],
        )

        data["to_department"] = _summary(
            self.to_department,
            [
                "id",
                "department_name",
            ],
        )

        return data


class Resignation(TimestampMixin, db.Model):
    __tablename__ = "resignations"

    id = db.Column(db.Integer, primary_key=True)

    employee_id = db.Column(
        db.Integer,
        db.ForeignKey("employees.id"),
        nullable=False,
    )

    notice_date = db.Column(db.Date, nullable=False)
    last_working_date = db.Column(db.Date, nullable=False)

    reason = db.Column(db.Text)
    accomplishments = db.Column(db.Text)

    # Previous organization details
    previous_company_id = db.Column(
        db.Integer,
        db.ForeignKey("companies.id"),
        nullable=True,
    )

    previous_branch_id = db.Column(
        db.Integer,
        db.ForeignKey("branches.id"),
        nullable=True,
    )

    previous_department_id = db.Column(
        db.Integer,
        db.ForeignKey("departments.id"),
        nullable=True,
    )

    previous_designation_id = db.Column(
        db.Integer,
        db.ForeignKey("designations.id"),
        nullable=True,
    )

    status = db.Column(
        db.String(20),
        default="Pending",
    )

    is_active = db.Column(
        db.Boolean,
        default=True,
    )

    # Employee
    employee = db.relationship(
        "Employee",
        foreign_keys=[employee_id],
    )

    # Previous organization
    previous_company = db.relationship(
        "Company",
        foreign_keys=[previous_company_id],
    )

    previous_branch = db.relationship(
        "Branch",
        foreign_keys=[previous_branch_id],
    )

    previous_department = db.relationship(
        "Department",
        foreign_keys=[previous_department_id],
    )

    previous_designation = db.relationship(
        "Designation",
        foreign_keys=[previous_designation_id],
    )

    def to_dict(self):
        data = super().to_dict()

        data["employee"] = _summary(
            self.employee,
            [
                "id",
                "employee_code",
                "first_name",
                "last_name",
            ],
        )

        data["previous_organization"] = {
            "company": _summary(
                self.previous_company,
                [
                    "id",
                    "name",
                ],
            ),
            "branch": _summary(
                self.previous_branch,
                [
                    "id",
                    "name",
                ],
            ),
            "department": _summary(
                self.previous_department,
                [
                    "id",
                    "department_name",
                ],
            ),
            "designation": _summary(
                self.previous_designation,
                [
                    "id",
                    "designation_name",
                ],
            ),
        }

        return data


class ExitManagement(TimestampMixin, db.Model):
    __tablename__ = "exit_management"

    id = db.Column(db.Integer, primary_key=True)
    resignation_id = db.Column(db.Integer, db.ForeignKey("resignations.id"), nullable=False)
    clearance_status = db.Column(db.String(20), default="Pending")
    exit_date = db.Column(db.Date)
    remarks = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    resignation = db.relationship("Resignation")

    def to_dict(self):
        data = super().to_dict()
        data["resignation"] = _summary(self.resignation, ["id", "employee_id", "status", "last_working_date"])
        return data


# ===========================================================================
# Phase 3 — CRM
# ===========================================================================

class Lead(TimestampMixin, db.Model):
    __tablename__ = "leads"

    id = db.Column(db.Integer, primary_key=True)
    lead_name = db.Column(db.String(150), nullable=False)
    contact_number = db.Column(db.String(15))
    email = db.Column(db.String(150))
    source = db.Column(db.String(50))
    status = db.Column(db.String(20), default="New")
    assigned_to = db.Column(db.Integer, db.ForeignKey("employees.id"))
    created_by = db.Column(db.Integer, db.ForeignKey("employees.id"))
    is_active = db.Column(db.Boolean, default=True)
    assignee = db.relationship("Employee", foreign_keys=[assigned_to])
    creator = db.relationship("Employee", foreign_keys=[created_by])
    customers = db.relationship("Customer", back_populates="lead")

    @staticmethod
    def _derive_team_type(department_name):
        """Classify a department as Voice / Non-Voice so a lead can be
        traced back to which CRM sub-team it came from.

        Matches on the department name text (e.g. "CRM - Voice",
        "CRM Non-Voice") rather than a dedicated column, since the
        Department model doesn't currently carry a separate team-type
        field. If/when one is added, swap this for a direct field read.
        """
        if not department_name:
            return None
        normalized = department_name.strip().lower()
        if "non" in normalized and "voice" in normalized:
            return "Non-Voice"
        if "voice" in normalized:
            return "Voice"
        return None

    @classmethod
    def _employee_hierarchy(cls, employee):
        """Build a company / branch / department / designation summary
        (plus a derived Voice / Non-Voice team_type) for a given
        Employee. Used for both the creator and the assignee so either
        can be traced through the CRM org structure."""
        if not employee:
            return None

        department = getattr(employee, "department", None)
        designation = getattr(employee, "designation", None)
        company = getattr(department, "company", None) if department else None
        branch = getattr(department, "branch", None) if department else None
        department_name = getattr(department, "department_name", None)

        return {
            "company": _summary(company, ["id", "name"]),
            "branch": _summary(branch, ["id", "name"]),
            "department": _summary(department, ["id", "department_name"]),
            "designation": _summary(designation, ["id", "designation_name"]),
            "team_type": cls._derive_team_type(department_name),
        }

    def to_dict(self):
        data = super().to_dict()
        data["assignee"] = _summary(self.assignee, ["id", "employee_code", "first_name", "last_name"])
        data["creator"] = _summary(self.creator, ["id", "employee_code", "first_name", "last_name"])
        data["assignee_hierarchy"] = self._employee_hierarchy(self.assignee)
        data["creator_hierarchy"] = self._employee_hierarchy(self.creator)

        return data


class Customer(TimestampMixin, db.Model):
    __tablename__ = "customers"

    id = db.Column(db.Integer, primary_key=True)
    lead_id = db.Column(db.Integer, db.ForeignKey("leads.id"), nullable=True)
    customer_name = db.Column(db.String(150), nullable=False)
    contact_number = db.Column(db.String(15))
    email = db.Column(db.String(150))
    address = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    lead = db.relationship("Lead", back_populates="customers")

    def to_dict(self):
        data = super().to_dict()
        data["lead"] = _summary(self.lead, ["id", "lead_name", "status"])
        return data


class FollowUp(TimestampMixin, db.Model):
    __tablename__ = "follow_ups"

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False)
    follow_up_date = db.Column(db.DateTime, nullable=False)
    notes = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    customer = db.relationship("Customer")

    def to_dict(self):
        data = super().to_dict()
        data["customer"] = _summary(self.customer, ["id", "customer_name"])
        return data


class Meeting(TimestampMixin, db.Model):
    __tablename__ = "meetings"

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False)
    meeting_date = db.Column(db.DateTime, nullable=False)
    notes = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    customer = db.relationship("Customer")

    def to_dict(self):
        data = super().to_dict()
        data["customer"] = _summary(self.customer, ["id", "customer_name"])
        return data


class Quotation(TimestampMixin, db.Model):
    __tablename__ = "quotations"

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False)
    quotation_number = db.Column(db.String(30), unique=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    status = db.Column(db.String(20), default="Draft")
    is_active = db.Column(db.Boolean, default=True)
    customer = db.relationship("Customer")

    def to_dict(self):
        data = super().to_dict()
        data["customer"] = _summary(self.customer, ["id", "customer_name"])
        return data


class Invoice(TimestampMixin, db.Model):
    __tablename__ = "invoices"

    id = db.Column(db.Integer, primary_key=True)
    quotation_id = db.Column(db.Integer, db.ForeignKey("quotations.id"), nullable=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False)
    invoice_number = db.Column(db.String(30), unique=True)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    due_date = db.Column(db.Date)
    status = db.Column(db.String(20), default="Unpaid")
    is_active = db.Column(db.Boolean, default=True)
    customer = db.relationship("Customer")
    payments = db.relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")

    def to_dict(self):
        data = super().to_dict()
        data["customer"] = _summary(self.customer, ["id", "customer_name"])
        data["paid_amount"] = float(sum((p.amount or 0) for p in self.payments))
        return data

    @classmethod
    def generate_crm_report(cls, from_date=None, to_date=None):
        query = Lead.query
        rows = []
        for lead in query.order_by(Lead.id).all():
            rows.append([lead.id, lead.lead_name, lead.status, lead.source or "", "Lead", "", ""])

        invoice_query = cls.query
        if from_date and to_date:
            invoice_query = invoice_query.filter(cls.due_date.between(from_date, to_date))
        for invoice in invoice_query.order_by(cls.id).all():
            paid = sum((p.amount or 0) for p in invoice.payments)
            rows.append([
                invoice.id,
                invoice.customer.customer_name if invoice.customer else "",
                invoice.status,
                "",
                "Invoice",
                float(invoice.amount or 0),
                float(paid),
            ])
        headers = ["ID", "Name", "Status", "Source", "Record Type", "Amount", "Paid Amount"]
        return Attendance._create_workbook("CRM Report", headers, rows)


class Payment(TimestampMixin, db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id"), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    payment_date = db.Column(db.Date, nullable=False)
    mode = db.Column(db.String(30))
    is_active = db.Column(db.Boolean, default=True)
    invoice = db.relationship("Invoice", back_populates="payments")

    def to_dict(self):
        data = super().to_dict()
        data["invoice"] = _summary(self.invoice, ["id", "invoice_number", "amount", "status"])
        return data


class SupportTicket(TimestampMixin, db.Model):
    __tablename__ = "support_tickets"

    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey("customers.id"), nullable=False)
    subject = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default="Open")
    is_active = db.Column(db.Boolean, default=True)
    customer = db.relationship("Customer")

    def to_dict(self):
        data = super().to_dict()
        data["customer"] = _summary(self.customer, ["id", "customer_name"])
        return data


# ===========================================================================
# Phase 4 — Finance
# ===========================================================================

class Account(TimestampMixin, db.Model):
    __tablename__ = "accounts"

    id = db.Column(db.Integer, primary_key=True)
    account_name = db.Column(db.String(100), nullable=False)
    account_type = db.Column(db.String(30))
    balance = db.Column(db.Numeric(14, 2), default=0)
    is_active = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return super().to_dict()


class Vendor(TimestampMixin, db.Model):
    __tablename__ = "vendors"

    id = db.Column(db.Integer, primary_key=True)
    vendor_name = db.Column(db.String(150), nullable=False)
    contact_number = db.Column(db.String(15))
    gstin = db.Column(db.String(20))
    is_active = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return super().to_dict()


class Expense(TimestampMixin, db.Model):
    __tablename__ = "expenses"

    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=False)
    vendor_id = db.Column(db.Integer, db.ForeignKey("vendors.id"), nullable=True)
    category = db.Column(db.String(50))
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    expense_date = db.Column(db.Date, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    account = db.relationship("Account")
    vendor = db.relationship("Vendor")

    def to_dict(self):
        data = super().to_dict()
        data["account"] = _summary(self.account, ["id", "account_name"])
        data["vendor"] = _summary(self.vendor, ["id", "vendor_name"]) if self.vendor else None
        return data

    @classmethod
    def generate_finance_report(cls, from_date=None, to_date=None):
        rows = []
        expense_query = cls.query
        if from_date and to_date:
            expense_query = expense_query.filter(cls.expense_date.between(from_date, to_date))
        for expense in expense_query.order_by(cls.expense_date).all():
            rows.append([
                expense.expense_date.isoformat(),
                "Expense",
                expense.category or "",
                float(expense.amount or 0),
                expense.account.account_name if expense.account else "",
            ])

        income_query = Income.query
        if from_date and to_date:
            income_query = income_query.filter(Income.income_date.between(from_date, to_date))
        for income in income_query.order_by(Income.income_date).all():
            rows.append([
                income.income_date.isoformat(),
                "Income",
                income.source or "",
                float(income.amount or 0),
                income.account.account_name if income.account else "",
            ])

        headers = ["Date", "Type", "Category / Source", "Amount", "Account"]
        return Attendance._create_workbook("Finance Report", headers, rows)


class Income(TimestampMixin, db.Model):
    __tablename__ = "income"

    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey("accounts.id"), nullable=False)
    source = db.Column(db.String(100))
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    income_date = db.Column(db.Date, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    account = db.relationship("Account")

    def to_dict(self):
        data = super().to_dict()
        data["account"] = _summary(self.account, ["id", "account_name"])
        return data