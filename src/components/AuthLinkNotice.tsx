"use client";
import {useEffect,useState} from 'react';
/** Old Supabase links put errors/tokens in a fragment, invisible to the server. */
export default function AuthLinkNotice({errorMessage=''}:{errorMessage?:string}){
 const [notice,setNotice]=useState(errorMessage);
 useEffect(()=>{
  const params=new URLSearchParams(window.location.hash.slice(1));
  const error=params.has('error')||params.has('error_code');
  const legacy=params.has('access_token')||params.has('refresh_token');
  if(!error&&!legacy)return;
  if(!errorMessage)setNotice(error?'This confirmation link is no longer usable. Try logging in if you already confirmed your email, or request a new link below.':'This older confirmation link can’t sign you in here. Try logging in, or request a new email below.');
  window.history.replaceState(window.history.state,'',window.location.pathname+window.location.search);
 },[errorMessage]);
 return <div className="auth-confirm"><h2>{notice?'Let’s get you signed in.':'Check your inbox.'}</h2>{notice?<p className="auth-status" role="alert">{notice}</p>:<p>Open the confirmation link in your Cal Poly email. If you don’t see it, take a quick look in spam.</p>}</div>;
}
