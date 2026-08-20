"use client";

export default function LeadershipList(){
  const leaders = [
    {name:'Imam Rahman', title:'Head Imam', bio:'Leads daily prayers and community counselling.'},
    {name:'Sister Amina', title:'Education Lead', bio:'Oversees the Quran and youth programs.'}
  ];
  return (
    <div className="mt-4 grid gap-4">
      {leaders.map((l,idx)=> (
        <div key={idx} className="rounded border border-[#e9e6dd] bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-full bg-[#ece9e0]" />
            <div>
              <div className="font-semibold text-[#0d4d3b]">{l.name}</div>
              <div className="text-sm text-[#69726d]">{l.title}</div>
              <div className="mt-2 text-sm text-[#69726d]">{l.bio}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
