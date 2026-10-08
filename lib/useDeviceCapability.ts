'use client';

import { useEffect, useState } from 'react';

export interface DeviceCapability {
  /** Has the capability check finished running on the client yet? */
  ready: boolean;
  prefersReducedMotion: boolean;
  /** True only once we've confirmed WebGL + enough headroom to run the 3D scene smoothly. */
  canRender3D: boolean;
}

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Heuristic, not science: enough signal to skip the 3D scene on a phone with
 * 2 cores and 2GB of RAM, without being so strict it disables it on most
 * real laptops. Always errs toward the static gradient fallback when unsure.
 */
function detectLowEndDevice(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;
  const isSmallViewport = window.innerWidth < 640;
  if (cores <= 2) return true;
  if (memory <= 2) return true;
  if (isSmallViewport && cores <= 4) return true;
  return false;
}

export function useDeviceCapability(): DeviceCapability {
  const [state, setState] = useState<DeviceCapability>({
    ready: false,
    prefersReducedMotion: false,
    canRender3D: false,
  });

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');

    const evaluate = () => {
      const prefersReducedMotion = mql.matches;
      const canRender3D = !prefersReducedMotion && detectWebGL() && !detectLowEndDevice();
      setState({ ready: true, prefersReducedMotion, canRender3D });
    };

    evaluate();
    mql.addEventListener('change', evaluate);
    return () => mql.removeEventListener('change', evaluate);
  }, []);

  return state;
}
