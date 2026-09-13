'use client';

import React from 'react';

export type AdSlotType =
  | 'desktop_side_rail_left'
  | 'desktop_side_rail_right'
  | 'mobile_inline'
  | 'result_inline';

interface AdSlotProps {
  slot: AdSlotType;
  isPremium?: boolean;
  className?: string;
}

/**
 * Isolated AdSlot abstraction.
 * Calculator components and page layouts simply render <AdSlot slot="..." />
 * Automatically hides for verified premium users without polluting component logic.
 */
export const AdSlot: React.FC<AdSlotProps> = ({ slot, isPremium = false, className = '' }) => {
  if (isPremium) {
    return null;
  }

  // Side-rail slots (only render on large desktop screens >= 1280px)
  if (slot === 'desktop_side_rail_left' || slot === 'desktop_side_rail_right') {
    return (
      <aside
        aria-label="Advertisement"
        className={`hidden xl:flex flex-col items-center justify-start w-[160px] 2xl:w-[200px] shrink-0 sticky top-24 self-start min-h-[600px] py-4 px-2 ${className}`}
      >
        <div className="w-full h-[600px] rounded-lg border border-dashed border-slate-200 bg-slate-100/60 flex flex-col items-center justify-center p-3 text-center transition-all hover:bg-slate-100">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2">
            Advertisement
          </span>
          <p className="text-xs text-slate-400 font-medium">LifeCalc Partner</p>
          <div className="mt-8 text-[11px] text-slate-400/80">
            AdSense Safe Placement
          </div>
        </div>
      </aside>
    );
  }

  // Mobile & Result inline slots
  return (
    <div
      aria-label="Advertisement"
      className={`w-full max-w-calculator mx-auto my-6 px-4 ${className}`}
    >
      <div className="w-full h-24 rounded-lg border border-dashed border-slate-200 bg-slate-100/50 flex flex-col items-center justify-center text-center p-2">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
          Advertisement
        </span>
        <span className="text-xs text-slate-400">Sponsored Content</span>
      </div>
    </div>
  );
};
