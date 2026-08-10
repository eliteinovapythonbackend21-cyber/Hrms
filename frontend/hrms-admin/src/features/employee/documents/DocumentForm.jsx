import { useEffect, useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useEmployeeOptions } from "@/hooks/useLookupOptions";
import { isRequired } from "@/utils/validators";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "application/pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function DocumentForm({ formId = "employee-documents-form", initialData, onSubmit, loading }) {
  const employeeOptions = useEmployeeOptions();
  const [form, setForm] = useState({
    employee_id: initialData?.employee_id || "",
    doc_type: initialData?.doc_type || "",
  });
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const resetFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
  };

  const handleFileChange = (selected) => {
    if (!selected) return;

    if (!ALLOWED_TYPES.includes(selected.type)) {
      resetFile();
      setErrors((prev) => ({ ...prev, file: "Only image (PNG/JPG/GIF) or PDF files are allowed" }));
      return;
    }
    if (selected.size === 0) {
      resetFile();
      setErrors((prev) => ({ ...prev, file: "The selected file is empty or corrupted" }));
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      resetFile();
      setErrors((prev) => ({ ...prev, file: "File must be smaller than 5 MB" }));
      return;
    }

    setErrors((prev) => ({ ...prev, file: undefined }));
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handlePreview = () => {
    if (previewUrl) window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!isRequired(form.employee_id)) errs.employee_id = "Employee is required";
    if (!isRequired(form.doc_type)) errs.doc_type = "Document Type is required";
    if (!file) errs.file = "File is required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSubmit({ ...form, file });
  };

  return (
    <form id={formId} onSubmit={handleSubmit}>
      <Select
        label="Employee"
        name="employee_id"
        value={form.employee_id}
        onChange={handleChange}
        options={employeeOptions}
        error={errors.employee_id}
        required
      />
      <Input
        label="Document Type"
        name="doc_type"
        value={form.doc_type}
        onChange={handleChange}
        error={errors.doc_type}
        required
        placeholder="e.g. Aadhaar, PAN, Resume"
      />

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          File
          <span className="text-red-500 ml-1">*</span>
        </label>

        {!file ? (
          <label
            className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer transition-colors ${
              errors.file
                ? "border-red-500"
                : "border-slate-300 dark:border-slate-600 hover:border-primary-500 dark:hover:border-primary-400"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 9l5-5 5 5M12 4v12" />
            </svg>
            <span className="text-sm text-slate-600 dark:text-slate-300">Click to upload an image or PDF</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">PNG, JPG, GIF or PDF, up to 5 MB</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,application/pdf"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
          </label>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5">
            {file.type === "application/pdf" ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-red-50 dark:bg-red-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            ) : (
              <img src={previewUrl} alt={file.name} className="h-10 w-10 shrink-0 rounded object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-700 dark:text-slate-300">{file.name}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button
              type="button"
              onClick={handlePreview}
              className="shrink-0 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              Preview
            </button>
            <label className="shrink-0 cursor-pointer text-xs font-medium text-slate-500 hover:underline dark:text-slate-400">
              Change
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,application/pdf"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />
            </label>
            <button
              type="button"
              onClick={resetFile}
              className="shrink-0 text-xs font-medium text-red-500 hover:underline"
            >
              Remove
            </button>
          </div>
        )}
        {errors.file && <p className="mt-1 text-xs text-red-500">{errors.file}</p>}
      </div>
    </form>
  );
}
