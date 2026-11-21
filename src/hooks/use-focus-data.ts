import { useFocusEffect } from 'expo-router';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { errorMessage } from '@/lib/errors';

/**
 * Loads data when the screen comes into focus and whenever `deps` change,
 * so lists are fresh after returning from an edit screen.
 */
export function useFocusData<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  // Always call the latest loader without making it a dependency.
  const loaderRef = useRef(loader);
  useLayoutEffect(() => {
    loaderRef.current = loader;
  });

  const run = useCallback(async (mode: 'refresh' | 'silent') => {
    const id = ++requestId.current;
    if (mode === 'refresh') setRefreshing(true);
    try {
      const result = await loaderRef.current();
      if (id === requestId.current) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (id === requestId.current) setError(errorMessage(e));
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const depsKey = JSON.stringify(deps);
  // When the inputs change (e.g. another day in the calendar), drop the old data at once so
  // it is never shown under the new heading while the new data loads.
  const [shownKey, setShownKey] = useState(depsKey);
  if (shownKey !== depsKey) {
    setShownKey(depsKey);
    setData(null);
    setLoading(true);
  }

  useFocusEffect(
    useCallback(() => {
      run('silent');
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [run, depsKey]),
  );

  return { data, loading, refreshing, error, refresh: () => run('refresh'), reload: () => run('silent') };
}
