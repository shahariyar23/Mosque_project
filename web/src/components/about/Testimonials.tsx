"use client";

export default function Testimonials(){
  const quotes = [
    {text:'Noor has become a place where my family feels connected, welcomed, and supported.', author:'Community Member'},
    {text:'The classes for children have made a real difference to our home.', author:'Parent'}
  ];
  return (
    <div className="mt-4 space-y-4">
      {quotes.map((q,idx)=> (
        <blockquote key={idx} className="rounded border border-[#e9e6dd] bg-white p-4 text-sm text-[#69726d]">“{q.text}” — <span className="font-semibold text-[#0d4d3b]">{q.author}</span></blockquote>
      ))}
    </div>
  );
}
