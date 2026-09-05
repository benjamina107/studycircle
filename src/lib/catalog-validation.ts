/** Catalog input is operator-supplied, never inferred from sample app data. */
export type CatalogSection = {
  section_code: string; professor_key: string; professor_name: string;
  days: string; start_time: string | null; end_time: string | null; location: string | null;
};

export type CatalogDocument = {
  version: 1; term: string; starts_on: string; ends_on: string;
  source: { kind: "official" | "demo"; label: string; url: string | null };
  courses: { code: string; title: string; sections: CatalogSection[] }[];
};

export class CatalogValidationError extends Error {}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CatalogValidationError(`${path} must be an object.`);
  return value as Record<string, unknown>;
}

function text(value: unknown, path: string, max = 200): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max || /[\u0000-\u001f]/.test(value)) throw new CatalogValidationError(`${path} must be nonempty text (at most ${max} characters).`);
  return value.trim();
}

function date(value: unknown, path: string): string {
  const result = text(value, path, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result) throw new CatalogValidationError(`${path} must be a valid YYYY-MM-DD date.`);
  return result;
}

function list(value: unknown, path: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > max) throw new CatalogValidationError(`${path} must contain 1–${max} entries.`);
  return value;
}

function optionalText(value: unknown, path: string, max = 200): string | null {
  return value == null ? null : text(value, path, max);
}

export function validateCatalog(input: unknown): CatalogDocument {
  const root = record(input, "catalog");
  if (root.version !== 1) throw new CatalogValidationError("version must be 1.");
  const term = text(root.term, "term", 80);
  const starts_on = date(root.starts_on, "starts_on");
  const ends_on = date(root.ends_on, "ends_on");
  const duration = Date.parse(ends_on) - Date.parse(starts_on);
  if (duration < 0 || duration > 200 * 86400000) throw new CatalogValidationError("Teaching dates must be ordered and span no more than 200 days.");
  const rawSource = record(root.source, "source");
  if (rawSource.kind !== "official" && rawSource.kind !== "demo") throw new CatalogValidationError("source.kind must be official or demo.");
  const source: CatalogDocument["source"] = { kind: rawSource.kind, label: text(rawSource.label, "source.label"), url: optionalText(rawSource.url, "source.url", 2000) };
  if (source.kind === "official") {
    let url: URL;
    try { url = new URL(source.url ?? ""); } catch { throw new CatalogValidationError("Official data needs its Cal Poly HTTPS source URL."); }
    if (url.protocol !== "https:" || url.username || url.password || !(url.hostname === "calpoly.edu" || url.hostname.endsWith(".calpoly.edu"))) throw new CatalogValidationError("Official data needs a calpoly.edu HTTPS source URL.");
  } else if (!/demo/i.test(term) || !/demo/i.test(source.label)) {
    throw new CatalogValidationError("Demo term and source label must explicitly include 'Demo'.");
  }
  const codes = new Set<string>();
  const professorNames = new Map<string, string>();
  let sectionCount = 0;
  const courses = list(root.courses, "courses", 2000).map((raw, index) => {
    const path = `courses[${index}]`;
    const course = record(raw, path);
    const code = text(course.code, `${path}.code`, 30).toUpperCase();
    if (!/^[A-Z][A-Z0-9]{1,9} \d{2,5}[A-Z]?$/.test(code) || codes.has(code)) throw new CatalogValidationError(`${path}.code is invalid or duplicated.`);
    codes.add(code);
    const sectionCodes = new Set<string>();
    const sections = list(course.sections, `${path}.sections`, 300).map((rawSection, index) => {
      const sectionPath = `${path}.sections[${index}]`;
      const s = record(rawSection, sectionPath);
      const section_code = text(s.section_code, `${sectionPath}.section_code`, 30);
      if (!/^[A-Za-z0-9-]+$/.test(section_code) || sectionCodes.has(section_code)) throw new CatalogValidationError(`${sectionPath}.section_code is invalid or duplicated.`);
      sectionCodes.add(section_code);
      const professor_key = text(s.professor_key, `${sectionPath}.professor_key`, 120);
      const professor_name = text(s.professor_name, `${sectionPath}.professor_name`);
      if (professorNames.has(professor_key) && professorNames.get(professor_key) !== professor_name) throw new CatalogValidationError(`Professor key ${professor_key} has conflicting names.`);
      professorNames.set(professor_key, professor_name);
      const days = text(s.days, `${sectionPath}.days`, 7).toUpperCase();
      if (days !== "TBA" && (!/^M?T?W?R?F?S?U?$/.test(days) || !days)) throw new CatalogValidationError(`${sectionPath}.days must use ordered MTWRFSU characters, or TBA.`);
      const start_time = optionalText(s.start_time, `${sectionPath}.start_time`, 5);
      const end_time = optionalText(s.end_time, `${sectionPath}.end_time`, 5);
      if ((start_time === null) !== (end_time === null) || [start_time, end_time].some((time) => time !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) || (start_time && end_time && start_time >= end_time)) throw new CatalogValidationError(`${sectionPath} needs ordered HH:MM meeting times, or both null.`);
      sectionCount++;
      return { section_code, professor_key, professor_name, days, start_time, end_time, location: optionalText(s.location, `${sectionPath}.location`) };
    });
    return { code, title: text(course.title, `${path}.title`), sections };
  });
  if (sectionCount > 10000) throw new CatalogValidationError("One import may contain at most 10,000 sections.");
  return { version: 1, term, starts_on, ends_on, source, courses };
}
