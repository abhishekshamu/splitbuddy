import React from 'react';
import {
  Grid, Users, List, CheckCircle2, PieChart, Home, Settings as SettingsIcon
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: "dashboard", lbl: "Dashboard", icon: <Grid size={20} /> },
  { id: "groups", lbl: "Groups", icon: <Users size={20} /> },
  { id: "expenses", lbl: "Expenses", icon: <List size={20} /> },
  { id: "settle", lbl: "Settle Up", icon: <CheckCircle2 size={20} /> },
  { id: 'reports', lbl: 'Insights', icon: <PieChart size={20} /> },
  { id: "utilities", lbl: "Utilities", icon: <Home size={20} /> },
  { id: "settings", lbl: "Settings", icon: <SettingsIcon size={20} /> },
];

export const PAGE_TITLES = { 
  dashboard: "Dashboard", 
  groups: "My Groups", 
  groupdetail: "Group Detail", 
  expenses: "All Expenses", 
  settle: "Settle Up", 
  reports: "Insights", 
  utilities: "Room Utilities", 
  ai: "AI Assistant", 
  settings: "Settings", 
  more: "More", 
  profile: "My Profile" 
};
