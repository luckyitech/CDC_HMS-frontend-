import { useState } from 'react';

const FACTOR = 18.0182;

// Convert mg/dL (stored in DB) → display value in selected unit
export const toDisplay = (mgdl, unit) => {
  if (mgdl == null || mgdl === '') return null;
  if (unit === 'mmol/L') return parseFloat((Number(mgdl) / FACTOR).toFixed(1));
  return Math.round(Number(mgdl));
};

// Convert user-entered display value back to mg/dL for the API
export const toMgDL = (value, unit) => {
  if (value == null || value === '') return null;
  if (unit === 'mmol/L') return Math.round(parseFloat(value) * FACTOR);
  return Math.round(parseFloat(value));
};

export const useBloodSugarUnit = () => {
  const [unit, setUnit] = useState(() => localStorage.getItem('bsUnit') || 'mg/dL');

  const changeUnit = (newUnit) => {
    localStorage.setItem('bsUnit', newUnit);
    setUnit(newUnit);
  };

  return { unit, changeUnit };
};
