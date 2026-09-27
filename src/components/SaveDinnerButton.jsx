import { Check, Save } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Button from './Button';
import { useAuth } from '../context/AuthContext';
import { saveVotedMealToWeek } from '../services/weeklyMealService';

export default function SaveDinnerButton({ poll }) {
  const { user, firebaseConfigured } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSaving(false);
    setSaved(false);
    setError('');
  }, [poll?.id]);

  async function saveToWeek() {
    if (!user || !firebaseConfigured || !poll) return;
    setSaving(true);
    setError('');
    try {
      await saveVotedMealToWeek(user.uid, poll);
      setSaved(true);
    } catch (saveError) {
      setError(saveError.message || 'We could not save this dinner to your week.');
    } finally {
      setSaving(false);
    }
  }

  if (!user || !firebaseConfigured || !poll) return null;

  return (
    <div className="save-week">
      <Button className="save-week__button" onClick={saveToWeek} disabled={saving || saved}>
        {saved ? <Check size={18} aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
        {saving ? 'Saving…' : saved ? 'Saved to this week' : 'Save to this week'}
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
