export async function markMessagesRead(
 url:string,
 peer:string,
 ids:string[],
 request:(url:string,options:RequestInit)=>Promise<unknown>,
 onRead:(peer:string,ids:string[])=>void,
 signal?:AbortSignal,
){
 const result=await request(url,{method:'PATCH',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({peer,ids})});
 if(!signal?.aborted){
  const readIds=(result as {readIds?:unknown})?.readIds;
  onRead(peer,Array.isArray(readIds)?readIds.filter((id):id is string=>typeof id==='string'&&ids.includes(id)):[]);
 }
}
