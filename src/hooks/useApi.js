import { useState, useEffect, useCallback } from 'react';

export function useApi(fetchFn, deps = [], options = {}) {
  const { immediate = true, initialData = null } = options;
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFn(...args);
      setData(res.data?.data ?? res.data);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Erro ao carregar dados');
      throw err;
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    if (immediate) execute();
  }, [execute, immediate]);

  return { data, loading, error, refetch: execute };
}

export function useMutation(mutateFn) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await mutateFn(data);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Erro na operação';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [mutateFn]);

  return { mutate, loading, error };
}
