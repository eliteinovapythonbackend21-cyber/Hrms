from datetime import datetime, date, timedelta
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
    is_active = db.Column(db.Boolean, default=True)
    actions = db.Column(db.Text, nullable=True)
    users = db.relationship("BaseUser", back_populates="role_obj", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Role {self.name}>"

    def to_dict(self):
        data = super().to_dict()
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

    id = db.Column(db.Integer,primary_key=True)
    department_code = db.Column(db.String(20),nullable=False,unique=True)
    department_name = db.Column(db.String(100),nullable=False,unique=True)
    description = db.Column(db.Text)
    status = db.Column(db.Boolean,default=True)
    is_active = db.Column(db.Boolean, default=True)
    employees = db.relationship("Employee",back_populates="department")
    designations = db.relationship("Designation",back_populates="department")

    def __repr__(self):
        return self.department_name

    def to_dict(self):
        data = super().to_dict()
        data["employees"] = [
            _summary(employee, ["id", "employee_code", "first_name", "last_name"])
            for employee in self.employees
        ]
        data["designations"] = [
            _summary(designation, ["id", "designation_name", "designation_code"])
            for designation in self.designations
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
    description = db.Column(db.Text)
    status = db.Column(db.Boolean,default=True)
    is_active = db.Column(db.Boolean, default=True)
    department = db.relationship("Department",back_populates="designations")
    employees = db.relationship("Employee",back_populates="designation")

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
        data["department"] = _summary(self.department, ["id", "department_name", "department_code"])
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
        data["department"] = _summary(self.department, ["id", "department_name", "department_code"])
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


