import { useCallback, useEffect, useRef } from "react";

/**
 * Shared 3D motion primitives — pointer tilt, magnetic pull, and the
 * scoped keyframes/CSS vars that drive them. Used by any page that wants
 * the same "advanced" hover/3D treatment (UserListPage, UserFormPage,
 * DashboardPage, ...) without re-deriving the physics per file.
 */

export const REDUCED =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Pointer-driven 3D tilt with a moving glare hot-spot, a directional edge
 * sheen, a direction-aware drop shadow, and inner-layer parallax.
 * Spread `handlers` on the tilted element and attach `ref` to it; give
 * inner content `className="u-tilt-content"` (or `u-float-layer` for the
 * elements that should separate furthest) to get the parallax depth.
 */
export function use3DTilt({ max = 14, scale = 1.04 } = {}) {
  const ref = useRef(null);
  const frame = useRef(0);

  const write = useCallback((v) => {
    const el = ref.current;
    if (!el) return;
    for (const k in v) el.style.setProperty(k, v[k]);
  }, []);

  const onMouseMove = useCallback(
    (e) => {
      if (REDUCED) return;
      const el = ref.current;
      if (!el) return;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        write({
          "--rx": `${(-ny * max * 2).toFixed(2)}deg`,
          "--ry": `${(nx * max * 2).toFixed(2)}deg`,
          "--scale": String(scale),
          "--gx": `${((nx + 0.5) * 100).toFixed(1)}%`,
          "--gy": `${((ny + 0.5) * 100).toFixed(1)}%`,
          "--glare": "0.45",
          "--sx": `${(-nx * 26).toFixed(1)}px`,
          "--sy": `${(-ny * 26 + 20).toFixed(1)}px`,
          "--px": (nx * 2).toFixed(3),
          "--py": (ny * 2).toFixed(3),
        });
        el.dataset.tilting = "1";
      });
    },
    [max, scale, write]
  );

  const onMouseLeave = useCallback(() => {
    cancelAnimationFrame(frame.current);
    write({
      "--rx": "0deg",
      "--ry": "0deg",
      "--scale": "1",
      "--gx": "50%",
      "--gy": "50%",
      "--glare": "0",
      "--sx": "0px",
      "--sy": "18px",
      "--px": "0",
      "--py": "0",
    });
    if (ref.current) delete ref.current.dataset.tilting;
  }, [write]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return { ref, handlers: { onMouseMove, onMouseLeave } };
}

/** Magnetic pull toward the cursor — good for primary CTAs. */
export function useMagnetic(strength = 0.3) {
  const ref = useRef(null);
  const onMouseMove = useCallback(
    (e) => {
      if (REDUCED) return;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * strength;
      const y = (e.clientY - r.top - r.height / 2) * strength;
      el.style.transform = `translate(${x}px, ${y}px)`;
    },
    [strength]
  );
  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = "translate(0,0)";
  }, []);
  return { ref, handlers: { onMouseMove, onMouseLeave } };
}

/** Scoped keyframes + tilt/parallax/rise primitives, shared across pages. */
export function Motion3DStyles() {
  return (
    <style>{`
      .u-tilt-perspective { perspective: 900px; perspective-origin: center; }
      .u-tilt {
        --rx:0deg; --ry:0deg; --scale:1; --sx:0px; --sy:18px; --px:0; --py:0;
        transform: rotateX(var(--rx)) rotateY(var(--ry)) scale(var(--scale)) translateZ(0);
        transform-style: preserve-3d;
        transition: transform .6s cubic-bezier(.16,1,.3,1), box-shadow .6s cubic-bezier(.16,1,.3,1);
        will-change: transform;
        box-shadow: 0 10px 25px -12px rgba(15,23,42,.18);
      }
      .u-tilt[data-tilting] {
        transition: transform .12s ease-out, box-shadow .2s ease-out;
        box-shadow: var(--sx) var(--sy) 45px -12px rgba(15,23,42,.38),
                    0 0 0 1px rgba(255,255,255,.04) inset;
      }
      .u-glare::after {
        content:""; position:absolute; inset:0; pointer-events:none; border-radius:inherit;
        background: radial-gradient(180px circle at var(--gx,50%) var(--gy,50%),
          rgba(255,255,255,calc(var(--glare,0) * 1)), transparent 60%);
        transition: opacity .5s ease; mix-blend-mode: overlay; z-index:6;
      }
      .u-glare::before {
        content:""; position:absolute; inset:0; pointer-events:none; border-radius:inherit; z-index:5;
        background: linear-gradient(
          calc(var(--px) * 40deg + 120deg),
          rgba(255,255,255,calc(var(--glare,0) * .5)),
          transparent 40%);
        opacity:.9;
      }
      .u-tilt-content {
        transform: translateZ(45px) translate3d(calc(var(--px) * 6px), calc(var(--py) * 6px), 0);
        transform-style: preserve-3d;
        transition: transform .2s ease-out;
      }
      .u-float-layer {
        transform: translateZ(75px) translate3d(calc(var(--px) * 12px), calc(var(--py) * 12px), 0);
        transition: transform .2s ease-out;
      }

      .u-spotlight { position: relative; }
      .u-spotlight::before {
        content:""; position:absolute; inset:0; pointer-events:none; z-index:5; border-radius:inherit;
        opacity: var(--spot,0); transition: opacity .3s ease;
        background: radial-gradient(320px circle at var(--mx) var(--my),
          rgba(99,102,241,.10), transparent 70%);
      }

      @keyframes u-rise { from { opacity:0; transform: translateY(16px) scale(.97); } to { opacity:1; transform:none; } }
      .u-rise { animation: u-rise .55s cubic-bezier(.22,1,.36,1) both; }
      @keyframes u-pulse-k { 0%,100% { box-shadow:0 0 0 0 rgba(16,185,129,.55); } 50% { box-shadow:0 0 0 5px rgba(16,185,129,0); } }
      .u-pulse { border-radius:9999px; animation: u-pulse-k 2s ease-out infinite; }
      @keyframes u-float-k { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      .u-hover-float:hover .u-float-target { animation: u-float-k 2.4s ease-in-out infinite; }
      @keyframes u-aurora-k { 0% { transform: translate3d(-8%,-4%,0) rotate(0deg); } 50% { transform: translate3d(8%,6%,0) rotate(180deg); } 100% { transform: translate3d(-8%,-4%,0) rotate(360deg); } }
      .u-aurora { animation: u-aurora-k 22s ease-in-out infinite; }
      @keyframes u-shimmer-k { 100% { background-position: 200% 0; } }
      .u-skel {
        background: linear-gradient(90deg, rgba(148,163,184,.12) 25%, rgba(148,163,184,.28) 37%, rgba(148,163,184,.12) 63%);
        background-size: 200% 100%; animation: u-shimmer-k 1.4s ease-in-out infinite;
      }
      @media (prefers-reduced-motion: reduce) {
        .u-tilt,.u-tilt-content,.u-float-layer,.u-rise,.u-pulse,.u-aurora,.u-skel,.u-hover-float:hover .u-float-target {
          animation: none !important; transition: none !important; transform: none !important;
        }
        .u-glare::before,.u-glare::after { display: none !important; }
      }
    `}</style>
  );
}

/** Decorative dot-grid, faded toward the edges — for hero/banner panels. */
export function GridPattern({ id = "grid" }) {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <pattern id={id} width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" className="fill-slate-300/50 dark:fill-white/10" />
        </pattern>
        <radialGradient id={`${id}-fade`} cx="50%" cy="0%" r="90%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="70%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id={`${id}-mask`}>
          <rect width="100%" height="100%" fill={`url(#${id}-fade)`} />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} mask={`url(#${id}-mask)`} />
    </svg>
  );
}
