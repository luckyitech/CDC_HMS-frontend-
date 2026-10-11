import { useEffect, useState } from 'react';
import { Calculator, X, BookOpen, ExternalLink, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import useCalcState from './useCalcState';
import { CALCULATOR_TABS, factsForTab, GUIDELINES_CHECKED } from '../../../constants/clinicalCalculators';
import { copyCalcBlocks } from '../../../utils/calcClipboard';
import BasicTab from './tabs/BasicTab';
import KidneyTab from './tabs/KidneyTab';
import InsulinTab from './tabs/InsulinTab';
import LiverTab from './tabs/LiverTab';
import CvRiskTab from './tabs/CvRiskTab';
import AfTab from './tabs/AfTab';
import ChestPainTab from './tabs/ChestPainTab';
import PregnancyTab from './tabs/PregnancyTab';

/**
 * ClinicalCalculator — the floating calculator on Today's Consultation (11 Oct 2026).
 *
 * A round button bottom-right of the working column opens a non-modal panel,
 * centred over the working column so the patient-summary dock stays readable.
 * Eight tabs (constants/clinicalCalculators.js), one shared set of inputs
 * (useCalcState — pre-filled from the file and today's triage), the maths in
 * utils/clinicalCalc.js. Nothing is stored: Copy puts the result on the
 * clipboard (bold result line + inputs + reference bands) for Ctrl+V / ⌘V
 * into the note. Notes shows each tab's facts; the full fact sheet opens in
 * a new tab (/doctor/calculator-facts).
 *
 * Props: patient — the open patient (age, gender, diagnosis, comorbidities, vitals).
 */
export const FACT_SHEET_PATH = '/doctor/calculator-facts';

const TABS = { basic: BasicTab, kidney: KidneyTab, insulin: InsulinTab, liver: LiverTab, cv: CvRiskTab, af: AfTab, chest: ChestPainTab, pregnancy: PregnancyTab };

const Panel = ({ patient, onClose }) => {
  const calc = useCalcState(patient);
  const [tab, setTab] = useState('kidney');
  const [notes, setNotes] = useState(false);
  const current = CALCULATOR_TABS.find((t) => t.id === tab);
  const Tab = TABS[tab];

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async (blocks) => {
    if (!blocks.length) return;
    const ok = await copyCalcBlocks(blocks);
    if (ok) toast.success('Copied — Ctrl+V or ⌘V in your note', { duration: 2200, position: 'top-right' });
    else toast.error('Could not copy — select the text and copy it instead', { duration: 3000, position: 'top-right' });
  };

  const facts = factsForTab(tab);
  const openFactSheet = () => window.open(`${FACT_SHEET_PATH}?c=${facts[0]?.id || ''}`, '_blank');

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center p-3 md:pl-[calc(18rem+0.75rem)] xl:pr-[calc(340px+2.75rem)]">
      <section role="dialog" aria-label="Calculator" className="pointer-events-auto flex max-h-[calc(100dvh-1.5rem)] w-[720px] max-w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
        <div className="flex items-center gap-2.5 px-4 pb-2 pt-3.5">
          <Calculator className="h-5 w-5 text-primary" aria-hidden="true" />
          <span className="text-[15px] font-bold text-gray-900">Calculator</span>
          <span className="truncate text-xs text-gray-500">{patient?.name} · {patient?.gender?.[0]} · {patient?.age} y{patient?.vitals?.recordedAt ? ` · latest vitals ${new Date(patient.vitals.recordedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ' · no vitals on file'}</span>
          <button type="button" onClick={onClose} aria-label="Close calculator" className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"><X className="h-4.5 w-4.5" /></button>
        </div>

        <div role="tablist" className="flex flex-wrap items-center gap-1 border-b border-gray-100 px-3 pb-2">
          {CALCULATOR_TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`h-8 rounded-lg px-2.5 text-[13px] font-semibold ${tab === t.id ? 'bg-blue-50 text-primary' : 'text-gray-600 hover:bg-gray-50'}`}>{t.label}</button>
          ))}
          <button type="button" onClick={() => setNotes((n) => !n)} aria-pressed={notes}
            className={`ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-semibold ${notes ? 'border-primary bg-primary text-white' : 'border-blue-200 bg-white text-primary'}`}>
            <BookOpen className="h-4 w-4" aria-hidden="true" />{notes ? 'Back to results' : 'Notes'}
          </button>
        </div>

        <div className="border-b border-gray-100 bg-slate-50 px-4 py-2 text-xs leading-snug text-gray-800">{current.description}</div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {notes ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-base font-bold text-gray-900">{current.label} — reading the results</span>
                <button type="button" onClick={openFactSheet} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-[12.5px] font-semibold text-white hover:bg-blue-700">
                  Open the full fact sheet <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              {facts.map((f) => (
                <div key={f.id} className="flex flex-col gap-2">
                  {facts.length > 1 && <div className="text-[13px] font-bold text-gray-900">{f.name}</div>}
                  <div className="grid grid-cols-1 gap-x-5 gap-y-3 md:grid-cols-2">
                    {f.headings.map((h) => (
                      <div key={h.title} className="flex flex-col gap-1.5">
                        <div className="text-[13px] font-bold text-primary">{h.title}</div>
                        <ul className="flex list-disc flex-col gap-1 pl-4">
                          {h.points.map((p) => <li key={p.summary} className="text-[12.5px] leading-snug text-gray-700">{p.summary}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-2 text-[11px] text-gray-500">Guidelines checked {GUIDELINES_CHECKED.on} · next check {GUIDELINES_CHECKED.next}. Sources are on the fact sheet.</div>
            </div>
          ) : <Tab {...calc} copy={copy} />}
        </div>

        <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-2 text-xs text-gray-500">
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Nothing here is saved. Copy, then Ctrl+V / ⌘V into your note — the result pastes in bold.
        </div>
      </section>
    </div>
  );
};

export default function ClinicalCalculator({ patient }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close calculator' : 'Open calculator'} aria-expanded={open}
        className={`fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg shadow-blue-900/30 transition hover:scale-105 xl:right-[calc(340px+3.5rem)] ${open ? 'bg-blue-900' : 'bg-primary'}`}>
        {open ? <X className="h-6 w-6" /> : <Calculator className="h-6 w-6" />}
      </button>
      {/* keyed on the patient: a change of patient starts afresh */}
      {open && <Panel key={patient?.uhid || patient?.id} patient={patient} onClose={() => setOpen(false)} />}
    </>
  );
}
