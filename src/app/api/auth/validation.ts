export class InputError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function calPolyEmail(value: unknown): string {
  if (typeof value !== "string") throw new InputError("Enter your Cal Poly email address.");
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@calpoly\.edu$/.test(email)) {
    throw new InputError("Use an @calpoly.edu email address.");
  }
  const local = email.split("@")[0];
  if (local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    throw new InputError("Enter a valid Cal Poly email address.");
  }
  return email;
}

export function passwordInput(value: unknown, signup = false): string {
  if (typeof value !== "string" || value.length > 128 || value.length < (signup ? 12 : 1)) {
    throw new InputError(signup ? "Choose a password with 12–128 characters." : "Enter your password (maximum 128 characters).");
  }
  return value;
}

export function textInput(value: unknown, label: string, max: number, required = false): string {
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) {
    throw new InputError(`${label} ${required ? "is required and " : ""}must be ${max} characters or fewer.`);
  }
  return value.trim();
}

export function avatarInput(value: unknown): string | null {
  const input = textInput(value, "Profile picture URL", 2048);
  if (!input) return null;
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.username || url.password) throw new Error();
    return url.href;
  } catch {
    throw new InputError("Use a complete HTTPS URL for your profile picture.");
  }
}

export type ProfileField = "name" | "major" | "interests" | "avatar_url";
export type ProfileValues = Record<ProfileField, string>;
export type ProfileValidation = { values: ProfileValues; errors: Partial<Record<ProfileField, string>>; profile?: { name: string; major: string; interests: string; avatar_url: string | null } };

/** Shared profile validation for both first-run onboarding and later edits. */
export function validateProfile(form: FormData): ProfileValidation {
  const values: ProfileValues = {
    name: String(form.get("name") || ""), major: String(form.get("major") || ""),
    interests: String(form.get("interests") || ""), avatar_url: String(form.get("avatar_url") || ""),
  };
  const errors: Partial<Record<ProfileField, string>> = {};
  let name = "", major = "", interests = "", avatar_url: string | null = null;
  try { name = textInput(form.get("name"), "Name", 100, true); } catch (error) { errors.name = error instanceof InputError ? error.message : "Enter your name."; }
  try { major = textInput(form.get("major"), "Major", 120); } catch (error) { errors.major = error instanceof InputError ? error.message : "Check your major."; }
  try { interests = textInput(form.get("interests"), "Interests", 500); } catch (error) { errors.interests = error instanceof InputError ? error.message : "Check your interests."; }
  try { avatar_url = avatarInput(form.get("avatar_url")); } catch (error) { errors.avatar_url = error instanceof InputError ? error.message : "Check your profile picture URL."; }
  return Object.keys(errors).length ? { values, errors } : { values, errors, profile: { name, major, interests, avatar_url } };
}

export function applicationOrigin(requestUrl?: string): string {
  const configured = process.env.APP_URL;
  if (!configured && process.env.NODE_ENV === "production") {
    throw new InputError("Account access is currently unavailable. Please try again later.", 503);
  }
  const url = new URL(configured || requestUrl || "http://localhost:3000");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      (process.env.NODE_ENV === "production" && url.protocol !== "https:")) {
    throw new InputError("Account access is currently unavailable. Please try again later.", 503);
  }
  return url.origin;
}

export function assertSameOrigin(request: Request): void {
  if (request.headers.get("origin") !== applicationOrigin(request.url) ||
      request.headers.get("sec-fetch-site") === "cross-site") {
    throw new InputError("We couldn’t accept this request. Open StudyCircle in your browser and try again.", 403);
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    throw new InputError("We couldn’t read your submission. Refresh the page and try again.", 415);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new InputError("Your submission was empty. Refresh the page and try again.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 8192) {
      await reader.cancel();
      throw new InputError("Your submission is too long. Shorten your entries and try again.", 413);
    }
    chunks.push(value);
  }
  try {
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    return data as Record<string, unknown>;
  } catch {
    throw new InputError("We couldn’t read your submission. Refresh the page and try again.");
  }
}
