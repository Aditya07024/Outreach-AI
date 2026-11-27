import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';

export interface GlassProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'strong' | 'pill' | 'nested';
  radius?: 'outer' | 'inner' | 'control' | 'pill' | 'none';
  interactive?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export const Glass: React.FC<GlassProps> = ({
  variant = 'surface',
  radius = 'outer',
  interactive = false,
  children,
  className = '',
  ...props
}) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!interactive || !elementRef.current) return;

    const el = elementRef.current;
    const xTo = gsap.quickTo(el, '--mx', { duration: 0.35, ease: 'power2.out' });
    const yTo = gsap.quickTo(el, '--my', { duration: 0.35, ease: 'power2.out' });

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      xTo(x);
      yTo(y);
    };

    el.addEventListener('mousemove', handleMouseMove);
    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
    };
  }, [interactive]);

  // Concentric Radii mapping
  const radiusClasses = {
    outer: 'rounded-[32px]',
    inner: 'rounded-[20px]',
    control: 'rounded-[14px]',
    pill: 'rounded-full',
    none: 'rounded-none',
  }[radius];

  // Variant classes for Light Warm Glass
  let variantClasses = '';
  if (variant === 'surface') {
    variantClasses = `
      bg-white/75 backdrop-blur-[24px] saturate-[160%]
      border border-white/85
      shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(42,26,15,0.03),0_16px_36px_-12px_rgba(42,26,15,0.07),0_3px_8px_-1px_rgba(42,26,15,0.03)]
    `;
  } else if (variant === 'strong') {
    variantClasses = `
      bg-white/90 backdrop-blur-[32px] saturate-[180%]
      border border-white/95
      shadow-[inset_0_1px_0_rgba(255,255,255,1),inset_0_-1px_0_rgba(42,26,15,0.04),0_20px_45px_-10px_rgba(42,26,15,0.09)]
    `;
  } else if (variant === 'pill') {
    variantClasses = `
      bg-white/75 backdrop-blur-[16px]
      border border-white/90
      shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_8px_-2px_rgba(42,26,15,0.05)]
    `;
  } else if (variant === 'nested') {
    variantClasses = `
      bg-white/50
      border border-[rgba(42,26,15,0.06)]
      shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]
    `;
  }

  const interactiveClasses = interactive
    ? `
      relative transition-all duration-200 cursor-pointer
      hover:-translate-y-1 hover:border-white
      hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_20px_45px_-12px_rgba(255,107,26,0.18),0_8px_20px_-6px_rgba(42,26,15,0.06)]
      active:scale-[0.985]
    `
    : '';

  return (
    <div
      ref={elementRef}
      className={`
        relative text-[#2A1A0F]
        ${radiusClasses}
        ${variantClasses}
        ${interactiveClasses}
        ${className}
      `}
      style={
        interactive
          ? {
              backgroundImage: `radial-gradient(circle 200px at var(--mx, 50%) var(--my, 50%), rgba(255, 255, 255, 0.45), transparent 80%)`,
            }
          : undefined
      }
      {...props}
    >
      {children}
    </div>
  );
};
