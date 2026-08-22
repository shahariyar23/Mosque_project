import { InnerPage } from "@/components/inner-page";
import ImpactCounters from "@/components/about/ImpactCounters";
import LeadershipList from "@/components/about/LeadershipList";
import VolunteersForm from "@/components/about/VolunteersForm";
import GalleryGrid from "@/components/about/GalleryGrid";
import Testimonials from "@/components/about/Testimonials";

export default function About() {
  return (
    <InnerPage
      eyebrow="ABOUT"
      title="ইবাদত, শিক্ষা ও সম্প্রদায়ের জন্য একটি স্থান"
    >
      {/* 01 Hero: breadcrumb + large visual */}
      <section id="about-hero" className="mb-12">
        <nav className="mb-4 text-sm text-[#69726d]" aria-label="Breadcrumb">
          <a className="hover:underline" href="/">
            Home
          </a>
          <span className="mx-2">→</span>
          <span>About</span>
        </nav>
        <div className="grid gap-8 lg:grid-cols-2 items-center">
          <div>
            <p className="text-xs font-bold tracking-[.18em] text-[#e0be79]">
              আমাদের সম্পর্কে
            </p>
            <h1 className="mt-3 text-3xl font-semibold">
              ইবাদত, শিক্ষা ও সম্প্রদায়ের জন্য একটি স্থান
            </h1>
            <p className="mt-4 text-sm text-[#69726d]">
              Noor Community Mosque is a place of worship, learning and support
              — open to everyone in our neighbourhood. This page explains who we
              are, our history, values, facilities and how to get involved.
            </p>
            <div className="mt-6">
              <a
                href="#our-story"
                className="inline-flex items-center gap-2 text-sm text-[#0d4d3b]"
              >
                Learn our story →
              </a>
            </div>
          </div>
          <div
            className="aspect-[16/8] w-full overflow-hidden rounded bg-[#e9e6dd] hero-image"
            role="img"
            aria-label="Noor Mosque exterior"
          >
            <div className="hero-overlay"> </div>
            <div className="hero-caption sr-only">
              Noor Community Mosque exterior
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_.8fr]">
          <div>
            {/* 02 Our Story */}
            <section id="our-story">
              <h2 className="text-3xl font-semibold">Our Story</h2>
              <p className="mt-4 text-sm text-[#69726d]">
                A short intro paragraph describing the founding, growth and
                purpose of the mosque. This should be editorial in tone and may
                include a highlight quote or fact.
              </p>
            </section>

            {/* 03 History / Timeline */}
            <section id="history" className="mt-10">
              <h3 className="text-2xl font-semibold">History & Milestones</h3>
              <div className="mt-4">
                <div className="timeline">
                  <div className="timeline-item">
                    <div className="timeline-year">2003</div>
                    <div className="timeline-body">
                      Noor Community Mosque established.
                    </div>
                  </div>
                  <div className="timeline-item">
                    <div className="timeline-year">2014</div>
                    <div className="timeline-body">
                      Islamic education program launched.
                    </div>
                  </div>
                  <div className="timeline-item">
                    <div className="timeline-year">2018</div>
                    <div className="timeline-body">
                      Community center expanded.
                    </div>
                  </div>
                  <div className="timeline-item">
                    <div className="timeline-year">2022</div>
                    <div className="timeline-body">
                      Digital prayer-time system introduced.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 04 Mission & Vision */}
            <section id="mission-vision" className="mt-10">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-lg border border-[#e9e6dd] bg-white p-6 shadow-sm">
                  <h4 className="text-xl font-semibold text-[#0d4d3b]">
                    Our Mission
                  </h4>
                  <p className="mt-3 text-sm text-[#69726d]">
                    To provide a welcoming environment for worship, Islamic
                    education, spiritual growth, and meaningful community
                    connection.
                  </p>
                </div>
                <div className="rounded-lg border border-[#e9e6dd] bg-white p-6 shadow-sm">
                  <h4 className="text-xl font-semibold text-[#0d4d3b]">
                    Our Vision
                  </h4>
                  <p className="mt-3 text-sm text-[#69726d]">
                    To become a vibrant Islamic community where faith,
                    knowledge, service, and compassion come together.
                  </p>
                </div>
              </div>
            </section>

            {/* 05 Values */}
            <section id="values" className="mt-10">
              <h3 className="text-2xl font-semibold">What We Believe</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded border border-[#e9e6dd] bg-white p-4 flex gap-3 items-start">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="shrink-0"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="#c79a45"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <div>
                    <strong>Faith</strong>
                    <p className="mt-2 text-sm text-[#69726d]">
                      Sincere worship and devotion.
                    </p>
                  </div>
                </div>
                <div className="rounded border border-[#e9e6dd] bg-white p-4 flex gap-3 items-start">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="shrink-0"
                  >
                    <path d="M12 2v20" stroke="#c79a45" strokeWidth="1.5" />
                  </svg>
                  <div>
                    <strong>Knowledge</strong>
                    <p className="mt-2 text-sm text-[#69726d]">
                      Accessible Islamic education for all ages.
                    </p>
                  </div>
                </div>
                <div className="rounded border border-[#e9e6dd] bg-white p-4 flex gap-3 items-start">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="shrink-0"
                  >
                    <path d="M3 12h18" stroke="#c79a45" strokeWidth="1.5" />
                  </svg>
                  <div>
                    <strong>Service</strong>
                    <p className="mt-2 text-sm text-[#69726d]">
                      Community support and charitable work.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 06 Facilities */}
            <section id="facilities" className="mt-10">
              <h3 className="text-2xl font-semibold">
                Our Mosque & Facilities
              </h3>
              <ul className="mt-4 grid gap-2 text-sm text-[#69726d]">
                <li>Main Prayer Hall</li>
                <li>Women's Prayer Area</li>
                <li>Wudu Facilities</li>
                <li>Islamic Classroom</li>
                <li>Community Hall & Kitchen</li>
              </ul>
              <a
                href="#3d"
                className="mt-4 inline-block text-sm text-[#0d4d3b]"
              >
                Explore Our Mosque →
              </a>
            </section>

            {/* 07 3D Experience placeholder */}
            <section id="3d" className="mt-10">
              <h3 className="text-2xl font-semibold">Interactive 3D Mosque</h3>
              <div className="mt-4 h-56 w-full rounded bg-[#e9e6dd] flex items-center justify-center">
                3D viewer placeholder
              </div>
            </section>

            {/* 08 Community Impact */}
            <section id="impact" className="mt-10">
              <h3 className="text-2xl font-semibold">Community Impact</h3>
              <ImpactCounters
                stats={[
                  { label: "Years of Service", value: 20 },
                  { label: "Community Members", value: 5000 },
                ]}
              />
            </section>

            {/* 09 Education */}
            <section id="education" className="mt-10">
              <h3 className="text-2xl font-semibold">Islamic Education</h3>
              <p className="mt-3 text-sm text-[#69726d]">
                Quran classes, memorization, Arabic lessons, children's
                programs, weekly lectures and adult education.
              </p>
              <a
                href="#programs"
                className="mt-3 inline-block text-sm text-[#0d4d3b]"
              >
                Explore Our Programs →
              </a>
            </section>

            {/* 10 Services */}
            <section id="services" className="mt-10">
              <h3 className="text-2xl font-semibold">Community Services</h3>
              <ul className="mt-3 text-sm text-[#69726d]">
                <li>Food distribution</li>
                <li>Zakat assistance</li>
                <li>Marriage & Funeral support</li>
              </ul>
            </section>

            {/* 11 Leadership */}
            <section id="leadership" className="mt-10">
              <h3 className="text-2xl font-semibold">Imam & Leadership</h3>
              <LeadershipList />
            </section>

            {/* 12 Volunteers */}
            <section id="volunteers" className="mt-10">
              <h3 className="text-2xl font-semibold">Volunteers</h3>
              <p className="mt-3 text-sm text-[#69726d]">
                Information on how to volunteer, upcoming opportunities, and
                sign-up forms.
              </p>
              <VolunteersForm />
            </section>

            {/* 13 Gallery */}
            <section id="gallery" className="mt-10">
              <h3 className="text-2xl font-semibold">Life at Noor</h3>
              <GalleryGrid />
              <a
                href="/gallery"
                className="mt-3 inline-block text-sm text-[#0d4d3b]"
              >
                View Gallery →
              </a>
            </section>

            {/* 14 Testimonials */}
            <section id="testimonials" className="mt-10">
              <h3 className="text-2xl font-semibold">Testimonials</h3>
              <Testimonials />
            </section>

            {/* Final CTA */}
            <section id="cta" className="mt-12 pb-12">
              <h3 className="text-xl font-semibold">
                Be Part of Our Community
              </h3>
              <p className="mt-3 text-sm text-[#69726d]">
                Whether you come for prayer, learning, volunteering, or simply
                to connect, there is a place for you at Noor Community Mosque.
              </p>
              <div className="mt-4 flex gap-3">
                <a
                  href="#prayer-times"
                  className="rounded bg-[#0d4d3b] px-4 py-2 text-white"
                >
                  View Prayer Times
                </a>
                <a
                  href="#events"
                  className="rounded border border-[#c79a45] px-4 py-2 text-[#0d4d3b]"
                >
                  Upcoming Events
                </a>
              </div>
            </section>
          </div>

          <aside>
            <div className="rounded border border-[#e9e6dd] bg-white p-6">
              <h4 className="text-lg font-semibold">Get involved</h4>
              <p className="mt-3 text-sm text-[#69726d]">
                Join classes, volunteer for community programs, or support our
                work with a donation. Everyone is welcome.
              </p>
              <a
                href="#donations"
                className="mt-6 inline-block rounded bg-[#c79a45] px-4 py-2 font-semibold text-[#15251f]"
              >
                Donate
              </a>
            </div>

            <div className="mt-6 rounded border border-[#e9e6dd] bg-white p-6">
              <h4 className="text-sm font-semibold text-[#0d4d3b]">Contact</h4>
              <address className="not-italic mt-3 text-sm text-[#69726d]">
                Noor Community Mosque
                <br />
                Dhaka, Bangladesh
                <br />
                <a href="tel:+8801000000000" className="text-[#0d4d3b]">
                  +88 0100 000 0000
                </a>
              </address>
            </div>

            <div className="mt-6 rounded border border-[#e9e6dd] bg-white p-6">
              <h4 className="text-sm font-semibold text-[#0d4d3b]">
                Join our newsletter
              </h4>
              <form className="mt-3 flex gap-2">
                <input
                  placeholder="Email"
                  className="flex-1 rounded border border-[#e5e2d8] px-3 py-2 text-sm"
                />
                <button className="rounded bg-[#0d4d3b] px-4 py-2 text-white text-sm">
                  Subscribe
                </button>
              </form>
            </div>
          </aside>
        </div>
      </main>
    </InnerPage>
  );
}
