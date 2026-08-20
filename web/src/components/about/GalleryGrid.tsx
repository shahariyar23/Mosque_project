"use client";

export default function GalleryGrid(){
  const items = new Array(6).fill(0).map((_,i)=>`/gallery/placeholder-${i+1}.jpg`);
  return (
    <div className="mt-4 grid grid-cols-3 gap-3">
      {items.map((src,idx)=> (
        <div key={idx} className="h-24 w-full overflow-hidden rounded bg-[#ece9e0] flex items-center justify-center">Image</div>
      ))}
    </div>
  );
}
