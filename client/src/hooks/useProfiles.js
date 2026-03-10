import { useState, useCallback } from 'react';

const STORAGE_KEY = 'smartwatch_eval';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { profiles: [], activeProfileIndex: 0 };
    return JSON.parse(raw);
  } catch {
    return { profiles: [], activeProfileIndex: 0 };
  }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useProfiles() {
  const [state, setState] = useState(() => load());

  const activeProfile = state.profiles[state.activeProfileIndex] ?? null;

  const addProfile = useCallback((profile) => {
    setState(prev => {
      const next = {
        profiles: [...prev.profiles, profile],
        activeProfileIndex: prev.profiles.length
      };
      save(next);
      return next;
    });
  }, []);

  const switchProfile = useCallback((index) => {
    setState(prev => {
      const next = { ...prev, activeProfileIndex: index };
      save(next);
      return next;
    });
  }, []);

  const hasProfiles = state.profiles.length > 0;

  return { profiles: state.profiles, activeProfile, addProfile, switchProfile, hasProfiles };
}
