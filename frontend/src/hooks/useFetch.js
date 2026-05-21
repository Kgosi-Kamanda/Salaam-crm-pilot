// src/hooks/useFetch.js
import { useState, useEffect, useCallback } from 'react';
import { issuesAPI, tagsAPI, cannedAPI } from '../api/issues';
import { contactsAPI, teamAPI }          from '../api/users';
import { dashboardAPI }                  from '../api/roles';

export function useFetch(fetchFn, deps = []) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const res = await fetchFn();
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

// Domain-specific hooks
export const useIssues      = (p = {}) => useFetch(() => issuesAPI.list(p),        [JSON.stringify(p)]);
export const useIssue       = (id)     => useFetch(() => issuesAPI.get(id),         [id]);
export const useMessages    = (id)     => useFetch(() => issuesAPI.messages(id),    [id]);
export const useTags        = (p = {}) => useFetch(() => tagsAPI.list(p),           [JSON.stringify(p)]);
export const useCanned      = (p = {}) => useFetch(() => cannedAPI.list(p),         [JSON.stringify(p)]);
export const useContacts    = (p = {}) => useFetch(() => contactsAPI.list(p),       [JSON.stringify(p)]);
export const useContact     = (id)     => useFetch(() => contactsAPI.get(id),       [id]);
export const useTeam        = ()       => useFetch(() => teamAPI.list(),             []);
export const useDepartments = ()       => useFetch(() => teamAPI.departments(),      []);
export const useDashboard   = ()       => useFetch(() => dashboardAPI.stats(),       []);
