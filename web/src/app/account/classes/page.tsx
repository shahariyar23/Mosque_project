import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { mockMyClasses } from "@/data/mock-user-data";
import { GraduationCap, Clock, MapPin, UserCircle } from "lucide-react";

export default async function ClassesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/signin");
  }

  const enrolledClasses = mockMyClasses.filter((c) => c.status === "Enrolled");
  const pastClasses = mockMyClasses.filter((c) => c.status !== "Enrolled");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#17211d]">My Classes</h1>
        <p className="mt-1 text-sm text-[#69726d]">
          View your educational journey and class schedules.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <section>
          <h2 className="text-lg font-semibold text-[#17211d] mb-4">Enrolled Classes</h2>
          {enrolledClasses.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {enrolledClasses.map((cls) => (
                <div key={cls.id} className="flex flex-col overflow-hidden rounded-xl border border-[#e5e2d8] bg-white shadow-sm transition-shadow hover:shadow-md">
                  <div className="h-2 bg-[#c79a45]"></div>
                  <div className="p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-[#17211d]">{cls.name}</h3>
                      <span className="inline-flex shrink-0 items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        {cls.status}
                      </span>
                    </div>
                    <div className="mt-4 flex-1 flex flex-col gap-3 text-sm text-[#69726d]">
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4 text-[#8d948f]" />
                        <span>{cls.teacher}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[#8d948f]" />
                        <span>{cls.schedule}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-[#8d948f]" />
                        <span>{cls.location}</span>
                      </div>
                    </div>
                    <div className="mt-5 pt-4 border-t border-[#e5e2d8]">
                      <Link
                        href={`/account/classes/${cls.id}`}
                        className="inline-flex w-full items-center justify-center rounded-md bg-[#faf9f4] px-4 py-2 text-sm font-medium text-[#0d4d3b] transition-colors hover:bg-[#e5e2d8]"
                      >
                        Course Materials
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="rounded-xl border border-[#e5e2d8] border-dashed p-8 text-center bg-[#faf9f4]/50">
               <p className="text-[#69726d]">You are not enrolled in any active classes.</p>
               <Link href="/services" className="mt-4 inline-block font-medium text-[#0d4d3b] hover:underline">Explore Education</Link>
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-[#17211d] mb-4">Completed Classes</h2>
          {pastClasses.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pastClasses.map((cls) => (
                <div key={cls.id} className="flex flex-col rounded-xl border border-[#e5e2d8] bg-white p-5 opacity-75 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-[#17211d]">{cls.name}</h3>
                    <span className="inline-flex shrink-0 items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                      {cls.status}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-[#69726d]">
                    Taught by {cls.teacher}
                  </div>
                  <div className="mt-4">
                     <span className="text-xs font-medium text-[#0d4d3b]">Certificate Earned</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[#e5e2d8] p-8 text-center text-sm text-[#69726d]">
               No completed classes found.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
