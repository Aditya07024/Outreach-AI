import React from 'react';
import { Users, Sparkle, Tray, PaperPlaneRight, CheckCircle } from '@phosphor-icons/react';

interface FunnelStep {
  label: string;
  count: number;
  icon: React.ElementType;
  status: 'completed' | 'active' | 'pending';
}

interface PipelineFunnelProps {
  contactsCount: number;
  draftsCount: number;
  reviewCount: number;
  sentCount: number;
}

export const PipelineFunnel: React.FC<PipelineFunnelProps> = ({
  contactsCount,
  draftsCount,
  reviewCount,
  sentCount,
}) => {
  const steps: FunnelStep[] = [
    {
      label: 'Recruiters Added',
      count: contactsCount,
      icon: Users,
      status: contactsCount > 0 ? 'completed' : 'pending',
    },
    {
      label: 'Emails Written',
      count: draftsCount,
      icon: Sparkle,
      status: draftsCount > 0 ? 'completed' : contactsCount > 0 ? 'active' : 'pending',
    },
    {
      label: 'Ready to Review',
      count: reviewCount,
      icon: Tray,
      status: reviewCount > 0 ? 'active' : draftsCount > 0 ? 'completed' : 'pending',
    },
    {
      label: 'Emails Sent',
      count: sentCount,
      icon: PaperPlaneRight,
      status: sentCount > 0 ? 'completed' : 'pending',
    },
  ];

  return (
    <div className="relative w-full py-2">
      {/* Background Connecting Track Line (Positioned exactly at y=28px, center of 56px circles) */}
      <div className="absolute top-[28px] left-[12%] right-[12%] h-[2px] bg-stone-200 z-0" />

      {/* Active Connecting Progress Line (Hidden beneath circles by z-index and solid circle masks) */}
      <div
        className="absolute top-[28px] left-[12%] h-[2px] bg-gradient-to-r from-[#1DA365] via-[#D99B00] to-[#FF6B1A] z-0 transition-all duration-700"
        style={{
          width: sentCount > 0 ? '76%' : reviewCount > 0 ? '51%' : draftsCount > 0 ? '26%' : '0%',
        }}
      />

      <div className="grid grid-cols-4 gap-2 relative z-10">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isDone = step.status === 'completed';
          const isActive = step.status === 'active';

          return (
            <div key={idx} className="flex flex-col items-center text-center group">
              {/* Node Circle Wrapper with Opaque White Masking Ring so the line is completely hidden beneath */}
              <div className="relative z-10">
                <div
                  className={`
                    w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 relative shadow-xs
                    ring-6 ring-[#FFFDFB]
                    ${isDone
                      ? 'bg-[#ECFDF5] border-2 border-[#1DA365] text-[#1DA365] shadow-[0_4px_12px_rgba(29,163,101,0.2)]'
                      : isActive
                      ? 'bg-[#FFFBEB] border-2 border-[#D99B00] text-[#D99B00] shadow-[0_4px_12px_rgba(217,155,0,0.2)] animate-pulse'
                      : 'bg-white border-2 border-stone-200 text-[#735E50]'
                    }
                  `}
                >
                  <Icon size={24} weight="duotone" />
                  {isDone && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#1DA365] text-white flex items-center justify-center text-[10px] shadow-xs">
                      <CheckCircle size={14} weight="fill" />
                    </span>
                  )}
                </div>
              </div>

              {/* Numerical Metric */}
              <span className="mt-2.5 text-lg font-bold font-display tabular-nums text-[#2A1A0F]">
                {step.count.toLocaleString()}
              </span>

              {/* Friendly Label */}
              <span className="text-xs font-semibold text-[#735E50] mt-0.5">
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
