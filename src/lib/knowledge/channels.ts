export const CLASS_CHANNELS = [
 {id:'general',label:'General',description:'Talk with your class'},
 {id:'homework',label:'Homework',description:'Questions and problem solving'},
 {id:'exam-prep',label:'Exam prep',description:'Review topics and practice together'},
 {id:'projects',label:'Projects',description:'Find teammates and coordinate your work'},
 {id:'resources',label:'Resources',description:'Share useful links and recommendations'},
 {id:'off-topic',label:'Off topic',description:'Get to know your classmates'},
] as const;
export type ClassChannel = typeof CLASS_CHANNELS[number]['id'];
export type StudyChannel = ClassChannel|'ai'|'meetups';
export function resolveClassChannel(value:unknown):ClassChannel {
 return CLASS_CHANNELS.find(c=>c.id===value)?.id||'general';
}
export function channelLabel(value:StudyChannel):string {
 return CLASS_CHANNELS.find(c=>c.id===value)?.label||(value==='ai'?'Circle AI':'Meetups');
}
