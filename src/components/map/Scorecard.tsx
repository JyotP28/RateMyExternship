"use client";

interface ScorecardProps {
  reviews: any[];
}

const ScoreBar = ({ label, value }: { label: string; value: number }) => (
  <div className="mb-3">
    <div className="mb-1 flex justify-between text-xs uppercase tracking-tighter">
      <span className="opacity-60">{label}</span>
      <span className="font-bold text-vet-mint">{value.toFixed(1)}/5</span>
    </div>
    {/* Custom Glassmorphic Progress Bar */}
    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
      <div 
        className="h-full bg-vet-mint shadow-[0_0_10px_rgba(100,210,177,0.5)] transition-all duration-1000" 
        style={{ width: `${(value / 5) * 100}%` }}
      />
    </div>
  </div>
);

export function Scorecard({ reviews }: ScorecardProps) {
  const averages = reviews.length === 0 ? 
    { mentorship: 0, handsOn: 0, culture: 0, volume: 0 } :
    reviews.reduce((acc, r) => ({
      mentorship: acc.mentorship + (r.mentorship || 0) / reviews.length,
      handsOn: acc.handsOn + (r.hands_on || 0) / reviews.length,
      culture: acc.culture + (r.culture || 0) / reviews.length,
      volume: acc.volume + (r.volume || 0) / reviews.length,
    }), { mentorship: 0, handsOn: 0, culture: 0, volume: 0 });

  return (
    <div className="space-y-4 rounded-2xl bg-black/20 p-4 border border-white/5">
      <ScoreBar label="Mentorship" value={averages.mentorship} />
      <ScoreBar label="Hands-on Level" value={averages.handsOn} />
      <ScoreBar label="Work Culture" value={averages.culture} />
      <ScoreBar label="Clinical Volume" value={averages.volume} />
    </div>
  );
}