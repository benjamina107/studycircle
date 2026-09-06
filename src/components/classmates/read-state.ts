export async function markMessagesRead(
 url:string,
 peer:string,
 ids:string[],
 request:(url:string,options:RequestInit)=>Promise<unknown>,
 onRead:()=>void,
 signal?:AbortSignal,
){
 await request(url,{method:'PATCH',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({peer,ids})});
 if(!signal?.aborted)onRead();
}
