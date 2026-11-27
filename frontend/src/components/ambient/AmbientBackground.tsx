import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export const AmbientBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);
  const orb3Ref = useRef<HTMLDivElement>(null);
  const orb4Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    const ctx = gsap.context(() => {
      // Orb 1: Warm Flame (#FF6B1A) - top left to center
      if (orb1Ref.current) {
        gsap.to(orb1Ref.current, {
          x: '+=120',
          y: '+=80',
          scale: 1.15,
          duration: 48,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });
      }

      // Orb 2: Golden Saffron (#FFC233) - top right drift
      if (orb2Ref.current) {
        gsap.to(orb2Ref.current, {
          x: '-=140',
          y: '+=100',
          scale: 0.9,
          duration: 54,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: 2,
        });
      }

      // Orb 3: Minty Leaf (#2EC27E) - bottom left drift
      if (orb3Ref.current) {
        gsap.to(orb3Ref.current, {
          x: '+=100',
          y: '-=90',
          scale: 1.1,
          duration: 42,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: 4,
        });
      }

      // Orb 4: Soft Rose Signal (#FF8591) - bottom right subtle anchor
      if (orb4Ref.current) {
        gsap.to(orb4Ref.current, {
          x: '-=110',
          y: '-=70',
          scale: 1.05,
          duration: 58,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: 6,
        });
      }
    }, containerRef);

    // Subtle pointer parallax
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const xPercent = (clientX / window.innerWidth - 0.5) * 20;
      const yPercent = (clientY / window.innerHeight - 0.5) * 20;

      if (containerRef.current) {
        gsap.to(containerRef.current, {
          x: xPercent,
          y: yPercent,
          duration: 2.5,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      ctx.revert();
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-[#FDF8F3]">
      {/* Drifting Luminous Ambient Orbs over Warm Cream */}
      <div ref={containerRef} className="absolute inset-[-15%] w-[130%] h-[130%]">
        {/* Flame Warm Peach Orb (Top Left) */}
        <div
          ref={orb1Ref}
          className="absolute top-[8%] left-[6%] w-[620px] h-[620px] rounded-full blur-[140px] opacity-25"
          style={{ background: 'radial-gradient(circle, #FFA56B 0%, rgba(255, 165, 107, 0) 70%)' }}
        />

        {/* Saffron Honey Glow Orb (Top Right) */}
        <div
          ref={orb2Ref}
          className="absolute top-[5%] right-[10%] w-[580px] h-[580px] rounded-full blur-[140px] opacity-25"
          style={{ background: 'radial-gradient(circle, #FFE082 0%, rgba(255, 224, 130, 0) 70%)' }}
        />

        {/* Leaf Minty Jade Orb (Bottom Left) */}
        <div
          ref={orb3Ref}
          className="absolute bottom-[8%] left-[15%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-20"
          style={{ background: 'radial-gradient(circle, #A7F3D0 0%, rgba(167, 243, 208, 0) 70%)' }}
        />

        {/* Soft Rose Signal Orb (Bottom Right) */}
        <div
          ref={orb4Ref}
          className="absolute bottom-[10%] right-[8%] w-[520px] h-[520px] rounded-full blur-[150px] opacity-20"
          style={{ background: 'radial-gradient(circle, #FECDD3 0%, rgba(254, 205, 211, 0) 70%)' }}
        />
      </div>

      {/* 2.5% Warm Film Grain Overlay */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.025] pointer-events-none mix-blend-multiply"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="warm-grain-light">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.75"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#warm-grain-light)" />
      </svg>
    </div>
  );
};
