import {config} from 'dotenv';config({path:'.env.local',quiet:true});
import {randomUUID} from 'node:crypto';import assert from 'node:assert/strict';import {adminClient} from '../src/lib/knowledge/admin';
async function main(){
 if(!process.argv.includes('--run'))throw new Error('Pass --run to create and remove one disposable account. No email is sent.');
 const db=adminClient();const origin='http://127.0.0.1:3000';const email=`auth-check-${randomUUID()}@calpoly.edu`;const password=randomUUID()+'Aa1!';let id='';
 const headers={Origin:origin,'Content-Type':'application/json'};
 async function post(route:string,body:unknown,cookie=''){return fetch(origin+'/api/auth/'+route,{method:'POST',headers:{...headers,Cookie:cookie},body:JSON.stringify(body)});}
 const cookie=(r:Response)=>r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 try{
  const link=await db.auth.admin.generateLink({type:'signup',email,password,options:{redirectTo:origin+'/verify',data:{name:'Temporary auth check'}}});if(link.error)throw link.error;
  id=link.data.user.id;const token=link.data.properties.hashed_token;const otp=link.data.properties.email_otp;assert.match(otp,/^[0-9]{6}$/);
  assert.equal((await post('login',{email,password})).status,401,'Unconfirmed user must not log in');
  // GETs, including link scanners, must not consume the one-time token.
  const verifyUrl=origin+'/verify?token_hash='+token+'&type=email';
  for(let i=0;i<2;i++){const page=await fetch(verifyUrl);assert.equal(page.status,200);const html=await page.text();assert.match(html,/Confirm email and continue/);assert.doesNotMatch(html,/Enter the email you used to sign up/);}
  assert.equal((await db.auth.admin.getUserById(id)).data.user?.email_confirmed_at,undefined);
  assert.equal((await post('verify',{email,code:'12345'})).status,400);assert.equal((await post('verify',{email,code:otp==='000000'?'111111':'000000'})).status,400);const verified=await post('verify',{email,code:otp});assert.equal(verified.status,200,await verified.clone().text());const session=cookie(verified);assert.ok(session.includes('auth-token'));
  for(const path of ['/login','/signup','/verify']){const page=await fetch(origin+path,{redirect:'manual',headers:{Cookie:session}});assert.equal(page.status,307);assert.equal(new URL(page.headers.get('location')!,origin).pathname,'/profile');}
  const profile=await fetch(origin+'/profile',{redirect:'manual',headers:{Cookie:session}});assert.equal(profile.status,307);assert.equal(new URL(profile.headers.get('location')!,origin).pathname,'/onboarding');
  assert.equal((await post('verify',{email,code:otp})).status,400,'Replayed token must fail');
  assert.equal((await post('login',{email,password:'wrong-password'})).status,401);
  const login=await post('login',{email,password});assert.equal(login.status,200);const loggedIn=cookie(login);
  const logout=await post('logout',{},loggedIn);assert.equal(logout.status,200);assert.ok(logout.headers.getSetCookie().some(c=>/Max-Age=0/i.test(c)));
  const signedOut=await fetch(origin+'/profile',{redirect:'manual',headers:{Cookie:cookie(logout)}});assert.equal(new URL(signedOut.headers.get('location')!,origin).pathname,'/login');
  const local=await fetch('http://localhost:3000/api/auth/login',{method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json'},body:JSON.stringify({email,password})});assert.equal(local.status,200,'localhost must work as well as 127.0.0.1');
  console.log('PASS: six-digit code generation, malformed/incorrect code rejection, code confirmation, unconfirmed denial, non-consuming confirmation GETs, cross-browser token verification with no PKCE cookies, signed-in redirects, onboarding gate, replay denial, incorrect-password denial, login, logout cookie clearing, and both local hostnames. No email sent.');
 }finally{if(id){const result=await db.auth.admin.deleteUser(id);if(result.error)throw result.error;}console.log('Disposable auth account removed.');}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
