// Uploaded files (profile pictures) are stored on Cloudinary and come back
// as absolute URLs, so this just passes them through.
export function resolveUploadUrl(url) {
  return url || null;
}
