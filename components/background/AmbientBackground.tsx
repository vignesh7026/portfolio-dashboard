'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useDeviceCapability } from '@/lib/useDeviceCapability';

const Scene3D = dynamic(() => import('./Scene3D').then((m) => m.Scene3D), { ssr: false });

/**
 * Fixed, full-viewport atmosphere behind all content. Never intercepts clicks
 * or scroll (pointer-events: none throughout). Three states:
 *  1. Before the client-side capability check resolves → static gradient (also
 *     what the server renders, so there's no hydration mismatch).
 *  2. prefers-reduced-motion, no WebGL, or a detected low-end device → stays
 *     on the static gradient permanently.
 *  3. Otherwise → the drifting glass/metal shard field, paused via the Page
 *     Visibility API whenever the tab isn't active.
 */
export function AmbientBackground() {
  const { ready, canRender3D } = useDeviceCapability();
  const [tabHidden, setTabHidden] = useState(false);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,#1a1710_0%,transparent_55%),radial-gradient(ellipse_100%_60%_at_85%_110%,#0f1a16_0%,transparent_50%)]" />
      {ready && canRender3D && (
        <div className="absolute inset-0 opacity-[0.55] blur-[0.5px] transition-opacity duration-700" style={{ filter: 'blur(0.5px)' }}>
          <Scene3D paused={tabHidden} />
        </div>
      )}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,transparent_0%,var(--bg)_85%)]" />
    </div>
  );
}
