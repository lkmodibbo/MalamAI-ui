import { useCallback, useEffect, useRef } from 'react';

/**
 * Returns a stable `isMounted()` check.
 *
 * These screens load from AsyncStorage and the network, and users navigate away
 * long before those promises settle. Guarding the setState calls that follow an
 * await stops React logging update-on-unmounted-component warnings and keeps
 * abandoned responses from overwriting fresher state.
 */
export default function useIsMounted() {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return useCallback(() => mountedRef.current, []);
}
