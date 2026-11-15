import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Phone, Copy, ExternalLink, Search } from "lucide-react";
import { actsAdminData, actsSetEngineer, actsUpdateRequest, actsModerate } from "@/lib/acts.functions";
import { offlineQuery } from "@/lib/offline-cache";
import { REQ_STATUS, ENG_STATUS, SPECIALTIES } from "@/lib/acts-data";

type Data = Awaited<ReturnType<typeof actsAdminData>>;
type Sub = "regs" | "engineers" | "requests" | "reviews" | "talent";
const card = "rounded-xl border border-border bg-background p-3 text-sm";
const sm = "rounded-full border px-2.5 py-1 text-xs font-semibold";

export function ActsAdmin({ pw }: { pw: string }) {
  const load = useServerFn(actsAdminData);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery(offlineQuery({ queryKey: ["acts-admin"], queryFn: () => load({ data: { pw } }) }));
  const refresh = () => qc.invalidateQueries({ queryKey: ["acts-admin"] });
  const [sub, setSub] = useState<Sub>("regs");
  const d: Data = data ?? { engineers: [], requests: [], reviews: [], reports: [] };
  const pending = d.engineers.filter((e) => e.status === "pending");
  const openReports = d.reports.filter((r) => !r.resolved);
  const subs: [Sub, string, number][] = [
    ["regs", "طلبات التسجيل", pending.length], ["engineers", "المهندسون", 0], ["requests", "طلبات الخدمة", d.requests.filter((r) => r.status === "new").length],
    ["reviews", "التقييمات والبلاغات", openReports.length], ["talent", "قاعدة المواهب", 0],
  ];
  return (
    <div dir="rtl" className="space-y-3 p-3">
      <div className="flex items-center justify-between"><h2 className="font-bold">منصة ACTS</h2>
        <a href="https://sunwise-engineer-network.lovable.app" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline"><ExternalLink className="h-3 w-3" />فتح تطبيق ACTS</a></div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">{subs.map(([k, l, n]) => <button key={k} onClick={() => setSub(k)} className={`${sm} shrink-0 ${sub === k ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{l}{n > 0 && <span className="mr-1 rounded-full bg-destructive px-1.5 text-destructive-foreground">{n}</span>}</button>)}</div>
      {isLoading && <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      {sub === "regs" && <EngList pw={pw} rows={pending} refresh={refresh} empty="لا توجد طلبات تسجيل جديدة." />}
      {sub === "engineers" && <EngList pw={pw} rows={d.engineers.filter((e) => e.status !== "pending" && e.kind === "engineer")} refresh={refresh} empty="لا يوجد مهندسون بعد." />}
      {sub === "requests" && <Requests pw={pw} d={d} refresh={refresh} />}
      {sub === "reviews" && <Reviews pw={pw} d={d} refresh={refresh} />}
      {sub === "talent" && <Talent d={d} />}
    </div>
  );
}

function EngList({ pw, rows, refresh, empty }: { pw: string; rows: Data["engineers"]; refresh: () => void; empty: string }) {
  const set = useServerFn(actsSetEngineer);
  const [open, setOpen] = useState<string | null>(null);
  const act = async (id: string, status: "approved" | "rejected" | "suspended" | "pending") => {
    const reason = status === "rejected" ? window.prompt("سبب الرفض") : null;
    if (status === "rejected" && reason === null) return;
    await set({ data: { pw, id, status, reject_reason: reason } }); refresh();
  };
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return <div className="space-y-2">{rows.map((e) => {
    const projects = (e.projects ?? []) as { title: string; desc: string; images: string[] }[];
    return <div key={e.id} className={card}>
      <button className="flex w-full items-center gap-3 text-right" onClick={() => setOpen(open === e.id ? null : e.id)}>
        {e.photo_url ? <img src={e.photo_url} alt={e.name} className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-bold text-ink-foreground">{e.name.slice(0, 1)}</div>}
        <div className="flex-1"><p className="font-bold">{e.name} <span className="text-xs font-normal text-muted-foreground">({e.kind === "student" ? "طالب" : "مهندس"})</span></p>
          <p className="text-xs text-muted-foreground">{e.specialty} · {[e.governorate, e.city].filter(Boolean).join(" - ")} · {ENG_STATUS[e.status] ?? e.status}</p></div></button>
      {open === e.id && <div className="mt-2 space-y-1 border-t border-border pt-2 text-xs">
        <p className="flex items-center gap-1"><Phone className="h-3 w-3" /><a href={`https://wa.me/${e.phone}`} target="_blank" rel="noreferrer" dir="ltr">{e.phone}</a>{e.email && ` · ${e.email}`}</p>
        <p>الدراسة: {[e.university, e.grad_year, e.qualifications].filter(Boolean).join(" · ") || "—"}</p>
        <p>الخبرة: {e.years_exp} سنوات</p><p>المهارات: {e.skills.join("، ") || "—"}</p><p>البرامج: {e.tools.join("، ") || "—"}</p><p>الخدمات: {e.services.join("، ") || "—"}</p>
        {e.bio && <p>نبذة: {e.bio}</p>}
        {projects.map((p, i) => <div key={i}><b>{p.title}</b> — {p.desc}<div className="flex gap-1">{p.images.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="h-12 w-12 rounded object-cover" /></a>)}</div></div>)}
        {e.reject_reason && <p className="text-destructive">سبب الرفض: {e.reject_reason}</p>}
      </div>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {e.status !== "approved" && <button className={`${sm} border-primary text-primary`} onClick={() => act(e.id, "approved")}>اعتماد</button>}
        {e.status === "pending" && <button className={`${sm} border-border`} onClick={() => act(e.id, "rejected")}>رفض</button>}
        {e.status === "approved" && <button className={`${sm} border-border`} onClick={() => act(e.id, "suspended")}>إيقاف</button>}
      </div>
    </div>;
  })}</div>;
}

function Requests({ pw, d, refresh }: { pw: string; d: Data; refresh: () => void }) {
  const upd = useServerFn(actsUpdateRequest);
  const approved = d.engineers.filter((e) => e.status === "approved");
  const [notes, setNotes] = useState<Record<string, string>>({});
  if (!d.requests.length) return <p className="text-sm text-muted-foreground">لا توجد طلبات خدمة بعد.</p>;
  return <div className="space-y-2">{d.requests.map((r) => {
    const save = async (p: Partial<{ status: string; engineer_id: string | null; admin_notes: string }>) => {
      await upd({ data: { pw, id: r.id, status: (p.status ?? r.status) as "new", engineer_id: p.engineer_id !== undefined ? p.engineer_id : r.engineer_id, admin_notes: p.admin_notes ?? r.admin_notes } }); refresh();
    };
    const link = `https://sunwise-engineer-network.lovable.app/rate/${r.review_token}`;
    const atts = (r.attachments ?? []) as { url: string; name: string }[];
    return <div key={r.id} className={card}>
      <div className="flex justify-between"><b>{r.service}</b><span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("ar", { dateStyle: "short", timeStyle: "short" })}</span></div>
      <p className="text-xs">{r.name ?? "عميل"} · <a href={`https://wa.me/${r.phone}`} target="_blank" rel="noreferrer" dir="ltr">{r.phone}</a> · {[r.governorate, r.city, r.location].filter(Boolean).join(" - ")}</p>
      <p className="my-1 whitespace-pre-wrap">{r.description}</p>
      {atts.length > 0 && <div className="flex flex-wrap gap-2 text-xs">{atts.map((a) => <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="underline">📎 {a.name}</a>)}</div>}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <select className="rounded-lg border border-border bg-card p-1.5 text-xs" value={r.status} onChange={(e) => save({ status: e.target.value })}>{Object.entries(REQ_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select className="rounded-lg border border-border bg-card p-1.5 text-xs" value={r.engineer_id ?? ""} onChange={(e) => save({ engineer_id: e.target.value || null })}><option value="">بدون مهندس</option>{approved.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
      </div>
      <textarea className="mt-2 w-full rounded-lg border border-border bg-card p-2 text-xs" placeholder="ملاحظات الإدارة" value={notes[r.id] ?? r.admin_notes ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} onBlur={() => notes[r.id] !== undefined && notes[r.id] !== (r.admin_notes ?? "") && save({ admin_notes: notes[r.id] ?? "" })} />
      {r.status === "done" && r.engineer_id && <div className="mt-2 flex flex-wrap gap-1.5">
        <button className={`${sm} border-border`} onClick={() => navigator.clipboard.writeText(link)}><Copy className="ml-1 inline h-3 w-3" />نسخ رابط التقييم</button>
        <a className={`${sm} border-primary text-primary`} target="_blank" rel="noreferrer" href={`https://wa.me/${r.phone}?text=${encodeURIComponent(`شكراً لتعاملك مع أكتس. نرجو تقييم الخدمة من هنا:\n${link}`)}`}>إرسال رابط التقييم واتساب</a></div>}
    </div>;
  })}</div>;
}

function Reviews({ pw, d, refresh }: { pw: string; d: Data; refresh: () => void }) {
  const mod = useServerFn(actsModerate);
  const name = (id: string) => d.engineers.find((e) => e.id === id)?.name ?? "—";
  const reported = new Set(d.reports.filter((r) => !r.resolved).map((r) => r.review_id));
  const rows = [...d.reviews].sort((a, b) => Number(reported.has(b.id)) - Number(reported.has(a.id)));
  if (!rows.length) return <p className="text-sm text-muted-foreground">لا توجد تقييمات بعد.</p>;
  return <div className="space-y-2">{rows.map((v) => <div key={v.id} className={`${card} ${reported.has(v.id) ? "border-destructive" : ""}`}>
    <div className="flex justify-between"><b>{name(v.engineer_id)}</b><span>{"★".repeat(v.rating)}{"☆".repeat(5 - v.rating)}</span></div>
    <p className="text-xs text-muted-foreground">جودة {v.quality} · مواعيد {v.punctuality} · احترافية {v.professionalism} · استجابة {v.responsiveness} — {v.reviewer_name ?? "عميل"}</p>
    {v.comment && <p className="mt-1">{v.comment}</p>}
    {d.reports.filter((r) => r.review_id === v.id && !r.resolved).map((r) => <p key={r.id} className="mt-1 text-xs text-destructive">بلاغ: {r.reason}</p>)}
    <div className="mt-2 flex gap-1.5">
      <button className={`${sm} border-border`} onClick={async () => { await mod({ data: { pw, review_id: v.id, hidden: !v.hidden } }); refresh(); }}>{v.hidden ? "إظهار التقييم" : "إخفاء التقييم"}</button>
      {reported.has(v.id) && !v.hidden && <button className={`${sm} border-primary text-primary`} onClick={async () => { await mod({ data: { pw, review_id: v.id, hidden: false } }); refresh(); }}>إبقاء وإغلاق البلاغ</button>}
    </div>
  </div>)}</div>;
}

function Talent({ d }: { d: Data }) {
  const [q, setQ] = useState(""); const [sp, setSp] = useState(""); const [kind, setKind] = useState("");
  const rows = d.engineers.filter((e) => (!sp || e.specialty === sp) && (!kind || e.kind === kind) && (!q || `${e.name} ${e.skills.join(" ")} ${e.tools.join(" ")} ${e.city ?? ""} ${e.governorate ?? ""}`.includes(q)));
  return <div className="space-y-2">
    <div className="relative"><Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" /><input className="w-full rounded-lg border border-border bg-card p-2 pr-8 text-sm" placeholder="بحث بالاسم، المهارة، البرنامج أو المدينة" value={q} onChange={(e) => setQ(e.target.value)} /></div>
    <div className="grid grid-cols-2 gap-2">
      <select className="rounded-lg border border-border bg-card p-1.5 text-xs" value={sp} onChange={(e) => setSp(e.target.value)}><option value="">كل التخصصات</option>{SPECIALTIES.map((x) => <option key={x}>{x}</option>)}</select>
      <select className="rounded-lg border border-border bg-card p-1.5 text-xs" value={kind} onChange={(e) => setKind(e.target.value)}><option value="">الكل</option><option value="engineer">مهندسون</option><option value="student">طلاب</option></select></div>
    <p className="text-xs text-muted-foreground">{rows.length} نتيجة</p>
    {rows.map((e) => <div key={e.id} className={card}><b>{e.name}</b> <span className="text-xs text-muted-foreground">— {e.kind === "student" ? "طالب" : "مهندس"} · {ENG_STATUS[e.status]}</span>
      <p className="text-xs">{e.specialty} · {[e.governorate, e.city].filter(Boolean).join(" - ")} · {e.years_exp} سنوات · <a href={`https://wa.me/${e.phone}`} target="_blank" rel="noreferrer" dir="ltr">{e.phone}</a></p>
      <p className="text-xs text-muted-foreground">{[...e.skills, ...e.tools].join("، ")}</p></div>)}
  </div>;
}
