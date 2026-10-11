import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import { CALCULATOR_FACTS, factById, factGroups, GUIDELINES_CHECKED } from '../../constants/clinicalCalculators';

/**
 * CalculatorFacts — the calculator Notes explained in full (11 Oct 2026).
 *
 * Opens in a new tab from the calculator's Notes (?c=<calculator id>). Left:
 * every calculator, grouped. Right: its description, how it is calculated,
 * then each heading's points — the short line the pop-up shows, the detail,
 * and the references with their journal links. Read-only: the content is the
 * registry in constants/clinicalCalculators.js, reviewed at the yearly
 * guideline check.
 */
export default function CalculatorFacts() {
  const [params, setParams] = useSearchParams();
  const fact = factById(params.get('c')) || CALCULATOR_FACTS[0];
  useEffect(() => { document.title = `${fact.name} — Calculator fact sheet`; return () => { document.title = 'CDC HMS'; }; }, [fact]);

  return (
    <div className="pb-8">
      <PageHeader title="Calculator fact sheet" subtitle={`The calculator Notes, explained in full — with the evidence. Guidelines checked ${GUIDELINES_CHECKED.on} · next check ${GUIDELINES_CHECKED.next}.`} />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <nav aria-label="Calculators" className="flex w-full shrink-0 flex-col gap-0.5 rounded-xl border border-gray-200 bg-white p-2 lg:sticky lg:top-4 lg:w-[270px]">
          {factGroups().map((g) => (
            <div key={g.title} className="flex flex-col gap-0.5">
              <div className="px-2.5 pb-1 pt-2.5 text-[10.5px] font-bold uppercase tracking-wider text-gray-500">{g.title}</div>
              {g.items.map((f) => (
                <button key={f.id} type="button" onClick={() => setParams({ c: f.id })} aria-current={f.id === fact.id ? 'page' : undefined}
                  className={`rounded-lg px-2.5 py-1.5 text-left text-[13.5px] leading-snug ${f.id === fact.id ? 'bg-blue-50 font-bold text-primary' : 'text-gray-700 hover:bg-gray-50'}`}>
                  {f.name}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <main className="flex min-w-0 max-w-[880px] flex-1 flex-col gap-4">
          <div>
            <div className="text-xs font-bold tracking-wider text-primary">{fact.group.toUpperCase()}</div>
            <h3 className="mt-1 text-2xl font-bold leading-tight text-gray-900">{fact.name}</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed text-gray-700">{fact.description}</p>
          </div>

          <section className="rounded-xl border border-gray-200 bg-white px-5 py-4">
            <h4 className="text-[15px] font-bold text-gray-900">How it is calculated</h4>
            <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 px-3 py-2.5 font-mono text-[13px] leading-relaxed text-gray-800">{fact.formula}</pre>
          </section>

          {fact.headings.map((h) => (
            <section key={h.title} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4">
              <h4 className="text-base font-bold text-primary">{h.title}</h4>
              {h.points.map((p) => (
                <div key={p.summary} className="flex flex-col gap-1.5 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="text-[14.5px] font-bold leading-snug text-gray-900">{p.summary}</div>
                  {p.detail
                    ? <p className="text-sm leading-relaxed text-gray-700">{p.detail}</p>
                    : <p className="text-[13px] italic text-gray-400">Detail to be added at the next guideline check.</p>}
                  {p.refs.map((r) => (
                    <div key={r.citation} className="flex flex-wrap items-baseline gap-2 text-[12.5px] text-gray-600">
                      <span className="text-gray-400">Ref</span>
                      <span>{r.citation}</span>
                      {r.url
                        ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 whitespace-nowrap font-semibold text-primary">Open journal <ExternalLink className="h-3 w-3" aria-hidden="true" /></a>
                        : <span className="ml-auto whitespace-nowrap rounded bg-amber-50 px-1.5 py-px text-[11px] font-semibold text-amber-800">Journal link to add</span>}
                    </div>
                  ))}
                </div>
              ))}
            </section>
          ))}
          <p className="text-xs text-gray-500">Content reviewed against current guidelines on {GUIDELINES_CHECKED.on} · next yearly check {GUIDELINES_CHECKED.next}.</p>
        </main>
      </div>
    </div>
  );
}
