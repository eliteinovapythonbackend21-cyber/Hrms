import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import { masterApi } from "@/api/master.api";

const initialForm = {
  company_id: "",
  name: "",
  code: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
  status: true,
};

export default function BranchForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});

  // Dedicated, active-only company fetch — deliberately separate from
  // whatever BranchListPage uses for its "All Companies" filter dropdown.
  // That filter dropdown is allowed to show inactive companies (so you can
  // still filter branches by one you deactivated); this form must NOT,
  // since you shouldn't be able to create a branch under a dead company.
  const { data: companiesData } = useQuery({
    queryKey: ["companies-dropdown"],
    queryFn: async () =>
      (
        await masterApi.listCompanies({
          page: 1,
          per_page: 100,
          is_active: true,
        })
      ).data.data,
  });

  const companyOptions = (companiesData?.items || []).filter(
    (c) => c.status
  );

  useEffect(() => {
    if (initialData) {
      setForm({
        company_id:
          initialData.company_id ?? initialData.company?.id ?? "",
        name: initialData.name || "",
        code: initialData.code || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        address: initialData.address || "",
        city: initialData.city || "",
        state: initialData.state || "",
        country: initialData.country || "",
        pincode: initialData.pincode || "",
        status:
          typeof initialData.status === "boolean"
            ? initialData.status
            : true,
      });
    } else {
      setForm(initialForm);
    }

    setErrors({});
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.company_id) {
      nextErrors.company_id = "Company is required";
    }

    if (!form.name.trim()) {
      nextErrors.name = "Branch name is required";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    onSubmit({
      ...form,
      company_id: Number(form.company_id),
      name: form.name.trim(),
      code: form.code.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Branch Information
        </h2>

        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Enter the branch details.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">
            Company *
          </label>

          <select
            name="company_id"
            value={form.company_id}
            onChange={handleChange}
            className={`w-full rounded-lg border px-3 py-2 dark:bg-white/[0.06] ${
              errors.company_id
                ? "border-red-400"
                : "border-slate-300 dark:border-slate-600"
            }`}
          >
            <option value="">Select a company</option>

            {companyOptions.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>

          {errors.company_id && (
            <p className="mt-1 text-xs text-red-500">
              {errors.company_id}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Branch Name *
          </label>

          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className={`w-full rounded-lg border px-3 py-2 dark:bg-white/[0.06] ${
              errors.name
                ? "border-red-400"
                : "border-slate-300 dark:border-slate-600"
            }`}
            placeholder="Enter branch name"
          />

          {errors.name && (
            <p className="mt-1 text-xs text-red-500">{errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Branch Code
          </label>

          <input
            type="text"
            name="code"
            value={form.code}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:bg-white/[0.06] dark:border-slate-600"
            placeholder="Auto generated if empty"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Email
          </label>

          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:bg-white/[0.06] dark:border-slate-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Phone
          </label>

          <input
            type="text"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:bg-white/[0.06] dark:border-slate-600"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">
            Address
          </label>

          <textarea
            name="address"
            value={form.address}
            onChange={handleChange}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:bg-white/[0.06] dark:border-slate-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            City
          </label>

          <input
            type="text"
            name="city"
            value={form.city}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:bg-white/[0.06] dark:border-slate-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            State
          </label>

          <input
            type="text"
            name="state"
            value={form.state}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:bg-white/[0.06] dark:border-slate-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Country
          </label>

          <input
            type="text"
            name="country"
            value={form.country}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:bg-white/[0.06] dark:border-slate-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Pincode
          </label>

          <input
            type="text"
            name="pincode"
            value={form.pincode}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:bg-white/[0.06] dark:border-slate-600"
          />
        </div>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="status"
          checked={form.status}
          onChange={handleChange}
        />

        <span className="text-sm font-medium">
          Active
        </span>
      </label>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Saving..."
            : initialData
              ? "Update Branch"
              : "Create Branch"}
        </Button>
      </div>
    </form>
  );
}