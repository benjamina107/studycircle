export type ExtractedClass = { courseCode: string; sectionCode: string | null; professorName: string | null; term: string | null };
export type CatalogCourse = { id:string; code:string; title:string; term:string; sections:{id:string;course_id:string;professor_id:string|null;section_code:string;professors:{name:string}|null}[] };
export type ClassOption = { sectionId:string; courseId:string; professorId:string; professor:string; term:string };
export type ClassMatch = { key:string; code:string; title:string; section:string|null; options:ClassOption[]; selected:string; reason:string };
export function normalizeCode(value:string) { return value.toUpperCase().replace(/[^A-Z0-9]/g,''); }
const normalizeName=(value:string)=>value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z]/g,'');
export function matchClasses(rows:ExtractedClass[], catalog:CatalogCourse[]):ClassMatch[] {
 const seen=new Set<string>();
 return rows.filter(row=>{const key=JSON.stringify([normalizeCode(row.courseCode),row.sectionCode?.toUpperCase(),row.professorName,row.term]);if(seen.has(key))return false;seen.add(key);return true;}).map((row,index)=>{
  const courses=catalog.filter(c=>normalizeCode(c.code)===normalizeCode(row.courseCode));
  const options:ClassOption[]=[];
  const exact:ClassOption[]=[];
  for(const course of courses)for(const section of course.sections){
   if(!section.professor_id||!section.professors)continue;
   const option={sectionId:section.id,courseId:course.id,professorId:section.professor_id,professor:section.professors.name,term:course.term};
   if(!options.some(o=>o.courseId===option.courseId&&o.professorId===option.professorId))options.push(option);
   const sectionMatches=!row.sectionCode||normalizeCode(row.sectionCode)===normalizeCode(section.section_code);
   const professorMatches=!row.professorName||normalizeName(row.professorName)===normalizeName(option.professor);
   const termMatches=!row.term||normalizeCode(row.term)===normalizeCode(course.term);
   if(sectionMatches&&professorMatches&&termMatches&&!exact.some(o=>o.courseId===option.courseId&&o.professorId===option.professorId))exact.push(option);
  }
  const picked=exact.length===1?options.find(o=>o.courseId===exact[0].courseId&&o.professorId===exact[0].professorId)?.sectionId||'':'';
  return {key:String(index),code:courses[0]?.code||row.courseCode,title:courses[0]?.title||'Course not found in our catalog',section:row.sectionCode,options,selected:picked,reason:picked?'Matched to your professor':options.length?'Choose your professor to confirm this class':'You can look for this class later from Profile.'};
 });
}
