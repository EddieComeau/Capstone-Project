import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_SFX = {
  first_down: "/sfx/first_down.wav",
  interception: "/sfx/interception.wav",
  fumble: "/sfx/fumble.wav",
  touchdown: "/sfx/touchdown.wav",
};

const DEFAULT_LOTTIE = {
  first_down: "/lottie/fx/first_down.json",
  interception: "/lottie/fx/interception.json",
  fumble: "/lottie/fx/fumble.json",
  touchdown: "/lottie/fx/touchdown.json",
};

export function usePlayEventFX({
  initialEnabled = true,
  sfxMap = DEFAULT_SFX,
  lottieMap = DEFAULT_LOTTIE,
} = {}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [activeFx, setActiveFx] = useState(null); // { type, lottieUrl, key }
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const preloadRef = useRef({}); // type -> HTMLAudioElement

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  }, []);

  // Preload audio
  useEffect(() => {
    Object.entries(sfxMap).forEach(([type, url]) => {
      const a = new Audio(url);
      a.preload = "auto";
      preloadRef.current[type] = a;
    });
  }, [sfxMap]);

  // Audio unlock (browsers require user interaction)
  const unlockAudio = useCallback(async () => {
    try {
      const a = new Audio();
      a.src = sfxMap.first_down;
      a.volume = 0; // silent unlock
      await a.play();
      a.pause();
      a.currentTime = 0;
      setAudioUnlocked(true);
    } catch {
      setAudioUnlocked(false);
    }
  }, [sfxMap.first_down]);

  const playSound = useCallback(
    async (type) => {
      if (!enabled) return;
      if (!audioUnlocked) return;

      const a = preloadRef.current[type] || new Audio(sfxMap[type]);
      try {
        a.currentTime = 0;
        a.volume = 0.9;
        await a.play();
      } catch {
        // ignore autoplay restrictions / races
      }
    },
    [enabled, audioUnlocked, sfxMap]
  );

  const trigger = useCallback(
    async (type) => {
      if (!enabled) return;

      if (!prefersReducedMotion) {
        setActiveFx({
          type,
          lottieUrl: lottieMap[type],
          key: `${type}-${Date.now()}`,
        });
        window.setTimeout(() => setActiveFx(null), 1200);
      }

      await playSound(type);
    },
    [enabled, lottieMap, playSound, prefersReducedMotion]
  );

  return {
    enabled,
    setEnabled,
    activeFx,
    unlockAudio,
    trigger,
    audioUnlocked,
  };
}
