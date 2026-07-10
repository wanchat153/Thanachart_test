"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * ค่อย ๆ ปรากฏเมื่อเลื่อนมาถึง — เล่นครั้งเดียว
 *
 * ใช้ IntersectionObserver เติมคลาส `.in-view` ผ่าน ref โดยตรง ไม่ผ่าน state
 * (eslint rule react-hooks/set-state-in-effect ห้าม setState ใน effect อยู่แล้ว
 * และการเติมคลาสตรง ๆ ไม่ต้อง re-render ทั้งต้นไม้)
 *
 * ⚠️ คลาส .reveal ซ่อนเนื้อหาไว้เฉพาะเมื่อ <html> มีคลาส `js` (เซ็ตโดยสคริปต์ใน layout)
 * ถ้าเบราว์เซอร์ปิด JS เนื้อหาจะแสดงตามปกติ ไม่หายไปทั้งหน้า
 */
export function Reveal({
  children,
  delayMs = 0,
  className = "",
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === "undefined") {
      element.classList.add("in-view");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in-view");
        observer.disconnect(); // เล่นครั้งเดียว — reveal ซ้ำทุกครั้งที่ scroll ผ่านคือความรำคาญ
      },
      { threshold: 0.15 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={{ transitionDelay: `${delayMs}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
