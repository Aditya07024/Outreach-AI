import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface ArcGaugeProps {
  value: number;       // Sent today
  max: number;         // Max daily limit (e.g. 50, 100, 500)
  label?: string;
  sublabel?: string;
  size?: number;
}

export const ArcGauge: React.FC<ArcGaugeProps> = ({
  value,
  max,
  label = 'Sent Today',
  sublabel = 'daily safe limit',
  size = 200,
}) => {
  const circleRef = useRef<SVGCircleElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);

  const radius = size * 0.38;
  const circumference = 2 * Math.PI * radius;
  // 240 degree gauge arc
  const arcLength = circumference * 0.72;
  const percentage = Math.min(Math.max(value / (max || 1), 0), 1);
  const strokeDashoffset = arcLength - percentage * arcLength;

  // Semantic color for Light Mode
  let strokeColor = '#1DA365'; // leaf (rich green)
  let glowColor = 'rgba(29, 163, 101, 0.25)';
  if (percentage >= 0.95) {
    strokeColor = '#E63946'; // signal
    glowColor = 'rgba(230, 57, 70, 0.3)';
  } else if (percentage >= 0.8) {
    strokeColor = '#FF6B1A'; // flame
    glowColor = 'rgba(255, 107, 26, 0.3)';
  } else if (percentage >= 0.6) {
    strokeColor = '#D99B00'; // saffron
    glowColor = 'rgba(217, 155, 0, 0.25)';
  }

  useEffect(() => {
    // Animate arc drawing in
    if (circleRef.current) {
      gsap.fromTo(
        circleRef.current,
        { strokeDashoffset: arcLength },
        {
          strokeDashoffset,
          duration: 1.4,
          ease: 'power3.out',
        }
      );
    }

    // Number count-up animation
    if (numberRef.current) {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: value,
        duration: 1.4,
        ease: 'power3.out',
        onUpdate: () => {
          if (numberRef.current) {
            numberRef.current.textContent = Math.round(obj.val).toString();
          }
        },
      });
    }
  }, [value, max, strokeDashoffset, arcLength]);

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[140deg] overflow-visible"
      >
        {/* Track (Subtle warm amber-grey on light background) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(42, 26, 15, 0.08)"
          strokeWidth={size * 0.075}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />

        {/* Dynamic Colored Progress Arc */}
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={size * 0.08}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 2px 8px ${glowColor})`,
            transition: 'stroke 0.4s ease',
          }}
        />
      </svg>

      {/* Central Metric Value in Deep Espresso */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pt-2">
        <span
          ref={numberRef}
          className="text-4xl font-bold font-display tracking-tight text-[#2A1A0F] tabular-nums"
        >
          {value}
        </span>
        <span className="text-xs font-mono text-[#735E50] mt-0.5 font-medium">
          / {max} cap
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#735E50]/90 mt-1">
          {label}
        </span>
      </div>
    </div>
  );
};
