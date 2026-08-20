import { useMemo } from 'react';
import { useExpenseStore, useAuthStore } from '../store';

export function useCentralBalance(groupId = 'all') {
  const { settlePlans, userNetPositions, groupBalances } = useExpenseStore();
  const { user } = useAuthStore();
  
  const rawNetPos = userNetPositions?.[groupId] || { totalReceivable: 0, totalPayable: 0, netBalance: 0 };
  const rawPlan = settlePlans?.[groupId] || [];
  const rawBalances = groupBalances?.[groupId] || [];

  return useMemo(() => {
    // SINGLE SOURCE OF TRUTH: Rely entirely on backend computed balances.
    const userName = user?.full_name?.toLowerCase()?.trim() || "";
    
    // The rawPlan from the backend is already filtered for the current user (either as payer or receiver).
    const toReceiveList = rawPlan.filter(t => t.to_name?.toLowerCase().trim() === userName);
    const toPayList = rawPlan.filter(t => t.from_name?.toLowerCase().trim() === userName);

    return {
      netBalance: rawNetPos.netBalance || 0,
      toReceiveTotal: rawNetPos.totalReceivable || 0,
      toPayTotal: rawNetPos.totalPayable || 0,
      toReceiveList,
      toPayList,
      rawPlan,
      rawBalances
    };
  }, [rawPlan, rawBalances, rawNetPos, user]);
}
