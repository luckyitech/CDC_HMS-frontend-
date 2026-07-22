import { Key, AlertTriangle } from 'lucide-react';
import Card from '../Card';
import CardTitle from '../CardTitle';
import Input from '../Input';

// Shared "Account Settings" section for user-creation forms.
// data: the form state object; onChange: (field, value) => void
// onGeneratePassword: fills a random temporary password
// roleNoun: used in the note, e.g. "doctor", "staff member", "lab technician"
const AccountSettingsSection = ({ data, onChange, onGeneratePassword, roleNoun = 'user' }) => (
  <Card title={<CardTitle icon={Key}>Account Settings</CardTitle>} className="mb-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* TODO: Username field — backend does not support username yet (auth is by email).
          Uncomment and wire up once username support is added to the User model. */}

      <div>
        <Input
          label="Temporary Password *"
          type="text"
          value={data.temporaryPassword}
          onChange={(e) => onChange('temporaryPassword', e.target.value)}
          placeholder="Temporary password"
          required
        />
        <button
          type="button"
          onClick={onGeneratePassword}
          className="mt-2 text-xs text-primary hover:underline"
        >
          Generate secure password
        </button>
      </div>

      <div className="md:col-span-2 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
        <p className="text-sm text-gray-700">
          <AlertTriangle className="w-4 h-4 inline mr-1 -mt-0.5" /><strong>Note:</strong> The temporary password will be sent to the {roleNoun}'s email.
          They will be required to change it upon first login.
        </p>
      </div>
    </div>
  </Card>
);

export default AccountSettingsSection;
