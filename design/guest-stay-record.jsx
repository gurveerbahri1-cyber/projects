import { useState } from "react";
import {
  Lock,
  Flag,
  ArrowLeft,
  Image as ImageIcon,
  Check,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  ClipboardCheck,
  MessageSquare,
  Home,
} from "lucide-react";

const COLORS = {
  ink: "#14181F",
  inkRaised: "#1B212B",
  inkSoft: "#8A92A3",
  inkLine: "#2A313D",
  paper: "#F3EDE0",
  paperLine: "#DCD2B8",
  text: "#20242C",
  textSoft: "#5B5346",
  lamp: "#E8A33D",
};

const STAMP_COLORS = ["#C4462B", "#C97A3D", "#C9A23D", "#7A9B52", "#3F6E5B"];

const CATEGORIES = [
  { key: "cleanliness", tag: "CLEAN", label: "Cleanliness", icon: Sparkles },
  { key: "care", tag: "CARE", label: "Property Care", icon: ShieldAlert },
  { key: "rules", tag: "RULES", label: "Rule Compliance", icon: ClipboardCheck },
  { key: "comm", tag: "COMM", label: "Communication", icon: MessageSquare },
  { key: "house", tag: "HOUSE", label: "House Respect", icon: Home },
];

const GUEST = { name: "Maren Okafor" };

const STAYS = [
  {
    id: 1,
    property: "Birchwood Loft",
    dates: "Jun 24 – 28",
    status: "revealed",
    scores: { cleanliness: 5, care: 4, rules: 5, comm: 4, house: 5 },
    notes: {
      cleanliness: "Left the kitchen spotless, even ran the dishwasher before leaving.",
      care: "Small scuff on the hallway wall, likely from luggage.",
    },
    evidence: { care: true },
    dispute: null,
  },
  {
    id: 2,
    property: "Elm & Ash Cottage",
    dates: "Mar 2 – 5",
    status: "sealed",
  },
  {
    id: 3,
    property: "Harbor View Studio",
    dates: "Jan 10 – 13",
    status: "revealed",
    scores: { cleanliness: 3, care: 5, rules: 5, comm: 5, house: 4 },
    notes: { cleanliness: "A few dishes left in the sink, otherwise fine." },
    evidence: {},
    dispute: { category: "cleanliness", status: "under review" },
  },
];

export default function GuestStayRecord() {
  const [view, setView] = useState("profile"); // profile | detail | dispute | disputeConfirm
  const [stayId, setStayId] = useState(null);
  const [disputeCategory, setDisputeCategory] = useState(null);
  const [explanation, setExplanation] = useState("");
  const [evidenceAttached, setEvidenceAttached] = useState(false);

  const stay = STAYS.find((s) => s.id === stayId);
  const revealedStays = STAYS.filter((s) => s.status === "revealed");

  const categoryAverage = (key) => {
    const vals = revealedStays.map((s) => s.scores?.[key]).filter(Boolean);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };
  const overallAverage = () => {
    const all = revealedStays.flatMap((s) => Object.values(s.scores || {}));
    return all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0;
  };

  const openDispute = (categoryKey) => {
    setDisputeCategory(categoryKey);
    setExplanation("");
    setEvidenceAttached(false);
    setView("dispute");
  };

  return (
    <div
      className="min-h-screen w-full flex justify-center"
      style={{ background: COLORS.ink, fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');
        .slab { font-family: 'Roboto Slab', serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        @keyframes cardIn { 0% { opacity:0; transform: translateY(8px);} 100% { opacity:1; transform: translateY(0);} }
        .card-in { animation: cardIn 200ms ease-out both; }
        @media (prefers-reduced-motion: reduce) { .card-in { animation: none !important; } }
        textarea::placeholder { color: #A79E8A; }
        .focus-ring:focus-visible { outline: 2px solid ${COLORS.lamp}; outline-offset: 2px; }
      `}</style>

      <div className="w-full max-w-md px-5 pb-16">
        {/* PROFILE */}
        {view === "profile" && (
          <div className="pt-12 card-in">
            <p className="mono text-xs tracking-widest" style={{ color: COLORS.inkSoft }}>
              GUEST RECORD
            </p>
            <h1 className="slab text-3xl mt-2" style={{ color: COLORS.paper }}>
              {GUEST.name}
            </h1>

            <div className="flex items-center gap-4 mt-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center slab text-3xl"
                style={{
                  border: `3px solid ${STAMP_COLORS[Math.round(overallAverage()) - 1] || COLORS.inkLine}`,
                  color: COLORS.paper,
                }}
              >
                {overallAverage().toFixed(1)}
              </div>
              <p className="text-sm" style={{ color: COLORS.inkSoft }}>
                Overall score, across {revealedStays.length} revealed{" "}
                {revealedStays.length === 1 ? "stay" : "stays"}. Sealed reports aren't counted
                yet.
              </p>
            </div>

            {/* Category breakdown */}
            <div className="mt-8 space-y-3">
              {CATEGORIES.map((c) => {
                const avg = categoryAverage(c.key);
                return (
                  <div key={c.key} className="flex items-center gap-3">
                    <c.icon size={14} color={COLORS.inkSoft} />
                    <span className="text-xs mono w-14" style={{ color: COLORS.inkSoft }}>
                      {c.tag}
                    </span>
                    <div className="flex-1 h-2 rounded-full" style={{ background: COLORS.inkLine }}>
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${(avg / 5) * 100}%`,
                          background: STAMP_COLORS[Math.round(avg) - 1] || COLORS.inkLine,
                        }}
                      />
                    </div>
                    <span className="text-xs mono w-6 text-right" style={{ color: COLORS.paper }}>
                      {avg ? avg.toFixed(1) : "–"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Stay history */}
            <p className="mono text-xs tracking-widest mt-9" style={{ color: COLORS.inkSoft }}>
              STAY HISTORY
            </p>
            <div className="mt-3 rounded-sm overflow-hidden" style={{ background: COLORS.paper }}>
              {STAYS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => {
                    if (s.status === "revealed") {
                      setStayId(s.id);
                      setView("detail");
                    }
                  }}
                  className="focus-ring w-full flex items-center justify-between px-4 py-3 text-left"
                  style={{
                    borderBottom: i < STAYS.length - 1 ? `1px solid ${COLORS.paperLine}` : "none",
                    cursor: s.status === "revealed" ? "pointer" : "default",
                  }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: COLORS.text }}>
                      {s.property}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: COLORS.textSoft }}>
                      {s.dates}
                    </p>
                  </div>
                  {s.status === "sealed" ? (
                    <div className="flex items-center gap-1 text-xs mono" style={{ color: COLORS.textSoft }}>
                      <Lock size={12} /> SEALED
                    </div>
                  ) : (
                    <ChevronRight size={16} color={COLORS.textSoft} />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* DETAIL */}
        {view === "detail" && stay && (
          <div className="pt-8 card-in">
            <button
              onClick={() => setView("profile")}
              className="focus-ring flex items-center gap-1 text-sm mb-4"
              style={{ color: COLORS.inkSoft }}
            >
              <ArrowLeft size={14} /> Back to record
            </button>
            <h2 className="slab text-2xl" style={{ color: COLORS.paper }}>
              {stay.property}
            </h2>
            <p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>
              {stay.dates}
            </p>

            <div className="mt-5 space-y-3">
              {CATEGORIES.map((c) => {
                const score = stay.scores[c.key];
                const note = stay.notes?.[c.key];
                const hasEvidence = stay.evidence?.[c.key];
                const isDisputed = stay.dispute?.category === c.key;
                return (
                  <div key={c.key} className="rounded-sm p-4" style={{ background: COLORS.paper }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <c.icon size={14} color={COLORS.textSoft} />
                        <span className="text-sm font-medium" style={{ color: COLORS.text }}>
                          {c.label}
                        </span>
                      </div>
                      <span
                        className="mono text-sm font-semibold w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: STAMP_COLORS[score - 1], color: "#fff" }}
                      >
                        {score}
                      </span>
                    </div>
                    {note && (
                      <p className="text-sm mt-2 leading-relaxed" style={{ color: COLORS.textSoft }}>
                        {note}
                      </p>
                    )}
                    {hasEvidence && (
                      <div
                        className="mt-2 flex items-center gap-1 text-xs mono"
                        style={{ color: COLORS.textSoft }}
                      >
                        <ImageIcon size={12} /> 1 photo attached by host
                      </div>
                    )}
                    <div className="mt-3">
                      {isDisputed ? (
                        <span className="text-xs mono" style={{ color: "#C77F1F" }}>
                          UNDER REVIEW — dispute filed
                        </span>
                      ) : (
                        <button
                          onClick={() => openDispute(c.key)}
                          className="focus-ring flex items-center gap-1 text-xs mono"
                          style={{ color: COLORS.textSoft }}
                        >
                          <Flag size={12} /> Raise a dispute
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DISPUTE FORM */}
        {view === "dispute" && stay && (
          <div className="pt-8 card-in">
            <button
              onClick={() => setView("detail")}
              className="focus-ring flex items-center gap-1 text-sm mb-4"
              style={{ color: COLORS.inkSoft }}
            >
              <ArrowLeft size={14} /> Back to stay
            </button>
            <h2 className="slab text-2xl" style={{ color: COLORS.paper }}>
              Dispute: {CATEGORIES.find((c) => c.key === disputeCategory)?.label}
            </h2>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: COLORS.inkSoft }}>
              Explain what you think is inaccurate. A moderator reviews both sides before
              anything changes — this category stays visible as "under review" in the meantime.
            </p>

            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="What happened, from your side?"
              rows={5}
              className="focus-ring w-full mt-5 p-3 text-sm rounded-sm resize-none"
              style={{ background: COLORS.paper, border: `1px solid ${COLORS.paperLine}`, color: COLORS.text }}
            />

            <button
              onClick={() => setEvidenceAttached((v) => !v)}
              className="focus-ring mt-3 flex items-center gap-2 text-sm py-2 px-3 rounded-sm"
              style={{
                border: `1px solid ${COLORS.inkLine}`,
                color: evidenceAttached ? "#3F6E5B" : COLORS.inkSoft,
              }}
            >
              {evidenceAttached ? <Check size={14} /> : <ImageIcon size={14} />}
              {evidenceAttached ? "1 photo attached" : "Attach evidence"}
            </button>

            <button
              onClick={() => setView("disputeConfirm")}
              disabled={!explanation.trim()}
              className="focus-ring mt-8 w-full py-4 rounded-sm font-medium text-sm"
              style={{
                background: explanation.trim() ? COLORS.lamp : COLORS.inkLine,
                color: explanation.trim() ? COLORS.ink : COLORS.inkSoft,
              }}
            >
              Submit dispute
            </button>
          </div>
        )}

        {/* DISPUTE CONFIRMATION */}
        {view === "disputeConfirm" && (
          <div className="pt-16 flex flex-col items-center text-center card-in">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center border-4"
              style={{ borderColor: "#C77F1F", color: "#C77F1F" }}
            >
              <Flag size={30} />
            </div>
            <h2 className="slab text-2xl mt-6" style={{ color: COLORS.paper }}>
              Dispute filed
            </h2>
            <p className="text-sm mt-2 max-w-xs leading-relaxed" style={{ color: COLORS.inkSoft }}>
              A moderator will review this within 5 business days. The category is marked
              "under review" until then.
            </p>
            <button
              onClick={() => {
                setView("profile");
                setStayId(null);
              }}
              className="focus-ring mt-8 text-sm mono tracking-wide py-2 px-4 rounded-sm"
              style={{ border: `1px solid ${COLORS.inkLine}`, color: COLORS.inkSoft }}
            >
              BACK TO RECORD
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
