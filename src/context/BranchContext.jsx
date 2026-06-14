import { createContext, useContext, useState, useEffect } from 'react';
import { branchesService } from '../services/branches.service';

const BranchContext = createContext(null);

export function BranchProvider({ children }) {
  const [branches, setBranches] = useState([]);
  const [currentBranch, setCurrentBranch] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('upbarber:token');
    if (!token) return;
    branchesService.list()
      .then(res => {
        const data = res.data.data || res.data;
        setBranches(data);
        const saved = localStorage.getItem('upbarber:branchId');
        const found = data.find(b => b.id === saved) || data.find(b => b.isMain) || data[0];
        if (found) changeBranch(found);
      })
      .catch(() => {});
  }, []);

  const changeBranch = (branch) => {
    setCurrentBranch(branch);
    localStorage.setItem('upbarber:branchId', branch.id);
  };

  return (
    <BranchContext.Provider value={{ branches, currentBranch, changeBranch }}>
      {children}
    </BranchContext.Provider>
  );
}

export const useBranch = () => useContext(BranchContext);
