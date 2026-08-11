import { useState, useEffect, useMemo } from 'react';
import { Pill, Stethoscope, Pencil, Trash2, Search, ListPlus, Plus } from 'lucide-react';
import Card from '../../components/shared/Card';
import PageHeader from '../../components/shared/PageHeader';
import Button from '../../components/shared/Button';
import Modal from '../../components/shared/Modal';
import ConfirmActionModal from '../../components/shared/ConfirmActionModal';
import Pagination from '../../components/shared/Pagination';
import useDebounce from '../../hooks/useDebounce';
import catalogService from '../../services/catalogService';
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
];

const inputCls = 'px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary';

// Manages one catalog type: list, search, add, bulk add, edit, delete,
// and which source doctors' suggestions come from.
const CatalogManager = ({ config }) => {
  const { type, label, detailLabel, detailPlaceholder, hint, externalLabel, drugClasses } = config;

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
      });
      if (res.success) {
        notify('success', `'${name}' added`);
        setNewName('');
        setNewDetail('');
        setNewDrugClass('');
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

      {/* Suggestion source — external until the clinic list is ready */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-800">Where do doctors' suggestions come from?</p>
            <p className="text-sm text-gray-500">
              Keep the external API while you build your own list below, then switch. Doctors see the change on their next page load.
            </p>
          </div>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            {[
              { value: 'external', text: externalLabel },
              { value: 'catalog', text: 'Clinic Catalog' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSourceChange(opt.value)}
                disabled={source === null}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  source === opt.value ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {opt.text}
              </button>
            ))}
          </div>
        </div>
      </Card>

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
                  <th className="px-4 py-3 font-semibold">Added By</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
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

const ClinicalCatalog = () => {
  const [activeType, setActiveType] = useState(CATALOG_TABS[0].type);
  const activeTab = CATALOG_TABS.find((t) => t.type === activeType);

  return (
    <div>
      <PageHeader
        title="Clinical Catalog"
        subtitle="Manage the medication and diagnosis lists doctors see when writing prescriptions and treatment plans"
      />

      {/* Catalog switcher — same pattern as the Create Users tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-lg mb-6 w-fit">
        {CATALOG_TABS.map((tab) => (
          <button
            key={tab.type}
            type="button"
            onClick={() => setActiveType(tab.type)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              activeType === tab.type ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* key remounts the manager so state never leaks between catalogs */}
      <CatalogManager key={activeType} config={activeTab} />
    </div>
  );
};

export default ClinicalCatalog;
