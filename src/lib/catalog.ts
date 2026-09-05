// Course catalog prefetch — spec §4 and Open Question #1.
//
// The catalog (courses, sections, professors, days/times) must be prefetched
// from Cal Poly's site for the current term. Whether that's an API or a
// scrape is UNRESOLVED and blocks everything downstream. Once decided,
// implement here and upsert into Course/Professor/Section via db.ts.

export interface CatalogSection {
  courseCode: string;
  courseTitle: string;
  sectionCode: string;
  professorName: string;
  days: string;
  startTime?: string;
  endTime?: string;
  location?: string;
}

export async function fetchCatalog(_term: string): Promise<CatalogSection[]> {
  throw new Error("Not implemented: catalog prefetch (see docs/productspec.md §8.1)");
}
