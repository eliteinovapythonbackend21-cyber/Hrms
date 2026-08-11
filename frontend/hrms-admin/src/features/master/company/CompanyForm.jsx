import { useEffect, useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { isRequired } from "@/utils/validators";

const initialForm = {
  name: "",
  code: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
  status: true,
};

const validateCompany = (data) => {
  const errors = {};

  if (!isRequired(data.name)) {
    errors.name = "Company name is required";
  }

  return errors;
};

export default function CompanyForm({
  initialData = {},
  onSubmit,
  loading = false,
  onCancel,
  isEdit = false,
}) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setForm({
        name: initialData.name || "",
        code: initialData.code || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        website: initialData.website || "",
        address: initialData.address || "",
        city: initialData.city || "",
        state: initialData.state || "",
        country: initialData.country || "",
        pincode: initialData.pincode || "",
        status:
          initialData.status !== undefined
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
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validationErrors = validateCompany(form);

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    onSubmit({
      ...form,
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      website: form.website.trim() || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      country: form.country.trim() || undefined,
      pincode: form.pincode.trim() || undefined,
    });
  };

  return (
    <form
      id="company-form"
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {/* Company Information */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Company Information
        </h2>

        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Enter the company details.
        </p>
      </div>

      {/* Company Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Company Name"
          name="name"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
          required
        />

        <Input
          label="Company Code"
          name="code"
          value={form.code}
          onChange={handleChange}
          placeholder="Auto generated if empty"
        />

        <Input
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="company@example.com"
        />

        <Input
          label="Phone"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Phone number"
        />

        <div className="md:col-span-2">
          <Input
            label="Website"
            name="website"
            type="url"
            value={form.website}
            onChange={handleChange}
            placeholder="https://example.com"
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600"
            placeholder="Company address"
          />
        </div>

        <Input
          label="City"
          name="city"
          value={form.city}
          onChange={handleChange}
        />

        <Input
          label="State"
          name="state"
          value={form.state}
          onChange={handleChange}
        />

        <Input
          label="Country"
          name="country"
          value={form.country}
          onChange={handleChange}
        />

        <Input
          label="Pincode"
          name="pincode"
          value={form.pincode}
          onChange={handleChange}
        />
      </div>

      {/* Status */}
      <div className="mb-4">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            name="status"
            checked={form.status}
            onChange={handleChange}
            className="h-4 w-4"
          />

          Active
        </label>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2 mt-6">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          isLoading={loading}
        >
          {isEdit ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}