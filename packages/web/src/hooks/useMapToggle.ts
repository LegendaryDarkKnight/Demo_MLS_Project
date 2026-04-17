import { useState, useCallback } from 'react';

export function useMapToggle(defaultVisible = true) {
  const [showMap, setShowMap] = useState(defaultVisible);
  const toggle = useCallback(() => setShowMap((v) => !v), []);
  const show = useCallback(() => setShowMap(true), []);
  const hide = useCallback(() => setShowMap(false), []);
  return { showMap, toggle, show, hide };
}
