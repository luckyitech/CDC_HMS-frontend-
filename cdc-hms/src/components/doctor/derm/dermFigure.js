// Which figure the body map is drawn on (8 Oct 2026, Emu): adult female,
// adult male or child — chosen automatically from the patient's file (sex,
// and age for a child); no manual switch. The figure only changes the drawing; the region ids (what is
// stored on the record) are the same on every figure.
import { createContext, useContext } from 'react';
import femaleImg from '../../../assets/derm/body-female.svg';
import maleImg from '../../../assets/derm/body-male.svg';
import childImg from '../../../assets/derm/body-child.webp';

export const FIGURES = [
  { id: 'female', label: 'Adult · female' },
  { id: 'male', label: 'Adult · male' },
  { id: 'child', label: 'Child' },
];
export const FIGURE_IMAGE = { female: femaleImg, male: maleImg, child: childImg };

/** Below this age (whole years) the child figure is used — under 4 (Emu, 10 Oct 2026; was 13). */
export const CHILD_UNDER_YEARS = 4;

const ageInYears = (patient) => {
  if (patient?.age !== undefined && patient?.age !== null && patient.age !== '' && !Number.isNaN(Number(patient.age))) return Number(patient.age);
  const dob = patient?.dateOfBirth || patient?.dob;
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a -= 1;
  return a;
};

/** The default figure for a patient: child under 4, else by recorded sex (male when not recorded). */
export const figureFor = (patient) => {
  const age = ageInYears(patient);
  if (age !== null && age < CHILD_UNDER_YEARS) return 'child';
  const sex = String(patient?.gender || patient?.sex || '').toLowerCase();
  return sex.startsWith('f') ? 'female' : 'male';
};

/** { figure } — null figure = the original in-house drawing. */
export const DermFigureContext = createContext({ figure: null, setFigure: null });
export const useDermFigure = () => useContext(DermFigureContext);
