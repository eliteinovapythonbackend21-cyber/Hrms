import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import DatePicker from "@/components/ui/DatePicker";
import { employeesApi } from "@/api/employees.api";
import { isRequired } from "@/utils/validators";

const validateManualAttendance = (data) => {
  const errors = {};
  if (!isRequired(data.employee_id)) errors.employee_id = "Employee is required";
  if (!isRequired(data.attendance_date)) errors.attendance_date = "Attendance date is required";
  if (!isRequired(data.check_in)) errors.check_in = "Check-in time is required";
  if (!isRequired(data.check_out)) errors.check_out = "Check-out time is required";
  if (data.check_in && data.check_out && data.check_out <= data.check_in) {
    errors.check_out = "Check-out must be after check-in";
  }
  return errors;
};

export default function ManualAttendanceForm({ initialData = {}, onSubmit, loading }) {
  const { data: employees } = useQuery({
    queryKey: ["employees", { page: 1, per_page: 100 }],
    queryFn: async () => (await employeesApi.list({ page: 1, per_page: 100 })).data.data,
  });

  const [form, setForm] = useState({
    employee_id: initialData.employee_id || "",
    attendance_date: initialData.attendance_date || "",
    check_in: initialData.check_in ? initialData.check_in.slice(11, 16) : "",
    check_out: initialData.check_out ? initialData.check_out.slice(11, 16) : "",
    attendance_status: initialData.attendance_status || "Present",
    latitude: initialData.checkin_latitude ?? "",
    longitude: initialData.checkin_longitude ?? "",
    checkout_latitude: initialData.checkout_latitude ?? "",
    checkout_longitude: initialData.checkout_longitude ?? "",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateManualAttendance(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    // Coordinate fields are optional Numeric columns on the backend with no
    // parsing on that end — an empty string would fail at the DB layer, so
    // omit rather than send "".
    const coordFields = ["latitude", "longitude", "checkout_latitude", "checkout_longitude"];
    const payload = { ...form };
    coordFields.forEach((field) => {
      if (payload[field] === "") delete payload[field];
    });
    onSubmit(payload);
  };

  const empOptions = (employees?.items || []).map((emp) => ({
    value: emp.id,
    label: `${emp.employee_code} - ${emp.first_name} ${emp.last_name}`.trim(),
  }));

  return (
    <form onSubmit={handleSubmit}>
      <Select
        label="Employee"
        name="employee_id"
        options={empOptions}
        value={form.employee_id}
        onChange={handleChange}
        error={errors.employee_id}
        required
      />
      <DatePicker
        label="Attendance Date"
        name="attendance_date"
        value={form.attendance_date}
        onChange={handleChange}
        error={errors.attendance_date}
        required
      />
      <Input
        label="Check In"
        name="check_in"
        type="time"
        value={form.check_in}
        onChange={handleChange}
        error={errors.check_in}
        required
      />
      <Input
        label="Check Out"
        name="check_out"
        type="time"
        value={form.check_out}
        onChange={handleChange}
        error={errors.check_out}
        required
      />
      <Select
        label="Status"
        name="attendance_status"
        options={[
          { value: "Present", label: "Present" },
          { value: "Absent", label: "Absent" },
          { value: "Leave", label: "Leave" },
        ]}
        value={form.attendance_status}
        onChange={handleChange}
      />
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
        Location (optional)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Input
          label="Check-in Latitude"
          name="latitude"
          type="number"
          step="any"
          value={form.latitude}
          onChange={handleChange}
        />
        <Input
          label="Check-in Longitude"
          name="longitude"
          type="number"
          step="any"
          value={form.longitude}
          onChange={handleChange}
        />
        <Input
          label="Check-out Latitude"
          name="checkout_latitude"
          type="number"
          step="any"
          value={form.checkout_latitude}
          onChange={handleChange}
        />
        <Input
          label="Check-out Longitude"
          name="checkout_longitude"
          type="number"
          step="any"
          value={form.checkout_longitude}
          onChange={handleChange}
        />
      </div>
      <Button type="submit" isLoading={loading} className="w-full">
        {initialData.id ? "Update Entry" : "Record Manual Attendance"}
      </Button>
    </form>
  );
}
