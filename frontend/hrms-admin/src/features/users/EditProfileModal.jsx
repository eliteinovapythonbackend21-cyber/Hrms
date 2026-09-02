import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Avatar from "@/components/ui/Avatar";
import { useToast } from "@/components/feedback/Toast";
import { usersApi } from "@/api/users.api";
import { setUser } from "@/utils/tokenHelpers";
import { notifyUserUpdated } from "@/hooks/useCurrentUser";
import { resolveUploadUrl } from "@/utils/fileUrl";
import { validateEditProfile } from "./userValidation";
import { useMagnetic, Motion3DStyles } from "@/hooks/use3DMotion";

export default function EditProfileModal({ open, onClose, user }) {
  const { showToast } = useToast();
  const isEmployee = user?.role === "employee";
  const [form, setForm] = useState({
    username: user?.username || "",
    email: user?.email || "",
    mobile: user?.mobile || "",
    other_number: user?.other_number || "",
    emergency_contact_number: user?.emergency_contact_number || "",
  });
  const [picture, setPicture] = useState(null);
  const [preview, setPreview] = useState(resolveUploadUrl(user?.profile_picture?.url));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const saveMagnet = useMagnetic(0.2);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePictureChange = (file) => {
    if (!file) return;
    setPicture(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateEditProfile(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    try {
      // Employees may only change fields that aren't HR-managed — the
      // username / email / primary contact inputs are shown for context
      // but rendered read-only, so only the editable values are sent.
      const editable = { ...form };
      delete editable.other_number;
      const profilePayload = isEmployee
        ? { emergency_contact_number: form.emergency_contact_number }
        : editable;
      if (!isEmployee && picture) profilePayload.profile_picture = picture;
      const res = await usersApi.updateProfile(user.id, profilePayload);
      setUser({ ...user, ...res.data.data });

      notifyUserUpdated();
      showToast("Profile updated", "success");
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Profile" size="lg">
      <form onSubmit={handleSubmit} className="u-rise">
        <Motion3DStyles />
        <div className="u-hover-float flex items-center gap-4 mb-6">
          <div className="u-float-target relative shrink-0">
            <Avatar name={form.username} src={preview} size="lg" />
            {!isEmployee && (
              <label
                title="Upload photo"
                className="absolute -bottom-1 -right-1 flex items-center justify-center h-6 w-6 rounded-full bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400 text-white dark:text-slate-950 ring-2 ring-white dark:ring-slate-800 cursor-pointer transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 9l5-5 5 5M12 4v12" />
                </svg>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePictureChange(e.target.files?.[0])}
                />
              </label>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Profile Picture</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isEmployee
                ? "Contact HR to change your photo"
                : "Click the upload icon to change your photo"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <Input
            label="Username"
            name="username"
            value={form.username}
            onChange={handleChange}
            error={errors.username}
            required
            disabled={isEmployee}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            required
            disabled={isEmployee}
          />
          <Input
            label="Contact Number"
            name="mobile"
            value={form.mobile}
            onChange={handleChange}
            error={errors.mobile}
            disabled={isEmployee}
            hint={isEmployee ? "Contact HR to update your primary contact number" : undefined}
          />
        </div>

        <div className="mt-6 border-t border-slate-200 pt-4 dark:border-white/10">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Emergency Contact</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Who to reach in case of an emergency
          </p>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Input
              label="Emergency Contact Number"
              name="emergency_contact_number"
              value={form.emergency_contact_number}
              onChange={handleChange}
              error={errors.emergency_contact_number}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="transition-transform duration-200 hover:-translate-y-0.5"
          >
            Cancel
          </Button>
          <div ref={saveMagnet.ref} {...saveMagnet.handlers} className="inline-block will-change-transform">
            <Button type="submit" isLoading={saving} className="shadow-sm transition-shadow duration-200 hover:shadow-lg">
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
