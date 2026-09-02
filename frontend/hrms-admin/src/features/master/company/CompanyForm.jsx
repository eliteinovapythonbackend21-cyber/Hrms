import { useEffect, useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { isRequired } from "@/utils/validators";
import { useMagnetic, Motion3DStyles } from "@/hooks/use3DMotion";

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

  const submitMagnet = useMagnetic(0.22);

  // Branches already saved against this company (edit mode only).
  // Shown read-only here — manage/remove them from the Branches page.
  const existingBranches = initialData?.branches || [];

  // New branch names queued up to create right after this company
  // is saved.
  const [branchNames, setBranchNames] = useState([]);
  const [branchInput, setBranchInput] = useState("");
  const [branchError, setBranchError] = useState("");

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
    setBranchNames([]);
    setBranchInput("");
    setBranchError("");
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

  const handleAddBranch = () => {
    const name = branchInput.trim();

    if (!name) return;

    const alreadyQueued = branchNames.some(
      (b) => b.toLowerCase() === name.toLowerCase()
    );

    const alreadyExists = existingBranches.some(
      (b) => b.name?.toLowerCase() === name.toLowerCase()
    );

    if (alreadyQueued || alreadyExists) {
      setBranchError("That branch name is already added");
      return;
    }

    setBranchNames((prev) => [...prev, name]);
    setBranchInput("");
    setBranchError("");
  };

  const handleBranchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddBranch();
    }
  };

  const handleRemoveBranch = (index) => {
    setBranchNames((prev) => prev.filter((_, i) => i !== index));
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
      branch_names: branchNames,
    });
  };

  return (
    <form
      id="company-form"
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <Motion3DStyles />

      {/* Company Information */}
      <div className="u-rise flex items-center gap-3">
        <div className="u-hover-float">
          <div className="u-float-target flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-sm shadow-primary-600/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16M9 7h2M9 11h2M9 15h2M15 7h2M15 11h2M15 15h2" />
            </svg>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Company Information
          </h2>

          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enter the company details.
          </p>
        </div>
      </div>

      {/* Company Fields */}
      <div className="u-rise grid grid-cols-1 md:grid-cols-2 gap-4" style={{ animationDelay: "60ms" }}>
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:bg-white/[0.06] dark:border-slate-600"
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

      {/* Branches */}
      <div
        className="u-rise rounded-lg border border-slate-200 p-3 transition-shadow duration-300 hover:shadow-md dark:border-white/10"
        style={{ animationDelay: "110ms" }}
      >
        <label className="mb-1 block text-sm font-medium">
          Branches
        </label>

        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
          {isEdit
            ? "Add extra branch names here — they'll be created for this company as soon as you save."
            : "Optional. Add one or more branch names — each will be created automatically right after the company is saved."}
        </p>

        {existingBranches.length > 0 && (
          <div className="mb-3">
            <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Existing branches
            </p>

            <div className="flex flex-wrap gap-1.5">
              {existingBranches.map((b) => (
                <span
                  key={b.id}
                  className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 transition-transform duration-200 hover:scale-105 dark:bg-white/[0.06] dark:text-slate-300"
                >
                  {b.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={branchInput}
            onChange={(e) => setBranchInput(e.target.value)}
            onKeyDown={handleBranchKeyDown}
            placeholder="e.g. Chennai Branch"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-white/[0.06]"
          />

          <button
            type="button"
            onClick={handleAddBranch}
            className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            + Add
          </button>
        </div>

        {branchError && (
          <p className="mt-1 text-xs text-red-500">{branchError}</p>
        )}

        {branchNames.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {branchNames.map((name, index) => (
              <span
                key={`${name}-${index}`}
                className="u-rise inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-xs text-primary-700 transition-transform duration-200 hover:scale-105 hover:shadow-sm dark:bg-primary-500/10 dark:text-primary-300"
              >
                {name}
                <button
                  type="button"
                  onClick={() => handleRemoveBranch(index)}
                  aria-label={`Remove ${name}`}
                  className="text-primary-500 transition-transform hover:scale-125 hover:text-primary-700 dark:hover:text-primary-100"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
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
          className="transition-transform duration-200 hover:-translate-y-0.5"
        >
          Cancel
        </Button>

        <div
          ref={submitMagnet.ref}
          {...submitMagnet.handlers}
          className="inline-block will-change-transform"
        >
          <Button
            type="submit"
            isLoading={loading}
            className="shadow-sm transition-shadow duration-200 hover:shadow-lg"
          >
            {isEdit ? "Update Company" : "Create Company"}
          </Button>
        </div>
      </div>
    </form>
  );
}