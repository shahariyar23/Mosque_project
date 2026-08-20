"use client";
import { useState } from "react";

export default function VolunteersForm(){
  const [email,setEmail] = useState("");
  const [status,setStatus] = useState<'idle'|'sending'|'ok'|'error'>('idle');
  const submit = async(e:React.FormEvent)=>{
    e.preventDefault();
    setStatus('sending');
    try{
      // Placeholder API - backend integration optional
      await fetch('/api/volunteer',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email})});
      setStatus('ok'); setEmail('');
    }catch(err){ setStatus('error'); }
  };
  return (
    <form onSubmit={submit} className="mt-3 grid gap-2">
      <label className="sr-only">Email</label>
      <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required placeholder="you@example.com" className="rounded border border-[#e5e2d8] px-3 py-2 text-sm" />
      <div className="flex gap-2">
        <button type="submit" className="rounded bg-[#0d4d3b] px-4 py-2 text-white text-sm">Sign Up</button>
        <button type="button" onClick={()=>{setEmail(''); setStatus('idle');}} className="rounded border border-gray-200 px-4 py-2 text-sm">Clear</button>
      </div>
      {status==='ok' && <div className="text-sm text-green-700">Thanks — we'll be in touch.</div>}
      {status==='error' && <div className="text-sm text-red-600">Submission failed. Try again later.</div>}
    </form>
  );
}
