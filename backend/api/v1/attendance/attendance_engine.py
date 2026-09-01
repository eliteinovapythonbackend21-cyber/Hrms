"""Derives every working-hours / permission / late-login / overtime figure
on an Attendance row from its ordered AttendanceEvent timeline plus the
global AttendanceSetting config.

Timeline model: a day is a sequence of `check_in` / `check_out` events.
  - check_in  -> check_out : a WORK segment (counts towards working hours)
  - check_out -> check_in  : a PERMISSION gap (counts towards permission)
Fixed break durations (nap / lunch / tea) from settings are deducted from
gross working time. The caller is responsible for committing.
"""

from datetime import datetime

from models import AttendanceSetting

_UNTOUCHED_STATUSES = ("Leave", "Holiday", "Week Off")


def recompute_attendance(attendance):
    settings = AttendanceSetting.get_settings()

    events = sorted(
        [
            e
            for e in (attendance.events or [])
            if e.is_active and e.event_time is not None
        ],
        key=lambda e: e.event_time,
    )

    first_in = next(
        (e for e in events if e.event_type == "check_in"), None
    )
    last_out = next(
        (e for e in reversed(events) if e.event_type == "check_out"), None
    )

    # Keep the legacy single-column pair pointing at the day's outer bounds.
    attendance.check_in = first_in.event_time if first_in else None
    attendance.check_out = last_out.event_time if last_out else None

    # --- walk the timeline ---
    # A check_in -> check_out span is WORK. A check_out -> check_in gap is a
    # break / permission, attributed to that check_out's reason_type
    # (nap / lunch / tea / permission). Gaps are never counted as work, so
    # there is no separate deduction — the config durations are just caps.
    gross_seconds = 0.0
    bucket_seconds = {"nap": 0.0, "lunch": 0.0, "tea": 0.0, "permission": 0.0}
    open_in = None            # timestamp of an unmatched check_in
    open_out = None           # timestamp of an unmatched check_out
    open_out_type = None      # reason_type of that check_out

    for e in events:
        if e.event_type == "check_in":
            if open_out is not None:
                gap = (e.event_time - open_out).total_seconds()
                if gap > 0:
                    key = open_out_type if open_out_type in bucket_seconds else "permission"
                    bucket_seconds[key] += gap
                open_out = None
                open_out_type = None
            if open_in is None:
                open_in = e.event_time
        elif e.event_type == "check_out":
            if open_in is not None:
                seg = (e.event_time - open_in).total_seconds()
                if seg > 0:
                    gross_seconds += seg
                open_in = None
            open_out = e.event_time
            open_out_type = e.reason_type

    gross_hours = gross_seconds / 3600.0
    net_hours = max(0.0, gross_hours)

    attendance.gross_working_hours = round(gross_hours, 2)
    attendance.working_hours = round(net_hours, 2)

    # --- measured break / permission durations ---
    attendance.nap_minutes = round(bucket_seconds["nap"] / 60.0, 1)
    attendance.lunch_minutes = round(bucket_seconds["lunch"] / 60.0, 1)
    attendance.tea_minutes = round(bucket_seconds["tea"] / 60.0, 1)

    permission_minutes = bucket_seconds["permission"] / 60.0
    attendance.permission_minutes = round(permission_minutes, 1)
    attendance.permission_over_limit = permission_minutes > float(
        settings.max_permission_minutes_per_day or 0
    )

    # --- late login ---
    late_minutes = 0.0
    if first_in is not None and attendance.attendance_date is not None:
        cutoff = datetime.combine(
            attendance.attendance_date, settings.work_start_time
        )
        if first_in.event_time > cutoff:
            late_minutes = (
                first_in.event_time - cutoff
            ).total_seconds() / 60.0
    attendance.late_login_minutes = round(late_minutes, 1)

    late_ev = next(
        (e for e in events if e.reason_type == "late_login"), None
    )
    attendance.late_login_reason = late_ev.reason if late_ev else None

    # --- overtime ---
    required = float(settings.required_hours_per_day or 0)
    attendance.overtime_hours = round(max(0.0, net_hours - required), 2)

    ot_ev = next(
        (e for e in reversed(events) if e.reason_type == "overtime"), None
    )
    attendance.overtime_reason = ot_ev.reason if ot_ev else None

    # --- status (never clobber an explicit Leave / Holiday) ---
    if attendance.attendance_status not in _UNTOUCHED_STATUSES:
        attendance.attendance_status = (
            "Present" if net_hours > 0 else "Absent"
        )

    return attendance


def open_session(attendance):
    """True when the last active event is a check_in with no matching
    check_out — i.e. the employee is currently 'in'."""
    events = sorted(
        [
            e
            for e in (attendance.events or [])
            if e.is_active and e.event_time is not None
        ],
        key=lambda e: e.event_time,
    )
    if not events:
        return False
    return events[-1].event_type == "check_in"
