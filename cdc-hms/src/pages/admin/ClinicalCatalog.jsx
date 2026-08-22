import { useState, useEffect, useMemo } from 'react';
import { Pill, Stethoscope, Pencil, Trash2, Search, ListPlus, Plus, FlaskConical, Package as PackageIcon, X } from 'lucide-react';
import Card from '../../components/shared/Card';
import PageHeader from '../../components/shared/PageHeader';
import SwitcherTabs from '../../components/shared/SwitcherTabs';
import Button from '../../components/shared/Button';
import Modal from '../../components/shared/Modal';
import ConfirmActionModal from '../../components/shared/ConfirmActionModal';
import Pagination from '../../components/shared/Pagination';
import useDebounce from '../../hooks/useDebounce';
import catalogService from '../../services/catalogService';
import labPackageService from '../../services/labPackageService';
import { notify } from '../../utils/notify';

const ITEMS_PER_PAGE = 25;

// One entry per catalog — the manager below is fully generic, so adding a
// future catalog (e.g. lab test names) is a config entry + backend enum value.
const CATALOG_TABS = [
  {
    type: 'medication',
    label: 'Medications',
    icon: <Pill className="w-4 h-4" />,
    detailLabel: 'Default dosage (optional)',
    detailPlaceholder: 'e.g. 500 mg tablet',
    hint: 'These names appear as suggestions when a doctor types a medication on a prescription.',
    externalLabel: 'External API (RxNorm)',
    // Clinical class → which tool the drug shows in. Mirrors the backend
    // constants/drugClasses.js; '' means "general, no tool".
    drugClasses: [
      { value: '', label: 'General (no clinical tool)' },
      { value: 'glp1', label: 'GLP-1 / GIP agonist' },
    ],
  },
  {
    type: 'diagnosis',
    label: 'Diagnoses',
    icon: <Stethoscope className="w-4 h-4" />,
    detailLabel: 'Code (optional)',
    detailPlaceholder: 'e.g. E11',
    hint: 'These appear as suggestions when a doctor adds a diagnosis on a treatment plan.',
    externalLabel: 'External API (ICD-10)',
  },
  {
    type: 'labTest',
    label: 'Lab tests',
    icon: <FlaskConical className="w-4 h-4" />,
    detailLabel: 'Sample type (optional)',
    detailPlaceholder: 'e.g. Blood',
    hint: 'The lab tests doctors and nurses can request. Set a price, and tick "Common" to show a test as a quick-pick card in the request form (everything else is reached via search). No external source — this list is always your clinic catalogue.',
    // no externalLabel → the request form always reads the catalogue directly.
    isLab: true,
  },
];

const inputCls = 'px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary';

// Manages one catalog type: list, search, add, bulk add, edit, delete,
// and which source doctors' suggestions come from.
const CatalogManager = ({ config }) => {
  const { type, label, detailLabel, detailPlaceholder, hint, externalLabel, drugClasses, isLab } = config;

  // value → label for the drug-class badge/dropdown (only the real classes,
  // not the "General" placeholder)
  const drugClassLabel = (value) =>
    drugClasses?.find((c) => c.value && c.value === value)?.label || null;

  const [items, setItems] = useState(null); // null = loading
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  const [filter, setFilter] = useState('');
  const debouncedFilter = useDebounce(filter);
  const [currentPage, setCurrentPage] = useState(1);

  const [newName, setNewName] = useState('');
  const [newDetail, setNewDetail] = useState('');
  const [newDrugClass, setNewDrugClass] = useState('');
  const [newPrice, setNewPrice] = useState('');       // labTest only
  const [newCommon, setNewCommon] = useState(false);  // labTest only
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [editing, setEditing] = useState(null);   // item being edited
  const [deleting, setDeleting] = useState(null); // item pending delete confirm
  const [source, setSource] = useState(null);     // 'catalog' | 'external'

  useEffect(() => {
    let cancelled = false;
    catalogService.getSources().then((sources) => {
      if (!cancelled) setSource(sources[type] || 'external');
    });
    return () => { cancelled = true; };
  }, [type]);

  const handleSourceChange = async (next) => {
    if (next === source) return;
    try {
      const res = await catalogService.setSource(type, next);
      if (res.success) {
        catalogService.clearSourcesCache();
        setSource(next);
        notify('success', next === 'catalog'
          ? `Doctors now get ${label.toLowerCase()} suggestions from your clinic list`
          : `Doctors now get ${label.toLowerCase()} suggestions from the external API`);
      }
    } catch (err) {
      notify('error', err.message || 'Failed to change the suggestion source');
    }
  };

  useEffect(() => {
    let cancelled = false;
    catalogService.listAll(type)
      .then((res) => { if (!cancelled && res.success) setItems(res.data.items); })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          notify('error', 'Failed to load the catalog');
        }
      });
    return () => { cancelled = true; };
  }, [type, reloadKey]);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = debouncedFilter.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) => i.name.toLowerCase().includes(q) || (i.detail || '').toLowerCase().includes(q)
    );
  }, [items, debouncedFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleAdd = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    try {
      const res = await catalogService.create(type, {
        name,
        detail: newDetail.trim() || undefined,
        ...(drugClasses ? { drugClass: newDrugClass || null } : {}),
        ...(isLab ? { price: newPrice === '' ? null : Number(newPrice), isCommon: newCommon } : {}),
      });
      if (res.success) {
        notify('success', `'${name}' added`);
        setNewName('');
        setNewDetail('');
        setNewDrugClass('');
        setNewPrice('');
        setNewCommon(false);
        reload();
      }
    } catch (err) {
      notify('error', err.message || 'Failed to add entry');
    }
  };

  const handleBulkAdd = async () => {
    const names = bulkText.split('\n').map((s) => s.trim()).filter(Boolean);
    if (names.length === 0) return;
    try {
      const res = await catalogService.bulkCreate(type, names);
      if (res.success) {
        const { added, skippedExisting } = res.data;
        notify('success', `Added ${added} entr${added === 1 ? 'y' : 'ies'}${skippedExisting ? ` — ${skippedExisting} already in the list` : ''}`);
        setBulkOpen(false);
        setBulkText('');
        reload();
      }
    } catch (err) {
      notify('error', err.message || 'Bulk add failed');
    }
  };

  const handleSaveEdit = async () => {
    const name = editing.name.trim();
    if (!name) { notify('error', 'Name cannot be empty'); return; }
    try {
      const res = await catalogService.update(type, editing.id, {
        name,
        detail: editing.detail?.trim() || '',
        ...(drugClasses ? { drugClass: editing.drugClass || null } : {}),
        ...(isLab ? { price: editing.price === '' || editing.price == null ? null : Number(editing.price), isCommon: !!editing.isCommon } : {}),
      });
      if (res.success) {
        notify('success', 'Entry updated');
        setEditing(null);
        reload();
      }
    } catch (err) {
      notify('error', err.message || 'Failed to update entry');
    }
  };

  const handleDelete = async () => {
    const item = deleting;
    setDeleting(null);
    try {
      const res = await catalogService.delete(type, item.id);
      if (res.success) {
        notify('success', `'${item.name}' removed`);
        reload();
      }
    } catch (err) {
      notify('error', err.message || 'Failed to remove entry');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">{hint}</p>

      {/* Suggestion source — external until the clinic list is ready. Not shown
          for lab tests: that list is always the clinic catalogue. */}
      {externalLabel && (
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-800">Where do doctors' suggestions come from?</p>
            <p className="text-sm text-gray-500">
              Keep the external API while you build your own list below, then switch. Doctors see the change on their next page load.
            </p>
          </div>
          <SwitcherTabs
            active={source}
            onChange={handleSourceChange}
            tabs={[
              { id: 'external', label: externalLabel, disabled: source === null },
              { id: 'catalog', label: 'Clinic Catalog', disabled: source === null },
            ]}
          />
        </div>
      </Card>
      )}

      {/* Add one + bulk add */}
      <Card>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={`Add a ${label.slice(0, -1).toLowerCase()} name...`}
            className={`${inputCls} flex-1`}
          />
          <input
            type="text"
            value={newDetail}
            onChange={(e) => setNewDetail(e.target.value)}
            placeholder={detailPlaceholder}
            title={detailLabel}
            className={`${inputCls} sm:w-48`}
          />
          {drugClasses && (
            <select
              value={newDrugClass}
              onChange={(e) => setNewDrugClass(e.target.value)}
              title="Clinical class — controls which tool this drug appears in"
              className={`${inputCls} sm:w-56`}
            >
              {drugClasses.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          )}
          {isLab && (
            <>
              <input
                type="number"
                min="0"
                step="1"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Price (KES)"
                title="Price"
                className={`${inputCls} sm:w-32`}
              />
              <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap px-1" title="Show as a quick-pick card in the request form">
                <input type="checkbox" checked={newCommon} onChange={(e) => setNewCommon(e.target.checked)} className="w-4 h-4 accent-primary" />
                Common
              </label>
            </>
          )}
          <Button type="submit" disabled={!newName.trim()} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add
          </Button>
          <Button type="button" variant="outline" onClick={() => setBulkOpen(true)} className="flex items-center gap-2">
            <ListPlus className="w-4 h-4" /> Add Many
          </Button>
        </form>
      </Card>

      {/* Search + list */}
      <Card>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }}
            placeholder={`Search ${filtered.length ? `${filtered.length} ` : ''}entries...`}
            className={`${inputCls} w-full pl-9`}
          />
        </div>

        {items === null ? (
          <div className="text-center py-10">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-10 text-gray-500">
            {items.length === 0
              ? `No ${label.toLowerCase()} yet — add them above (or use Add Many to paste a whole list).`
              : 'No entries match your search.'}
          </p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 border-b">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">{detailLabel.replace(' (optional)', '')}</th>
                  {isLab && <th className="px-4 py-3 font-semibold text-right">Price</th>}
                  {isLab && <th className="px-4 py-3 font-semibold text-center">Common</th>}
                  <th className="px-4 py-3 font-semibold">Added By</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.name}
                        {drugClassLabel(item.drugClass) && (
                          <span className="px-2 py-0.5 rounded-full bg-primary-50 text-primary text-xs font-medium">
                            {drugClassLabel(item.drugClass)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.detail || '—'}</td>
                    {isLab && <td className="px-4 py-3 text-gray-700 text-right">{item.price != null ? `KES ${Number(item.price).toLocaleString()}` : '—'}</td>}
                    {isLab && <td className="px-4 py-3 text-center">{item.isCommon ? <span className="text-green-600 font-semibold">✓</span> : <span className="text-gray-300">—</span>}</td>}
                    <td className="px-4 py-3 text-gray-500">{item.addedBy || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditing({ ...item })}
                          title="Edit"
                          className="text-gray-400 hover:text-blue-600 transition"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(item)}
                          title="Remove"
                          className="text-gray-400 hover:text-red-600 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        )}
      </Card>

      {/* Bulk add modal */}
      {bulkOpen && (
        <Modal isOpen={true} onClose={() => setBulkOpen(false)} title={`Add Many ${label}`}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Paste or type one name per line. Blanks and names already in the list are skipped.
            </p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={10}
              placeholder={'Metformin\nGliclazide\nInsulin Glargine\n...'}
              className={`${inputCls} w-full font-mono`}
            />
            <div className="flex gap-3">
              <Button onClick={handleBulkAdd} disabled={!bulkText.trim()} className="flex-1">
                Add All
              </Button>
              <Button variant="outline" onClick={() => setBulkOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit modal */}
      {editing && (
        <Modal isOpen={true} onClose={() => setEditing(null)} title="Edit Entry">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className={`${inputCls} w-full`}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{detailLabel}</label>
              <input
                type="text"
                value={editing.detail || ''}
                onChange={(e) => setEditing({ ...editing, detail: e.target.value })}
                placeholder={detailPlaceholder}
                className={`${inputCls} w-full`}
              />
            </div>
            {drugClasses && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Clinical class
                </label>
                <select
                  value={editing.drugClass || ''}
                  onChange={(e) => setEditing({ ...editing, drugClass: e.target.value })}
                  className={`${inputCls} w-full`}
                >
                  {drugClasses.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Controls which clinical tool this drug appears in (e.g. the GLP-1 monitoring tool).
                </p>
              </div>
            )}
            {isLab && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Price (KES)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editing.price ?? ''}
                    onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                    className={`${inputCls} w-full`}
                  />
                </div>
                <label className="flex items-end gap-2 text-sm text-gray-700 pb-2">
                  <input
                    type="checkbox"
                    checked={!!editing.isCommon}
                    onChange={(e) => setEditing({ ...editing, isCommon: e.target.checked })}
                    className="w-4 h-4 accent-primary mb-0.5"
                  />
                  Common (quick-pick card)
                </label>
              </div>
            )}
            <div className="flex gap-3">
              <Button onClick={handleSaveEdit} className="flex-1">Save</Button>
              <Button variant="outline" onClick={() => setEditing(null)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirmation */}
      <ConfirmActionModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Remove Entry"
        message={deleting ? `Remove "${deleting.name}" from the ${label.toLowerCase()} list? Doctors will no longer see it as a suggestion. Existing prescriptions and plans are not affected.` : ''}
        confirmLabel="Remove"
        confirmVariant="danger"
      />
    </div>
  );
};

// ── Lab packages (bundles) ──────────────────────────────────────────────────
// Admin creates named bundles of lab tests, priced as the sum of members or a
// special rate, and flags which show as cards in the request form.
const LabPackageManager = () => {
  const [packages, setPackages] = useState(null);
  const [tests, setTests] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);
  const [editing, setEditing] = useState(null);   // package draft
  const [deleting, setDeleting] = useState(null);
  const [testQuery, setTestQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    labPackageService.list({ all: 1 })
      .then((res) => { if (!cancelled && res.success) setPackages(res.data.packages || []); })
      .catch(() => { if (!cancelled) { setPackages([]); notify('error', 'Failed to load packages'); } });
    return () => { cancelled = true; };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    catalogService.listAll('labTest')
      .then((res) => { if (!cancelled && res.success) setTests(res.data.items || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const openNew = () => setEditing({ name: '', priceMode: 'sum', fixedPrice: '', isCommon: true, testIds: [] });
  const openEdit = (p) => setEditing({
    id: p.id, name: p.name, priceMode: p.priceMode, fixedPrice: p.fixedPrice ?? '',
    isCommon: p.isCommon, testIds: p.tests.map((t) => t.id),
  });

  const toggleTest = (id) => setEditing((e) => ({
    ...e,
    testIds: e.testIds.includes(id) ? e.testIds.filter((x) => x !== id) : [...e.testIds, id],
  }));

  const selectedSum = useMemo(() => {
    if (!editing) return 0;
    return tests.filter((t) => editing.testIds.includes(t.id))
      .reduce((s, t) => s + (t.price != null ? Number(t.price) : 0), 0);
  }, [editing, tests]);

  const save = async () => {
    const name = (editing.name || '').trim();
    if (!name) { notify('error', 'Package name is required'); return; }
    if (editing.testIds.length === 0) { notify('error', 'Add at least one test'); return; }
    if (editing.priceMode === 'fixed' && (editing.fixedPrice === '' || Number(editing.fixedPrice) < 0)) {
      notify('error', 'Enter a valid special rate'); return;
    }
    const payload = {
      name,
      priceMode: editing.priceMode,
      fixedPrice: editing.priceMode === 'fixed' ? Number(editing.fixedPrice) : null,
      isCommon: !!editing.isCommon,
      testIds: editing.testIds,
    };
    try {
      const res = editing.id
        ? await labPackageService.update(editing.id, payload)
        : await labPackageService.create(payload);
      if (res.success) { notify('success', editing.id ? 'Package updated' : 'Package created'); setEditing(null); reload(); }
      else notify('error', res.message || 'Failed to save package');
    } catch (err) { notify('error', err.message || 'Failed to save package'); }
  };

  const handleDelete = async () => {
    const p = deleting; setDeleting(null);
    try {
      const res = await labPackageService.delete(p.id);
      if (res.success) { notify('success', `'${p.name}' removed`); reload(); }
    } catch (err) { notify('error', err.message || 'Failed to remove package'); }
  };

  const filteredTests = useMemo(() => {
    const q = testQuery.trim().toLowerCase();
    return q ? tests.filter((t) => t.name.toLowerCase().includes(q)) : tests;
  }, [tests, testQuery]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Bundles of tests the clinic commonly orders together (e.g. "Annual Diabetes Check-up"). Price them as the sum of the tests or a special rate. Flag "Common" to show a package as a card in the request form.
      </p>

      <div className="flex justify-end">
        <Button onClick={openNew} className="flex items-center gap-2"><Plus className="w-4 h-4" /> New package</Button>
      </div>

      <Card>
        {packages === null ? (
          <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" /></div>
        ) : packages.length === 0 ? (
          <p className="text-center py-10 text-gray-500">No packages yet — create one above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-gray-500 border-b">
                <th className="px-4 py-3 font-semibold">Package</th>
                <th className="px-4 py-3 font-semibold">Tests</th>
                <th className="px-4 py-3 font-semibold">Pricing</th>
                <th className="px-4 py-3 font-semibold text-right">Price</th>
                <th className="px-4 py-3 font-semibold text-center">Common</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {packages.map((p) => (
                <tr key={p.id} className="hover:bg-blue-50">
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    {p.name}
                    {p.status === 'archived' && <span className="ml-2 text-xs text-gray-400">(archived)</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.tests.map((t) => t.name).join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.priceMode === 'fixed' ? 'Special rate' : 'Sum of tests'}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{p.price != null ? `KES ${Number(p.price).toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-center">{p.isCommon ? <span className="text-green-600 font-semibold">✓</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(p)} title="Edit" className="text-gray-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setDeleting(p)} title="Remove" className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Package editor */}
      {editing && (
        <Modal isOpen={true} onClose={() => setEditing(null)} title={editing.id ? 'Edit package' : 'New package'}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Package name</label>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. Annual Diabetes Check-up"
                className={`${inputCls} w-full`}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Tests in this package</label>
              {editing.testIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tests.filter((t) => editing.testIds.includes(t.id)).map((t) => (
                    <span key={t.id} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold">
                      {t.name}
                      <button onClick={() => toggleTest(t.id)}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={testQuery} onChange={(e) => setTestQuery(e.target.value)} placeholder="Search tests to add…" className={`${inputCls} w-full pl-9`} />
              </div>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {filteredTests.length === 0 ? (
                  <p className="text-sm text-gray-400 p-3">No lab tests in the catalogue yet — add them on the Lab tests tab.</p>
                ) : filteredTests.map((t) => (
                  <label key={t.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer">
                    <span className="flex items-center gap-2">
                      <input type="checkbox" checked={editing.testIds.includes(t.id)} onChange={() => toggleTest(t.id)} className="w-4 h-4 accent-primary" />
                      <span className="font-medium text-gray-800">{t.name}</span>
                      <span className="text-xs text-gray-400">{t.detail || ''}</span>
                    </span>
                    {t.price != null && <span className="text-xs text-gray-500">KES {Number(t.price).toLocaleString()}</span>}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Price</label>
              <label className="flex items-center gap-2 text-sm mb-1.5">
                <input type="radio" checked={editing.priceMode === 'sum'} onChange={() => setEditing({ ...editing, priceMode: 'sum' })} className="accent-primary" />
                Sum of the tests <span className="text-gray-400">(KES {selectedSum.toLocaleString()})</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={editing.priceMode === 'fixed'} onChange={() => setEditing({ ...editing, priceMode: 'fixed' })} className="accent-primary" />
                Special rate
                <input
                  type="number" min="0" step="1"
                  value={editing.fixedPrice}
                  onChange={(e) => setEditing({ ...editing, fixedPrice: e.target.value, priceMode: 'fixed' })}
                  placeholder="KES"
                  className={`${inputCls} w-28 ml-1`}
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={editing.isCommon} onChange={(e) => setEditing({ ...editing, isCommon: e.target.checked })} className="w-4 h-4 accent-primary" />
              Show as a card in the request form (common)
            </label>

            <div className="flex gap-3">
              <Button onClick={save} className="flex-1">{editing.id ? 'Save package' : 'Create package'}</Button>
              <Button variant="outline" onClick={() => setEditing(null)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmActionModal
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Remove package"
        message={deleting ? `Remove the "${deleting.name}" package? Existing lab requests are unaffected.` : ''}
        confirmLabel="Remove"
        confirmVariant="danger"
      />
    </div>
  );
};

const ClinicalCatalog = () => {
  const [activeType, setActiveType] = useState(CATALOG_TABS[0].type);
  // Packages are a sub-view of the Lab tests catalogue (Tests | Packages).
  const [labTab, setLabTab] = useState('tests');
  const activeTab = CATALOG_TABS.find((t) => t.type === activeType);

  return (
    <div>
      <PageHeader
        title="Clinical Catalog"
        subtitle="Manage the medication, diagnosis and lab-test lists doctors and nurses see across the system"
      />

      <SwitcherTabs
        className="mb-6"
        active={activeType}
        onChange={setActiveType}
        tabs={CATALOG_TABS.map((tab) => ({ id: tab.type, label: <>{tab.icon}{tab.label}</> }))}
      />

      {/* Lab tests carries its own Tests | Packages sub-switcher; other catalogs
          render their manager directly. key remounts so state never leaks. */}
      {activeType === 'labTest' ? (
        <>
          <SwitcherTabs
            className="mb-4"
            active={labTab}
            onChange={setLabTab}
            tabs={[
              { id: 'tests', label: <><FlaskConical className="w-4 h-4" />Tests</> },
              { id: 'packages', label: <><PackageIcon className="w-4 h-4" />Packages</> },
            ]}
          />
          {labTab === 'tests'
            ? <CatalogManager key="labTest" config={activeTab} />
            : <LabPackageManager />}
        </>
      ) : (
        <CatalogManager key={activeType} config={activeTab} />
      )}
    </div>
  );
};

export default ClinicalCatalog;
