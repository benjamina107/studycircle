-- Development sample catalog derived from the supplied Fall course export.
-- Course IDs are deterministic so this migration is safe to re-run locally.
begin;

insert into public.courses (id, code, title, term) values
  ('catalog-csc-1001-fall-2026', 'CSC 1001', 'Fundamentals of Computer Science', 'Fall 2026'),
  ('catalog-aero-1121-fall-2026', 'AERO 1121', 'Aerospace Fundamentals', 'Fall 2026'),
  ('catalog-bus-2214-fall-2026', 'BUS 2214', 'Financial Accounting', 'Fall 2026'),
  ('catalog-aero-4400-fall-2026', 'AERO 4400', 'Special Problems for Advanced Undergraduates', 'Fall 2026'),
  ('catalog-che-1110l-fall-2026', 'CHE 1110L', 'General Chemistry Laboratory', 'Fall 2026'),
  ('catalog-ap-3300-fall-2026', 'AP 3300', 'Affiliated Programs Outgoing', 'Fall 2026'),
  ('catalog-aero-2270-fall-2026', 'AERO 2270', 'Special Topics', 'Fall 2026'),
  ('catalog-bus-3384a-fall-2026', 'BUS 3384A', 'Human Resources Management Project', 'Fall 2026')
on conflict (id) do update set code = excluded.code, title = excluded.title, term = excluded.term;

insert into public.professors (id, name) values
  ('prof-anrathi', 'Anita Rathi'),
  ('prof-kduran02', 'Kirk Alberto Duran'),
  ('prof-kabercro', 'Kira Jorgensen Abercromby'),
  ('prof-imvillan', 'Isai Mauricio Villanueva'),
  ('prof-spouragh', 'Setareh Pouraghabagher'),
  ('prof-strunyon', 'Steven T. Runyon'),
  ('prof-rsing101', 'Rishi Singh')
on conflict (id) do update set name = excluded.name;

-- Cancelled and instructorless offerings are intentionally not selectable.
insert into public.sections (id, course_id, professor_id, section_code, days, start_time, end_time, location) values
  ('section-csc-1001-s01', 'catalog-csc-1001-fall-2026', 'prof-anrathi', 'S01', 'TR', '09:00 AM', '10:20 AM', 'Science Room 0E11'),
  ('section-csc-1001-s06', 'catalog-csc-1001-fall-2026', 'prof-kduran02', 'S06', 'MWF', '12:00 PM', '12:50 PM', 'Science North Room 0213'),
  ('section-aero-1121-s01', 'catalog-aero-1121-fall-2026', 'prof-kabercro', 'S01', 'M', '09:00 AM', '09:50 AM', 'On-Campus Unspecified'),
  ('section-aero-1121-s02', 'catalog-aero-1121-fall-2026', 'prof-imvillan', 'S02', 'M', '12:00 PM', '02:50 PM', 'Engineering III Room 0121'),
  ('section-bus-2214-s03', 'catalog-bus-2214-fall-2026', 'prof-spouragh', 'S03', 'MW', '12:00 PM', '01:20 PM', 'Business Room 0213 / Off-Campus'),
  ('section-che-1110l-m01', 'catalog-che-1110l-fall-2026', 'prof-strunyon', 'M01', 'M', '12:00 PM', '02:50 PM', 'LAB'),
  ('section-bus-3384a-v01', 'catalog-bus-3384a-fall-2026', 'prof-rsing101', 'V01', '', null, null, null)
on conflict (id) do update set
  course_id = excluded.course_id, professor_id = excluded.professor_id, section_code = excluded.section_code,
  days = excluded.days, start_time = excluded.start_time, end_time = excluded.end_time, location = excluded.location;

insert into public.spaces (id, course_id)
select 'space-' || replace(lower(code), ' ', '-') || '-fall-2026', id from public.courses
where term = 'Fall 2026'
on conflict (course_id) do nothing;

insert into public.subspaces (id, space_id, professor_id) values
  ('subspace-csc-1001-anrathi', 'space-csc-1001-fall-2026', 'prof-anrathi'),
  ('subspace-csc-1001-kduran02', 'space-csc-1001-fall-2026', 'prof-kduran02'),
  ('subspace-aero-1121-kabercro', 'space-aero-1121-fall-2026', 'prof-kabercro'),
  ('subspace-aero-1121-imvillan', 'space-aero-1121-fall-2026', 'prof-imvillan'),
  ('subspace-bus-2214-spouragh', 'space-bus-2214-fall-2026', 'prof-spouragh'),
  ('subspace-che-1110l-strunyon', 'space-che-1110l-fall-2026', 'prof-strunyon'),
  ('subspace-bus-3384a-rsing101', 'space-bus-3384a-fall-2026', 'prof-rsing101')
on conflict (space_id, professor_id) do nothing;

insert into public.channels (subspace_id, name)
select subspace.id, channel.name
from public.subspaces subspace
join public.spaces space on space.id = subspace.space_id
join public.courses course on course.id = space.course_id
cross join (values ('general'), ('homework'), ('exam-prep')) as channel(name)
where course.term = 'Fall 2026'
on conflict (subspace_id, name) do nothing;

commit;
