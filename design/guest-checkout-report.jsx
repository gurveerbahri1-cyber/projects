import { useState } from "react";
import {
  Sparkles,
  ShieldAlert,
  ClipboardCheck,
  MessageSquare,
  Home,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
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
  lampDeep: "#C77F1F",
};

const STAMP_COLORS = ["#C4462B", "#C97A3D", "#C9A23D", "#7A9B52", "#3F6E5B"];
const STAMP_ROT = [-6, 3, -2, 5, -4];

const GUEST = { name: "Maren Okafor", dates: "Jun 24 – 28", property: "Birchwood Loft", file: "HK-2291" };

const CATEGORIES = [
  {
    key: "cleanliness",
    tag: "CLEAN",
    label: "Cleanliness",
    description: "How the space was left compared to check-in condition.",
    icon: Sparkles,
    evidence: true,
  },
  {
    key: "care",
    tag: "CARE",
    label: "Property Care",
    description: "Damage, vandalism, or unauthorized changes to the space.",
    icon: ShieldAlert,
    evidence: true,
  },
  {
    key: "rules",
    tag: "RULES",
    label: "Rule Compliance",
    description: "Smoking, pets, guest count, and quiet hours.",
    icon: ClipboardCheck,
    evidence: false,
  },
  {
    key: "comm",
    tag: "COMM",
    label: "Communication",
    description: "Responsiveness and honesty about issues during the stay.",
    icon: MessageSquare,
    evidence: false,
  },
  {
    key: "house",
    tag: "HOUSE",
    label: "House Respect",
    description: "Check-in/out times, and care for stated house rules.",
    icon: Home,
    evidence: false,
  },
];

const STAMP_LABEL = { 1: "Poor", 5: "Excellent" };

export default function GuestCheckoutReport() {
  const [step, setStep] = useState(0);
  const [ratings, setRatings] = useState({});

  const lastStep = CATEGORIES.length + 2; // intro(0) + 5 categories + review + confirm
  const isCategoryStep = step >= 1 && step <= CATEGORIES.length;
  const category = isCategoryStep ? CATEGORIES[step - 1] : null;

  const setScore = (key, score) =>
    setRatings((p) => ({ ...p, [key]: { note: "", photo: false, ...p[key], score } }));
  const setNote = (key, note) =>
    setRatings((p) => ({ ...p, [key]: { score: null, photo: false, ...p[key], note } }));
  const togglePhoto = (key) =>
    setRatings((p) => ({ ...p, [key]: { score: null, note: "", ...p[key], photo: !p[key]?.photo } }));

  const canAdvance = isCategoryStep ? !!ratings[category.key]?.score : true;
  const goNext = () => canAdvance && setStep((s) => Math.min(s + 1, lastStep));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));
  const jumpTo = (key) => setStep(CATEGORIES.findIndex((c) => c.key === key) + 1);
  const reset = () => {
    setStep(0);
    setRatings({});
  };

  const completedScores = CATEGORIES.map((c) => ratings[c.key]?.score).filter(Boolean);
  const average = completedScores.length
    ? completedScores.reduce((a, b) => a + b, 0) / completedScores.length
    : 0;

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center"
      style={{ background: COLORS.ink, fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');
        @keyframes stampPop {
          0% { transform: scale(1.9) rotate(var(--rot, -4deg)); opacity: 0; }
          55% { transform: scale(0.9) rotate(var(--rot, -4deg)); opacity: 1; }
          100% { transform: scale(1) rotate(var(--rot, -4deg)); opacity: 1; }
        }
        .stamp-pop { animation: stampPop 280ms cubic-bezier(.2,.9,.3,1.2) both; }
        @keyframes cardIn {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .card-in { animation: cardIn 220ms ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .stamp-pop, .card-in { animation: none !important; }
        }
        .slab { font-family: 'Roboto Slab', serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        textarea::placeholder { color: #A79E8A; }
        .focus-ring:focus-visible { outline: 2px solid ${COLORS.lamp}; outline-offset: 2px; }
      `}</style>

      <div className="w-full max-w-md flex flex-col min-h-screen">
        {/* Progress strip (visible on category steps) */}
        {isCategoryStep && (
          <div
            className="flex justify-between px-5 pt-6 pb-4 sticky top-0 z-10"
            style={{ background: COLORS.ink }}
          >
            {CATEGORIES.map((c, i) => {
              const idx = i + 1;
              const done = !!ratings[c.key]?.score;
              const current = step === idx;
              return (
                <div key={c.key} className="flex flex-col items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: done ? COLORS.lamp : current ? COLORS.inkSoft : COLORS.inkLine,
                    }}
                  />
                  <span
                    className="mono text-xs tracking-wide"
                    style={{ color: current ? COLORS.lamp : COLORS.inkSoft }}
                  >
                    {c.tag}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex-1 px-5 pb-28">
          {/* STEP 0 — INTRO */}
          {step === 0 && (
            <div className="pt-14 card-in">
              <p className="mono text-xs tracking-widest" style={{ color: COLORS.inkSoft }}>
                CHECKOUT REPORT · FILE NO. {GUEST.file}
              </p>
              <h1 className="slab text-4xl mt-3" style={{ color: COLORS.paper }}>
                {GUEST.name}
              </h1>
              <p className="mt-2 text-sm" style={{ color: COLORS.inkSoft }}>
                {GUEST.dates} · {GUEST.property}
              </p>
              <p className="mt-6 text-sm leading-relaxed" style={{ color: "#C7CCD6" }}>
                Rate this guest across five categories. Your report stays sealed until your
                guest files theirs too — or 14 days pass, whichever comes first.
              </p>

              <button
                onClick={() => setStep(1)}
                className="focus-ring mt-10 w-full flex items-center justify-center gap-2 py-4 rounded-sm font-medium text-sm"
                style={{ background: COLORS.lamp, color: COLORS.ink }}
              >
                Begin walkthrough <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* STEPS 1-5 — CATEGORY RATING */}
          {isCategoryStep && (
            <div key={category.key} className="pt-2 card-in">
              <div
                className="rounded-sm p-5"
                style={{
                  background: COLORS.paper,
                  borderTop: `3px dashed ${COLORS.paperLine}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <category.icon size={16} color={COLORS.textSoft} />
                  <span className="mono text-xs tracking-widest" style={{ color: COLORS.textSoft }}>
                    {category.tag}
                  </span>
                </div>
                <h2 className="slab text-2xl mt-2" style={{ color: COLORS.text }}>
                  {category.label}
                </h2>
                <p className="text-sm mt-1 leading-relaxed" style={{ color: COLORS.textSoft }}>
                  {category.description}
                </p>

                {/* Stamp rating row */}
                <div className="flex justify-between mt-6">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const selected = ratings[category.key]?.score === n;
                    const rot = STAMP_ROT[n - 1];
                    return (
                      <button
                        key={n}
                        onClick={() => setScore(category.key, n)}
                        aria-label={`Rate ${n} of 5`}
                        aria-pressed={selected}
                        className="focus-ring w-12 h-12 rounded-full flex items-center justify-center mono text-sm font-semibold transition-colors"
                        style={{
                          border: `2px solid ${selected ? STAMP_COLORS[n - 1] : COLORS.paperLine}`,
                          color: selected ? "#fff" : COLORS.textSoft,
                          background: selected ? STAMP_COLORS[n - 1] : "transparent",
                          transform: `rotate(${rot}deg)`,
                        }}
                      >
                        <span
                          key={selected ? "sel" : "unsel"}
                          className={selected ? "stamp-pop" : ""}
                          style={{ "--rot": `${rot}deg` }}
                        >
                          {n}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs mono" style={{ color: COLORS.textSoft }}>
                    {STAMP_LABEL[1]}
                  </span>
                  <span className="text-xs mono" style={{ color: COLORS.textSoft }}>
                    {STAMP_LABEL[5]}
                  </span>
                </div>

                {/* Note */}
                <textarea
                  value={ratings[category.key]?.note || ""}
                  onChange={(e) => setNote(category.key, e.target.value)}
                  placeholder="Add detail — what happened? (optional)"
                  rows={3}
                  className="focus-ring w-full mt-6 p-3 text-sm rounded-sm resize-none"
                  style={{
                    background: "#fff",
                    border: `1px solid ${COLORS.paperLine}`,
                    color: COLORS.text,
                  }}
                />

                {/* Evidence */}
                {category.evidence && (
                  <button
                    onClick={() => togglePhoto(category.key)}
                    className="focus-ring mt-3 flex items-center gap-2 text-sm py-2 px-3 rounded-sm"
                    style={{
                      border: `1px solid ${COLORS.paperLine}`,
                      color: ratings[category.key]?.photo ? "#3F6E5B" : COLORS.textSoft,
                      background: "transparent",
                    }}
                  >
                    {ratings[category.key]?.photo ? <Check size={14} /> : <Camera size={14} />}
                    {ratings[category.key]?.photo ? "1 photo attached" : "Attach photo"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 6 — REVIEW */}
          {step === CATEGORIES.length + 1 && (
            <div className="pt-6 card-in">
              <h2 className="slab text-2xl" style={{ color: COLORS.paper }}>
                Review before filing
              </h2>
              <p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>
                Tap any category to change it.
              </p>

              <div className="mt-5 rounded-sm overflow-hidden" style={{ background: COLORS.paper }}>
                {CATEGORIES.map((c, i) => {
                  const r = ratings[c.key];
                  return (
                    <button
                      key={c.key}
                      onClick={() => jumpTo(c.key)}
                      className="focus-ring w-full flex items-center justify-between px-4 py-3 text-left"
                      style={{
                        borderBottom: i < CATEGORIES.length - 1 ? `1px solid ${COLORS.paperLine}` : "none",
                      }}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: COLORS.text }}>
                          {c.label}
                        </p>
                        {r?.note && (
                          <p className="text-xs mt-0.5 truncate max-w-[200px]" style={{ color: COLORS.textSoft }}>
                            {r.note}
                          </p>
                        )}
                      </div>
                      <span
                        className="mono text-sm font-semibold w-7 h-7 rounded-full flex items-center justify-center"
                        style={{
                          background: r?.score ? STAMP_COLORS[r.score - 1] : COLORS.paperLine,
                          color: r?.score ? "#fff" : COLORS.textSoft,
                        }}
                      >
                        {r?.score || "–"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 mt-6">
                <span className="slab text-4xl" style={{ color: COLORS.paper }}>
                  {average.toFixed(1)}
                </span>
                <span className="text-sm" style={{ color: COLORS.inkSoft }}>
                  average across {completedScores.length} of {CATEGORIES.length} categories
                </span>
              </div>

              <div
                className="mt-6 p-4 rounded-sm text-sm leading-relaxed"
                style={{ background: COLORS.inkRaised, color: "#C7CCD6", border: `1px solid ${COLORS.inkLine}` }}
              >
                Your guest is filing a report on this stay too. Neither of you sees the other's
                report until both are filed, or after 14 days.
              </div>

              <button
                onClick={goNext}
                disabled={completedScores.length < CATEGORIES.length}
                className="focus-ring mt-6 w-full py-4 rounded-sm font-medium text-sm"
                style={{
                  background: completedScores.length < CATEGORIES.length ? COLORS.inkLine : COLORS.lamp,
                  color: completedScores.length < CATEGORIES.length ? COLORS.inkSoft : COLORS.ink,
                }}
              >
                File report
              </button>
            </div>
          )}

          {/* STEP 7 — CONFIRMATION */}
          {step === CATEGORIES.length + 2 && (
            <div className="pt-16 flex flex-col items-center text-center card-in">
              <div
                key="filed-stamp"
                className="stamp-pop w-28 h-28 rounded-full flex items-center justify-center border-4"
                style={{ borderColor: "#3F6E5B", color: "#3F6E5B", "--rot": "-6deg" }}
              >
                <CheckCircle2 size={44} />
              </div>
              <h2 className="slab text-2xl mt-6" style={{ color: COLORS.paper }}>
                Report filed
              </h2>
              <p className="text-sm mt-2 max-w-xs leading-relaxed" style={{ color: COLORS.inkSoft }}>
                Your report on {GUEST.name} is filed and sealed. You'll see their rating of your
                stay once they respond, or automatically in 14 days.
              </p>
              <button
                onClick={reset}
                className="focus-ring mt-8 text-sm mono tracking-wide py-2 px-4 rounded-sm"
                style={{ border: `1px solid ${COLORS.inkLine}`, color: COLORS.inkSoft }}
              >
                RESTART DEMO
              </button>
            </div>
          )}
        </div>

        {/* Sticky nav */}
        {step > 0 && step <= CATEGORIES.length + 1 && (
          <div
            className="fixed bottom-0 left-0 right-0 flex justify-center"
            style={{ background: COLORS.ink, borderTop: `1px solid ${COLORS.inkLine}` }}
          >
            <div className="w-full max-w-md flex gap-3 px-5 py-4">
              <button
                onClick={goBack}
                className="focus-ring flex items-center justify-center gap-1 py-3 px-4 rounded-sm text-sm"
                style={{ border: `1px solid ${COLORS.inkLine}`, color: COLORS.inkSoft }}
              >
                <ChevronLeft size={16} /> Back
              </button>
              {isCategoryStep && (
                <button
                  onClick={goNext}
                  disabled={!canAdvance}
                  className="focus-ring flex-1 flex items-center justify-center gap-1 py-3 rounded-sm text-sm font-medium"
                  style={{
                    background: canAdvance ? COLORS.lamp : COLORS.inkLine,
                    color: canAdvance ? COLORS.ink : COLORS.inkSoft,
                  }}
                >
                  Next <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
