"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { IslamicTexture } from "@/components/islamic-texture";
import { useLanguage } from "@/components/language-provider";
import { PublicTransparencySection } from "@/components/transparency/public-transparency-section";
import { DEFAULT_PUBLIC_MOSQUE_SLUG, fetchPublicFunds, type PublicFundProgress } from "@/services/publicTransparencyService";

const amounts = [500, 1000, 2500, 5000, 10000];

type Copy = {
  hero: string; title: string; donate: string; quick: string; choose: string; intro: string;
  amount: string; custom: string; frequency: string; one: string; monthly: string; monthlyNote: string;
  purpose: string; details: string; name: string; email: string; anonymous: string; anonymousNote: string;
  submit: string; noPayment: string; ready: string; invalidAmount: string; invalidFund: string;
  where: string; whereTitle: string; impact: string; impactTitle: string; ways: string; waysTitle: string;
  trust: string; trustTitle: string; faq: string; faqTitle: string; finalTitle: string; finalText: string;
  sticky: string; noFunds: string; loading: string; impactCards: [string, string, string][];
  trustItems: string[]; faqs: [string, string][];
};

const en: Copy = {
  hero: "Your contribution supports worship, learning, community care, and the mosque itself.",
  title: "Give with purpose.", donate: "Donate Now", quick: "QUICK DONATION", choose: "Choose your contribution.",
  intro: "Start with an amount, then choose where your gift can help.", amount: "Donation amount", custom: "Custom",
  frequency: "Donation frequency", one: "One time", monthly: "Monthly", monthlyNote: "Monthly donations will be available when recurring payments are enabled.",
  purpose: "Where would you like to give?", details: "Optional donor information", name: "Name", email: "Email",
  anonymous: "I would like to donate anonymously", anonymousNote: "Your name and email are optional and are not displayed publicly.",
  submit: "Continue to donate", noPayment: "No payment is taken by this form yet. A payment step will appear only after a secure provider is connected.",
  ready: "Your giving preferences are ready. Please contact the mosque to arrange payment. No money has been received through this form.",
  invalidAmount: "Please enter an amount greater than ৳0.", invalidFund: "Please choose an available fund.",
  where: "WHERE YOUR GIVING GOES", whereTitle: "A clear purpose for every contribution.",
  impact: "YOUR GIVING CREATES IMPACT", impactTitle: "Support the work that brings people together.",
  ways: "OTHER WAYS TO GIVE", waysTitle: "Give in the way that works for you.",
  trust: "TRUST & ACCOUNTABILITY", trustTitle: "Clear information, handled responsibly.",
  faq: "DONATION FAQ", faqTitle: "Questions, answered clearly.", finalTitle: "Every contribution matters.",
  finalText: "Together, we can strengthen our mosque and serve our community.", sticky: "Donate now",
  noFunds: "No public donation funds are available at the moment. Please contact the mosque to arrange your gift.",
  loading: "Loading available funds…",
  impactCards: [["Quran education", "Help provide accessible Quran learning.", "01"], ["Community care", "Support families and community programmes.", "02"], ["Mosque maintenance", "Help maintain a welcoming place of worship.", "03"]],
  trustItems: ["Payment is not collected until a secure provider is connected.", "Public financial records use the mosque’s public transparency service.", "Anonymous giving does not require your identity in this form.", "Contact the mosque for donation and receipt support."],
  faqs: [["What payment methods can I use?", "Online payment is not connected yet. Contact the mosque for current bank transfer or in person donation instructions."], ["Can I donate anonymously?", "Yes. Select the anonymous option. This form does not require your name or email for an anonymous giving enquiry."], ["Can I make a monthly donation?", "Recurring payments are not enabled yet, so the page does not start a monthly payment."], ["Can I request a donation receipt?", "Please contact the mosque after arranging payment so the team can confirm receipt details."], ["How are donations used?", "Public funds describe their purpose. The financial transparency section shows only public safe records when they are available."], ["Can I donate in person?", "Yes. Please contact the mosque or visit during opening hours before you travel."]],
};

const bn: Copy = {
  hero: "আপনার অবদান ইবাদত, শিক্ষা, কমিউনিটি সহায়তা এবং মসজিদের প্রয়োজন পূরণে সহায়তা করে।",
  title: "উদ্দেশ্যের সঙ্গে দান করুন।", donate: "এখনই দান করুন", quick: "দ্রুত দান", choose: "আপনার অবদান বেছে নিন।",
  intro: "প্রথমে পরিমাণ নির্বাচন করুন, তারপর আপনার দানের উদ্দেশ্য ঠিক করুন।", amount: "দানের পরিমাণ", custom: "নিজস্ব",
  frequency: "দানের ধরন", one: "এককালীন", monthly: "মাসিক", monthlyNote: "নিয়মিত পেমেন্ট চালু হলে মাসিক দান পাওয়া যাবে।",
  purpose: "কোথায় দান করতে চান?", details: "ঐচ্ছিক দাতার তথ্য", name: "নাম", email: "ইমেইল",
  anonymous: "আমি বেনামে দান করতে চাই", anonymousNote: "আপনার নাম ও ইমেইল ঐচ্ছিক, এবং প্রকাশ্যে দেখানো হবে না।",
  submit: "দানে এগিয়ে যান", noPayment: "এই ফর্মে এখনো কোনো পেমেন্ট নেওয়া হয় না। নিরাপদ পেমেন্ট সেবা যুক্ত হলে কেবল পেমেন্ট ধাপ দেখানো হবে।",
  ready: "আপনার দানের পছন্দ প্রস্তুত হয়েছে। পেমেন্টের ব্যবস্থা করতে মসজিদের সঙ্গে যোগাযোগ করুন। এই ফর্মে কোনো অর্থ গ্রহণ করা হয়নি।",
  invalidAmount: "অনুগ্রহ করে ৳০ এর বেশি পরিমাণ লিখুন।", invalidFund: "অনুগ্রহ করে একটি উপলভ্য তহবিল নির্বাচন করুন।",
  where: "আপনার দান কোথায় যায়", whereTitle: "প্রতিটি অবদানের একটি পরিষ্কার উদ্দেশ্য।",
  impact: "আপনার দানের প্রভাব", impactTitle: "মানুষকে একত্র করে এমন কাজকে সহায়তা করুন।",
  ways: "দান করার অন্যান্য উপায়", waysTitle: "আপনার সুবিধামতো দান করুন।",
  trust: "আস্থা ও জবাবদিহিতা", trustTitle: "পরিষ্কার তথ্য, দায়িত্বশীল ব্যবস্থাপনা।",
  faq: "দান সম্পর্কিত প্রশ্ন", faqTitle: "প্রশ্নের সহজ উত্তর।", finalTitle: "প্রতিটি অবদান গুরুত্বপূর্ণ।",
  finalText: "একসঙ্গে আমরা আমাদের মসজিদকে শক্তিশালী করতে ও কমিউনিটির সেবা করতে পারি।", sticky: "এখনই দান করুন",
  noFunds: "এই মুহূর্তে কোনো প্রকাশ্য দান তহবিল নেই। দানের ব্যবস্থা করতে মসজিদের সঙ্গে যোগাযোগ করুন।", loading: "উপলভ্য তহবিল লোড হচ্ছে…",
  impactCards: [["কুরআন শিক্ষা", "সবার জন্য সহজলভ্য কুরআন শিক্ষায় সহায়তা করুন।", "01"], ["কমিউনিটি সহায়তা", "পরিবার ও কমিউনিটি কর্মসূচিকে সহায়তা করুন।", "02"], ["মসজিদ রক্ষণাবেক্ষণ", "ইবাদতের জন্য একটি আন্তরিক স্থান বজায় রাখতে সহায়তা করুন।", "03"]],
  trustItems: ["নিরাপদ পেমেন্ট সেবা যুক্ত না হওয়া পর্যন্ত কোনো পেমেন্ট নেওয়া হয় না।", "প্রকাশ্য আর্থিক রেকর্ড মসজিদের স্বচ্ছতা সেবা থেকে আসে।", "বেনামে দানে এই ফর্মে পরিচয় দেওয়ার প্রয়োজন নেই।", "দান ও রসিদ সহায়তার জন্য মসজিদে যোগাযোগ করুন।"],
  faqs: [["কোন পদ্ধতিতে দান করতে পারি?", "অনলাইন পেমেন্ট এখনো যুক্ত নয়। ব্যাংক ট্রান্সফার বা সশরীরে দানের নির্দেশনা জানতে মসজিদে যোগাযোগ করুন।"], ["বেনামে দান করা যাবে?", "হ্যাঁ। বেনামে দানের বিকল্প নির্বাচন করুন। এ ক্ষেত্রে নাম বা ইমেইল দেওয়া বাধ্যতামূলক নয়।"], ["মাসিক দান করা যাবে?", "নিয়মিত পেমেন্ট এখনো চালু হয়নি, তাই এই পেজ থেকে মাসিক পেমেন্ট শুরু হবে না।"], ["দানের রসিদ পাওয়া যাবে?", "পেমেন্টের ব্যবস্থা করার পর মসজিদে যোগাযোগ করুন, দল রসিদের বিস্তারিত নিশ্চিত করবে।"], ["দান কীভাবে ব্যবহার হয়?", "প্রকাশ্য তহবিলগুলো তাদের উদ্দেশ্য জানায়। স্বচ্ছতা অংশে কেবল প্রকাশের উপযোগী রেকর্ড দেখানো হয়।"], ["সশরীরে দান করা যাবে?", "হ্যাঁ। ভ্রমণের আগে মসজিদে যোগাযোগ করুন বা খোলার সময়ে আসুন।"]],
};

function Taka({ value, bengali }: { value: number; bengali: boolean }) {
  return <>৳{value.toLocaleString(bengali ? "bn-BD" : "en-BD")}</>;
}

export function DonationPage() {
  const { language } = useLanguage();
  const bengali = language === "bn";
  const t = bengali ? bn : en;
  const [amount, setAmount] = useState(1000);
  const [customAmount, setCustomAmount] = useState("");
  const [funds, setFunds] = useState<PublicFundProgress[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [fundId, setFundId] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; fund?: string }>({});
  const donationAmount = useMemo(() => Number(customAmount || amount), [amount, customAmount]);

  useEffect(() => {
    let active = true;
    fetchPublicFunds(DEFAULT_PUBLIC_MOSQUE_SLUG).then((result) => {
      if (!active) return;
      const publicFunds = result.filter((fund) => fund.status.toLowerCase() === "active");
      setFunds(publicFunds);
      setFundId(publicFunds[0]?.id ?? "");
    }).catch(() => active && setFunds([])).finally(() => active && setLoaded(true));
    return () => { active = false; };
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = {
      amount: Number.isFinite(donationAmount) && donationAmount > 0 ? undefined : t.invalidAmount,
      fund: fundId ? undefined : t.invalidFund,
    };
    setErrors(next);
    if (!next.amount && !next.fund) setSubmitted(true);
  };

  return <div className="bg-[#f8f6ef] pb-20 sm:pb-0">
    <section className="relative overflow-hidden bg-[#073a2d] px-5 pb-12 pt-28 text-white sm:pb-16 sm:pt-32">
      <IslamicTexture variant="hero" position="left" className="-left-32 top-8 h-120 w-100 bg-contain opacity-10" />
      <div className="relative mx-auto max-w-7xl lg:px-8"><p className="text-xs font-bold tracking-[.2em] text-[#e0be79]">{bengali ? "উদ্দেশ্যপূর্ণ দান" : "GIVE WITH PURPOSE"}</p><div className="mt-4 max-w-3xl"><h1 className="text-4xl sm:text-5xl lg:text-6xl">{t.title}</h1><p className="mt-4 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">{t.hero}</p><a href="#donation-form" className="mt-6 inline-flex min-h-11 items-center bg-[#c79a45] px-5 py-3 font-semibold text-[#17211d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{t.donate}<span aria-hidden="true" className="ml-2">↓</span></a></div></div>
    </section>

    <section id="donation-form" className="mx-auto max-w-7xl scroll-mt-6 px-5 py-10 sm:py-14 lg:px-8"><div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-12"><div className="lg:pt-6"><p className="text-xs font-bold tracking-[.2em] text-[#a97b23]">{t.quick}</p><h2 className="mt-3 text-3xl sm:text-4xl">{t.choose}</h2><p className="mt-4 max-w-lg leading-7 text-[#69726d]">{t.intro}</p></div>
      <form onSubmit={submit} noValidate className="border border-[#deddd3] bg-white p-5 shadow-[0_18px_50px_rgba(7,58,45,.08)] sm:p-8">
        <fieldset><legend className="text-base font-semibold">{t.amount}</legend><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{amounts.map((value) => { const selected = !customAmount && amount === value; return <button key={value} type="button" aria-pressed={selected} onClick={() => { setAmount(value); setCustomAmount(""); setErrors((current) => ({ ...current, amount: undefined })); }} className={`min-h-12 border px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b] ${selected ? "border-[#073a2d] bg-[#073a2d] text-white ring-1 ring-[#073a2d]" : "border-[#deddd3] hover:border-[#c79a45]"}`}><Taka value={value} bengali={bengali} />{selected && <span className="ml-2" aria-hidden="true">✓</span>}</button>; })}<label className={`flex min-h-12 items-center border px-3 text-sm font-semibold ${customAmount ? "border-[#073a2d] ring-1 ring-[#073a2d]" : "border-[#deddd3]"}`}><span className="mr-2 text-[#69726d]">৳</span><input aria-label={t.custom} type="number" min="1" inputMode="decimal" value={customAmount} onChange={(event) => { setCustomAmount(event.target.value); setErrors((current) => ({ ...current, amount: undefined })); }} placeholder={t.custom} className="min-w-0 flex-1 outline-none" /></label></div>{errors.amount && <p role="alert" className="mt-2 text-sm text-[#a13228]">{errors.amount}</p>}</fieldset>
        <fieldset className="mt-7"><legend className="text-base font-semibold">{t.frequency}</legend><div className="mt-3 grid grid-cols-2 gap-3"><label className="flex min-h-12 cursor-pointer items-center justify-center border border-[#073a2d] bg-[#f1f4ef] px-3 text-center text-sm font-semibold text-[#073a2d]"><input className="sr-only" type="radio" name="frequency" checked readOnly /><span aria-hidden="true" className="mr-2">◉</span>{t.one}</label><div aria-disabled="true" className="flex min-h-12 items-center justify-center border border-[#deddd3] bg-[#f8f6ef] px-3 text-center text-sm font-semibold text-[#69726d]"><span aria-hidden="true" className="mr-2">○</span>{t.monthly}</div></div><p className="mt-2 text-xs leading-5 text-[#69726d]">{t.monthlyNote}</p></fieldset>
        <fieldset className="mt-7"><legend className="text-base font-semibold">{t.purpose}</legend><div className="mt-3 grid gap-3">{!loaded ? <p className="border border-dashed border-[#deddd3] p-4 text-sm text-[#69726d]">{t.loading}</p> : funds.length === 0 ? <p className="border border-dashed border-[#deddd3] p-4 text-sm text-[#69726d]">{t.noFunds}</p> : funds.map((fund) => { const selected = fund.id === fundId; return <label key={fund.id} className={`flex min-h-16 cursor-pointer items-start gap-3 border p-4 ${selected ? "border-[#073a2d] bg-[#f1f4ef] ring-1 ring-[#073a2d]" : "border-[#deddd3] hover:border-[#c79a45]"}`}><input type="radio" name="fund" value={fund.id} checked={selected} onChange={() => { setFundId(fund.id); setErrors((current) => ({ ...current, fund: undefined })); }} className="mt-1 h-4 w-4 accent-[#073a2d]" /><span><strong className="block text-sm text-[#17211d]">{fund.name}</strong>{fund.description && <span className="mt-1 block text-xs leading-5 text-[#69726d]">{fund.description}</span>}</span></label>; })}</div>{errors.fund && <p role="alert" className="mt-2 text-sm text-[#a13228]">{errors.fund}</p>}</fieldset>
        <fieldset className="mt-7"><legend className="text-base font-semibold">{t.details}</legend><div className="mt-3 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">{t.name}<input name="name" autoComplete="name" disabled={anonymous} className="mt-2 min-h-12 w-full border border-[#deddd3] px-3 text-base outline-none focus:border-[#073a2d] disabled:bg-[#f8f6ef]" /></label><label className="text-sm font-medium">{t.email}<input name="email" type="email" autoComplete="email" placeholder="you@example.com" disabled={anonymous} className="mt-2 min-h-12 w-full border border-[#deddd3] px-3 text-base outline-none focus:border-[#073a2d] disabled:bg-[#f8f6ef]" /></label></div><label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 text-sm text-[#4e5953]"><input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} className="mt-1 h-4 w-4 accent-[#073a2d]" /><span><strong className="block text-[#17211d]">{t.anonymous}</strong><span className="text-xs leading-5">{t.anonymousNote}</span></span></label></fieldset>
        <button type="submit" className="mt-7 min-h-12 w-full bg-[#0d4d3b] px-5 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]">{t.submit}<span aria-hidden="true" className="ml-2">→</span></button>{submitted && <p role="status" className="mt-4 border-l-2 border-[#c79a45] bg-[#f7f0df] p-4 text-sm leading-6 text-[#173d30]">{t.ready}</p>}<p className="mt-4 text-xs leading-5 text-[#69726d]">{t.noPayment}</p>
      </form></div></section>

    <section className="bg-[#ecece3] px-5 py-12 sm:py-16"><div className="mx-auto max-w-7xl lg:px-8"><p className="text-xs font-bold tracking-[.2em] text-[#a97b23]">{t.where}</p><h2 className="mt-3 text-3xl sm:text-4xl">{t.whereTitle}</h2><div className="mt-8 grid gap-px overflow-hidden border border-[#d9d8cf] bg-[#d9d8cf] md:grid-cols-3">{funds.length ? funds.slice(0, 3).map((fund, index) => <article key={fund.id} className="bg-[#f8f6ef] p-6"><span className="text-sm font-semibold text-[#a97b23]">0{index + 1}</span><h3 className="mt-10 text-2xl">{fund.name}</h3><p className="mt-3 text-sm leading-6 text-[#69726d]">{fund.description || t.noFunds}</p></article>) : <p className="bg-[#f8f6ef] p-6 text-sm text-[#69726d] md:col-span-3">{t.noFunds}</p>}</div></div></section>
    <section className="mx-auto max-w-7xl px-5 py-12 sm:py-16 lg:px-8"><p className="text-xs font-bold tracking-[.2em] text-[#a97b23]">{t.impact}</p><h2 className="mt-3 text-3xl sm:text-4xl">{t.impactTitle}</h2><div className="mt-8 grid gap-4 md:grid-cols-3">{t.impactCards.map(([title, body, number]) => <article key={number} className="border-t-2 border-[#c79a45] bg-white p-6"><span className="text-sm font-semibold text-[#a97b23]">{number}</span><h3 className="mt-8 text-2xl">{title}</h3><p className="mt-3 leading-7 text-[#69726d]">{body}</p></article>)}</div></section>
    <section className="bg-white px-5 py-12 sm:py-16"><div className="mx-auto max-w-7xl lg:px-8"><p className="text-xs font-bold tracking-[.2em] text-[#a97b23]">{t.ways}</p><h2 className="mt-3 text-3xl sm:text-4xl">{t.waysTitle}</h2><div className="mt-8 grid gap-5 md:grid-cols-3">{[["Bank transfer", "Transfer directly to the mosque’s official account.", "Contact for details", "mailto:salam@noormosque.org"], ["In person", "Visit the mosque during opening hours to give in person.", "Get directions", "#contact"], ["Contact us", "Speak with the team about the best way to support a programme.", "Contact for details", "#contact"]].map(([title, body, action, href]) => <article key={title} className="border border-[#deddd3] p-6"><h3 className="text-xl">{bengali ? (title === "Bank transfer" ? "ব্যাংক ট্রান্সফার" : title === "In person" ? "সশরীরে" : "যোগাযোগ করুন") : title}</h3><p className="mt-3 min-h-12 text-sm leading-6 text-[#69726d]">{bengali ? (title === "Bank transfer" ? "মসজিদের অফিসিয়াল হিসাবে সরাসরি অর্থ পাঠান।": title === "In person" ? "খোলার সময়ে মসজিদে এসে সরাসরি দান করুন।" : "কোনো কর্মসূচিতে সহায়তার উপায় জানতে দলের সঙ্গে কথা বলুন।") : body}</p><a href={href} className="mt-6 inline-flex min-h-11 items-center font-semibold text-[#0d4d3b] underline decoration-[#c79a45] underline-offset-4">{bengali ? "বিস্তারিত জানতে যোগাযোগ করুন" : action}<span aria-hidden="true" className="ml-2">→</span></a></article>)}</div></div></section>
    <PublicTransparencySection className="bg-[#f8f6ef]" />
    <section className="bg-[#073a2d] px-5 py-12 text-white sm:py-16"><div className="mx-auto max-w-7xl lg:px-8"><p className="text-xs font-bold tracking-[.2em] text-[#e0be79]">{t.trust}</p><h2 className="mt-3 text-3xl sm:text-4xl">{t.trustTitle}</h2><ul className="mt-8 grid gap-4 md:grid-cols-2">{t.trustItems.map((item) => <li key={item} className="flex gap-3 border-t border-white/15 py-4 text-sm leading-6 text-white/80"><span className="font-bold text-[#e0be79]" aria-hidden="true">✓</span>{item}</li>)}</ul></div></section>
    <section className="mx-auto max-w-3xl px-5 py-12 sm:py-16"><p className="text-center text-xs font-bold tracking-[.2em] text-[#a97b23]">{t.faq}</p><h2 className="mt-3 text-center text-3xl sm:text-4xl">{t.faqTitle}</h2><div className="mt-8 divide-y divide-[#deddd3] border-y border-[#deddd3]">{t.faqs.map(([question, answer], index) => { const open = openFaq === index; return <div key={question}><h3><button type="button" aria-expanded={open} aria-controls={`donation-faq-${index}`} onClick={() => setOpenFaq(open ? null : index)} className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d4d3b]"><span>{question}</span><span aria-hidden="true" className="text-xl text-[#a97b23]">{open ? "−" : "+"}</span></button></h3>{open && <div id={`donation-faq-${index}`} className="pb-5 pr-8 text-sm leading-6 text-[#69726d]">{answer}</div>}</div>; })}</div></section>
    <section className="mx-5 bg-[#c79a45] px-6 py-10 text-center text-[#17211d] sm:mx-8 sm:py-14"><h2 className="text-3xl sm:text-4xl">{t.finalTitle}</h2><p className="mx-auto mt-4 max-w-xl leading-7">{t.finalText}</p><a href="#donation-form" className="mt-6 inline-flex min-h-12 items-center bg-[#073a2d] px-6 py-3 font-semibold text-white">{t.donate}<span aria-hidden="true" className="ml-2">↓</span></a></section>
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#d9b66b] bg-[#073a2d] p-3 sm:hidden"><a href="#donation-form" className="flex min-h-12 items-center justify-center bg-[#c79a45] px-5 py-3 font-semibold text-[#17211d]">{t.sticky}</a></div>
  </div>;
}
