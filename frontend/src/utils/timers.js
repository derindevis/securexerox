// ============================================
// SecureXerox — Timer & Countdown Utilities
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for countdown timer
 * @param {number} initialSeconds - Starting seconds
 * @param {boolean} autoStart - Whether to start immediately
 * @param {function} onExpire - Callback when timer hits 0
 * @returns {object} Timer state and controls
 */
export function useCountdown(initialSeconds, autoStart = false, onExpire = null) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef(null);
  const onExpireRef = useRef(onExpire);

  // Keep callback ref fresh
  onExpireRef.current = onExpire;

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback((newSeconds) => {
    setSeconds(newSeconds ?? initialSeconds);
    setIsRunning(false);
  }, [initialSeconds]);

  const restart = useCallback((newSeconds) => {
    setSeconds(newSeconds ?? initialSeconds);
    setIsRunning(true);
  }, [initialSeconds]);

  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setIsRunning(false);
            if (onExpireRef.current) onExpireRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, seconds]);

  return {
    seconds,
    isRunning,
    isExpired: seconds === 0,
    formatted: formatTime(seconds),
    progress: initialSeconds > 0 ? seconds / initialSeconds : 0,
    start,
    pause,
    reset,
    restart,
  };
}

/**
 * Format seconds to MM:SS
 * @param {number} totalSeconds
 * @returns {string} Formatted time string
 */
export function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get countdown color based on remaining time ratio
 * @param {number} progress - 0 to 1 (1 = full, 0 = expired)
 * @returns {string} CSS color class
 */
export function getCountdownColor(progress) {
  if (progress > 0.5) return 'countdown-green';
  if (progress > 0.2) return 'countdown-yellow';
  return 'countdown-red';
}

/**
 * Custom hook for simulated async delay
 * @param {number} ms - Milliseconds to wait
 * @returns {function} A function that returns a promise resolving after ms
 */
export function useSimulatedDelay() {
  return useCallback((ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }, []);
}
