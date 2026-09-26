import { useState, useRef } from 'react';
import { PenLine, Upload, RotateCcw, ImageOff } from 'lucide-react';
import Card from '../../shared/Card';
import Toggle from '../../shared/Toggle';
import Button from '../../shared/Button';
import { notify } from '../../../utils/notify';

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';
const MAX_LOGO_BYTES = 40 * 1024;

const FIELDS = [
  ['clinicName', 'Clinic name', 'Comprehensive Diabetes Centre'],
  ['address', 'Address', '3rd Floor, Doctors Park, Third Avenue, Nairobi'],
  ['phone', 'Phone(s)', '0711 781299'],
  ['email', 'Clinic email', 'info@yourclinic.com'],
  ['website', 'Website', 'yourclinic.com'],
];

/**
 * System Settings → Email → Clinic signature (Staff Email, phase 2).
 *
 * The clinic block the HMS adds under every staff member's own signature
 * lines on every email sent from My mail: logo, clinic name, address,
 * contacts, and an optional confidentiality note. The logo is embedded in
 * each message (shows without "load images"), so it is kept small (≤ 40 KB).
 */
const ClinicSignatureCard = ({ signature, saving, onSave }) => {
  const [form, setForm] = useState(() => ({
    clinicName: signature.clinicName || '',
    address: signature.address || '',
    phone: signature.phone || '',
    email: signature.email || '',
    website: signature.website || '',
    confidentialityOn: signature.confidentialityOn !== false,
    confidentialityText: signature.confidentialityText || '',
  }));
  const fileRef = useRef(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const dirty = Object.keys(form).some((k) => form[k] !== (k === 'confidentialityOn' ? signature.confidentialityOn !== false : (signature[k] || '')));

  const pickLogo = (file) => {
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type)) { notify('error', 'Use a PNG or JPEG image.'); return; }
    if (file.size > MAX_LOGO_BYTES) { notify('error', 'The logo must be at most 40 KB — it travels inside every email. Try a smaller PNG (about 160 × 160).'); return; }
    const reader = new FileReader();
    reader.onload = () => onSave({ signature: { logo: reader.result } }, 'Logo updated.');
    reader.readAsDataURL(file);
  };

  return (
    <Card>
      <div className="flex items-center gap-3 pb-4 border-b">
        <PenLine className="w-5 h-5 text-gray-700" />
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Clinic signature</h3>
          <p className="text-sm text-gray-500">Added under each person&apos;s own signature on every email sent from My mail. Each person sets their own name and title in their email settings.</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        {signature.logoDataUri ? (
          <img src={signature.logoDataUri} alt="Clinic logo" className="h-16 w-16 rounded border object-contain" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded border text-gray-400"><ImageOff className="h-6 w-6" /></div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={saving} className="!px-3 !py-1.5 text-sm"><Upload className="w-4 h-4" /> Replace logo</Button>
          {signature.logoSource !== 'default' && (
            <Button variant="outline" onClick={() => onSave({ signature: { logo: 'default' } }, 'Logo reset.')} disabled={saving} className="!px-3 !py-1.5 text-sm"><RotateCcw className="w-4 h-4" /> Use the standard logo</Button>
          )}
          {signature.logoSource !== 'none' && (
            <Button variant="outline" onClick={() => onSave({ signature: { logo: 'none' } }, 'Logo removed from the signature.')} disabled={saving} className="!px-3 !py-1.5 text-sm">No logo</Button>
          )}
        </div>
        <p className="w-full text-[11px] text-gray-400">PNG or JPEG, at most 40 KB. Shown at 64 × 64.</p>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { pickLogo(e.target.files?.[0]); e.target.value = ''; }} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {FIELDS.map(([k, label, placeholder]) => (
          <div key={k} className={k === 'address' ? 'sm:col-span-2' : ''}>
            <label htmlFor={`sig-${k}`} className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
            <input id={`sig-${k}`} value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} className={inputCls} />
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">Confidentiality note</p>
            <p className="text-xs text-gray-500">A short line under the signature about patient information.</p>
          </div>
          <Toggle checked={form.confidentialityOn} onChange={(v) => set('confidentialityOn', v)} label="Confidentiality note" />
        </div>
        {form.confidentialityOn && (
          <textarea
            rows={3} maxLength={600} value={form.confidentialityText} onChange={(e) => set('confidentialityText', e.target.value)}
            className={`${inputCls} mt-3`} aria-label="Confidentiality wording"
          />
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={() => onSave({ signature: form }, 'Clinic signature saved.')} disabled={saving || !dirty} className="!px-4 !py-2 text-sm">Save signature</Button>
      </div>
    </Card>
  );
};

export default ClinicSignatureCard;
