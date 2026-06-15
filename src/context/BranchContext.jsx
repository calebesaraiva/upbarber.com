/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { branchesService } from '../services/branches.service';

const BranchContext = createContext(null);

export function BranchProvider({ children }) {
  const [branches, setBranches] = useState([]);
  const [currentBranch, setCurrentBranch] = useState(null);
  const [ready, setReady] = useState(false);
  const bootstrappedRef = useRef(false);

  const loadBranches = useCallback(async () => {
    const token = localStorage.getItem('upbarber:token');
    if (!token) {
      setReady(true);
      return [];
    }
    const res = await branchesService.list();
    const data = res.data.data || res.data || [];

    if (Array.isArray(data) && data.length === 0 && !bootstrappedRef.current) {
      bootstrappedRef.current = true;
      await branchesService.create({
        name: 'Matriz',
        address: 'Não informado',
        neighborhood: null,
        city: 'Não informado',
        state: 'NI',
        zipCode: null,
        phone: null,
        isActive: true
      });
      const retry = await branchesService.list();
      const retryData = retry.data.data || retry.data || [];
      setBranches(retryData);
      const created = retryData.find(b => b.isMain) || retryData[0] || null;
      if (created) {
        setCurrentBranch(created);
        localStorage.setItem('upbarber:branchId', created.id);
      }
      setReady(true);
      return retryData;
    }

    setBranches(data);
    const saved = localStorage.getItem('upbarber:branchId');
    if (saved === 'all') {
      setCurrentBranch(null);
    } else {
      const found = data.find(b => b.id === saved) || data.find(b => b.isMain) || data[0] || null;
      if (found) {
        setCurrentBranch(found);
        localStorage.setItem('upbarber:branchId', found.id);
      } else {
        setCurrentBranch(null);
        localStorage.removeItem('upbarber:branchId');
      }
    }
    setReady(true);
    return data;
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      loadBranches().catch(() => setReady(true));
    });
  }, [loadBranches]);

  useEffect(() => {
    const refresh = () => {
      loadBranches().catch(() => setReady(true));
    };
    const onStorage = event => {
      if (event.key === 'upbarber:token' || event.key === 'upbarber:branchId') {
        refresh();
      }
    };
    window.addEventListener('upbarber-auth-changed', refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('upbarber-auth-changed', refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, [loadBranches]);

  const changeBranch = (branch) => {
    if (!branch || branch === 'all') {
      setCurrentBranch(null);
      localStorage.setItem('upbarber:branchId', 'all');
      window.dispatchEvent(new Event('upbarber-auth-changed'));
      return;
    }
    setCurrentBranch(branch);
    localStorage.setItem('upbarber:branchId', branch.id);
    window.dispatchEvent(new Event('upbarber-auth-changed'));
  };

  return (
    <BranchContext.Provider value={{ branches, currentBranch, ready, changeBranch, reloadBranches: loadBranches }}>
      {children}
    </BranchContext.Provider>
  );
}

export const useBranch = () => useContext(BranchContext);
