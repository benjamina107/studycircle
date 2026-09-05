# Offline catalog validation

This is the database-independent part of [issue #3](https://github.com/benjamina107/studycircle/issues/3). It checks a proposed catalog before a future importer stores it. It does not fetch courses, verify that a source's contents are accurate, load environment files, connect to Supabase, or change enrollment.

```sh
npm run catalog:validate -- docs/catalog-demo.json
npm run test:catalog
```

Exit code 0 means the format is valid. Invalid JSON, duplicate identities, invalid dates/times, and unsupported source URLs exit with code 1. Input files are limited to 10 MB. [catalog-demo.json](catalog-demo.json) is fictional and must never be presented as the real Cal Poly catalog.

## Version 1 contract

| Field | Meaning |
|---|---|
| `version` | Exactly `1` |
| `term` | Human-readable term, up to 80 characters |
| `starts_on`, `ends_on` | Inclusive teaching dates, `YYYY-MM-DD`; ordered, at most 200 days apart |
| `source.kind` | `official` or `demo` |
| `source.label` | Human-readable provenance |
| `source.url` | Official data requires an HTTPS `calpoly.edu` or subdomain URL; no embedded credentials |
| `courses` | 1–2,000 course records; at most 10,000 sections total |
| Course `code`, `title` | Unique course code per document; code is normalized to uppercase |
| Course `sections` | 1–300 sections, unique `section_code` within the course |
| Section `professor_key`, `professor_name` | Stable source identifier and display name; one key cannot map to conflicting names |
| Section `days` | Ordered, unique `MTWRFSU` characters: Thursday is `R`, Sunday is `U`; or `TBA` |
| Section `start_time`, `end_time` | Both omitted/null, or an ordered pair of 24-hour `HH:MM` times |
| Section `location` | Optional text; omitted values normalize to null |

For demo data, both the term and source label must explicitly say “Demo”. Multiple sections can share a professor key; that is intentional and supports professor-level subspaces. Classroom meeting times represent campus-local wall time, not UTC timestamps.

The future source adapter must normalize meeting-day notation before validation. Version 1 supports one meeting pattern per section; multiple lecture/lab patterns, holiday exclusions, cross-listings, and professor reassignment require deliberate handling before a production import. Do not silently discard extra meeting patterns. Stable professor identity should come from the source rather than name matching alone.

## Integration boundary for teammates

Import `validateCatalog` from `src/lib/catalog-validation.ts`. It accepts `unknown`, returns a normalized `CatalogDocument`, and throws `CatalogValidationError` with a field path when invalid. It does not mutate the supplied input.

`src/lib/catalog.ts` remains the existing fetch placeholder. The checker deliberately has no database dependency. Later work must enforce identities and access constraints again in an atomic database import, verify source provenance, and protect against accidental mixing of real and demo data. Passing this checker does not establish that classes or meeting times are real.
