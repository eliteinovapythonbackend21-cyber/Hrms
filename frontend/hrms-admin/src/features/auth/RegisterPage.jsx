import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useRegister } from "./useAuth";
import { authApi } from "@/api/auth.api";
import { useToast } from "@/components/feedback/Toast";
import { validateRegister } from "./authValidation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import AuthLayout from "@/layout/AuthLayout";
import { ROLE_OPTIONS } from "@/constants/roles";

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const PhoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.97.76l1.1 4.4a1 1 0 01-.5 1.11l-1.7.86a12.04 12.04 0 006.3 6.3l.86-1.7a1 1 0 011.11-.5l4.4 1.1a1 1 0 01.76.97V19a2 2 0 01-2 2h-1C9.16 21 3 14.84 3 7V5z" />
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v4h8z" />
  </svg>
);

export default function RegisterPage() {
  const { showToast } = useToast();
  const register = useRegister();
  const [form, setForm] = useState({
    username: "",
    email: "",
    mobile: "",
    password: "",
    role: "employee",
    first_name: "",
    last_name: "",
    department_id: "",
    designation_id: "",
  });
  const [errors, setErrors] = useState({});

  const { data: departments } = useQuery({
    queryKey: ["auth", "departments"],
    queryFn: async () => (await authApi.departments()).data.data,
  });

  const { data: designations } = useQuery({
    queryKey: ["auth", "designations", form.department_id],
    queryFn: async () => (await authApi.designations(form.department_id)).data.data,
    enabled: !!form.department_id,
  });

  const deptOptions = (departments || []).map((d) => ({ value: d.id, label: d.department_name }));
  const desigOptions = (designations || []).map((d) => ({ value: d.id, label: d.designation_name }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "department_id") {
      // Designation belongs to a department — reset it whenever the
      // department changes so a stale pick from a different department
      // can't be submitted.
      setForm({ ...form, department_id: value, designation_id: "" });
      return;
    }
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateRegister(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      await register.mutateAsync(form);
      showToast("Registration successful. Please sign in.", "success");
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed";
      showToast(msg, "error");
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Register for HRMS"
    >
      <form onSubmit={handleSubmit}>
        <Input
          label="Username"
          name="username"
          placeholder="johndoe"
          value={form.username}
          onChange={handleChange}
          error={errors.username}
          icon={<UserIcon />}
          required
        />
        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          icon={<MailIcon />}
          required
        />
        <Input
          label="Mobile"
          name="mobile"
          placeholder="+91 98765 43210"
          value={form.mobile}
          onChange={handleChange}
          error={errors.mobile}
          icon={<PhoneIcon />}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="At least 6 characters"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          icon={<LockIcon />}
          required
        />
        <Select
          label="Role"
          name="role"
          options={ROLE_OPTIONS.map((r) => ({ value: r.name, label: r.label }))}
          value={form.role}
          onChange={handleChange}
          error={errors.role}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-4">
          <Input
            label="First Name"
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            error={errors.first_name}
            required
          />
          <Input
            label="Last Name"
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            error={errors.last_name}
          />
          <Select
            label="Department"
            name="department_id"
            options={deptOptions}
            value={form.department_id}
            onChange={handleChange}
            error={errors.department_id}
            required
          />
          <Select
            label="Designation"
            name="designation_id"
            options={desigOptions}
            value={form.designation_id}
            onChange={handleChange}
            error={errors.designation_id}
            placeholder={form.department_id ? "Select..." : "Select a department first"}
            disabled={!form.department_id}
            required
          />
        </div>

        <Button
          type="submit"
          className="w-full mt-2"
          isLoading={register.isPending}
        >
          Register
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-primary-600 dark:text-primary-400 hover:underline"
        >
          Sign In
        </Link>
      </p>
    </AuthLayout>
  );
}
