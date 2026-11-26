import React from 'react';
import type { DataQualityStatus, ImplementationBadge, TechnicalStatus } from '../../types/resourceloop';

const TRUST_META: Record<DataQualityStatus, { label: string; colorClass: string }> = {
  VERIFIED: { label: 'VERIFIED', colorClass: 'text-[#063D2F] border-[#063D2F]/30 bg-[#063D2F]/5' },
  SOURCE_DATA: { label: 'SOURCE DATA', colorClass: 'text-[#101714] border-[#101714]/20 bg-[#F7F5EF]' },
  USER_PROVIDED: { label: 'USER PROVIDED', colorClass: 'text-[#101714] border-[#6E8276]/35 bg-white' },
  CALCULATED: { label: 'CALCULATED', colorClass: 'text-[#063D2F] border-[#C6A45A]/50 bg-[#C6A45A]/10' },
  AI_HYPOTHESIS: { label: 'AI HYPOTHESIS', colorClass: 'text-[#8C6413] border-[#C6A45A]/60 bg-[#C6A45A]/15' },
  CONFLICT: { label: 'CONFLICT', colorClass: 'text-[#B91C1C] border-[#B91C1C]/35 bg-[#FEF2F2]' },
  UNKNOWN: { label: 'UNKNOWN', colorClass: 'text-[#6E8276] border-[#6E8276]/30 bg-[#F7F5EF]' },
};

export const TrustStatusLabel: React.FC<{ status: DataQualityStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  const meta = TRUST_META[status] ?? TRUST_META.UNKNOWN;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-medium tracking-tight border rounded whitespace-nowrap shrink-0 ${meta.colorClass} ${className}`}
    >
      {meta.label}
    </span>
  );
};

const TECH_META: Record<TechnicalStatus, { label: string; colorClass: string }> = {
  PASSED: { label: 'Prüfung bestanden', colorClass: 'text-[#063D2F] border-[#063D2F]/35 bg-[#063D2F]/10' },
  CONDITIONALLY_POSSIBLE: { label: 'Bedingt möglich', colorClass: 'text-[#8C6413] border-[#C6A45A]/60 bg-[#C6A45A]/15' },
  EXPERT_REVIEW_REQUIRED: { label: 'Fachprüfung erforderlich', colorClass: 'text-[#9A5B13] border-[#D97706]/40 bg-[#FFFBEB]' },
  EXCLUDED: { label: 'Ausgeschlossen', colorClass: 'text-[#B91C1C] border-[#B91C1C]/35 bg-[#FEF2F2]' },
  UNKNOWN: { label: 'Unbekannt', colorClass: 'text-[#6E8276] border-[#6E8276]/30 bg-[#F7F5EF]' },
};

export const TechnicalStatusLabel: React.FC<{ status: TechnicalStatus }> = ({ status }) => {
  const meta = TECH_META[status] ?? TECH_META.UNKNOWN;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium border rounded whitespace-nowrap shrink-0 ${meta.colorClass}`}
    >
      {meta.label}
    </span>
  );
};

const IMPL_META: Record<ImplementationBadge, { label: string; colorClass: string }> = {
  IMPLEMENTED_TESTED: { label: 'IMPLEMENTED AND TESTED', colorClass: 'text-[#063D2F] border-[#063D2F]/35 bg-[#063D2F]/10' },
  IMPLEMENTED_NOT_TESTED: { label: 'IMPLEMENTED – NOT TESTED', colorClass: 'text-[#8C6413] border-[#C6A45A]/60 bg-[#C6A45A]/15' },
  DEMO_ONLY: { label: 'DEMO ONLY', colorClass: 'text-[#101714] border-[#101714]/25 bg-[#F7F5EF]' },
  PLANNED: { label: 'PLANNED', colorClass: 'text-[#6E8276] border-[#6E8276]/30 bg-white' },
  BLOCKED: { label: 'BLOCKED', colorClass: 'text-[#B91C1C] border-[#B91C1C]/35 bg-[#FEF2F2]' },
};

export const RoadmapStatusLabel: React.FC<{ status: ImplementationBadge }> = ({ status }) => {
  const meta = IMPL_META[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-mono border rounded whitespace-nowrap shrink-0 ${meta.colorClass}`}
    >
      {meta.label}
    </span>
  );
};
