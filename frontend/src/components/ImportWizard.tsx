import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Upload, FileSpreadsheet, ClipboardList, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ImportWizardProps {
  campaignId: number;
  onImportComplete: () => void;
}

type TabType = 'csv' | 'paste' | 'manual';

export const ImportWizard: React.FC<ImportWizardProps> = ({ campaignId, onImportComplete }) => {
  const [activeTab, setActiveTab] = useState<TabType>('csv');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  // Paste import state
  const [pasteText, setPasteText] = useState('');

  // Results status
  const [statusMsg, setStatusMsg] = useState<{
    type: 'success' | 'error';
    text: string;
    details?: { imported: number; duplicates: number; skipped?: number; errors?: number };
  } | null>(null);

  // Manual form integration
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      title: '',
      company: '',
      phone: '',
      linkedin: '',
      country: ''
    }
  });

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setStatusMsg(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
    }
  };

  // CSV Import submission
  const handleCsvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;

    setIsSubmitting(true);
    setStatusMsg(null);

    const formData = new FormData();
    formData.append('file', csvFile);
    formData.append('campaignId', campaignId.toString());

    try {
      const response = await fetch('/api/contacts/import-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to import CSV');

      setStatusMsg({
        type: 'success',
        text: 'CSV imported successfully.',
        details: {
          imported: data.imported,
          duplicates: data.duplicates,
          skipped: data.skipped,
        }
      });
      setCsvFile(null);
      onImportComplete();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error occurred during CSV upload.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Paste list import submission
  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim()) return;

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const response = await fetch('/api/contacts/import-paste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailsText: pasteText,
          campaignId: campaignId
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to import email list');

      setStatusMsg({
        type: 'success',
        text: 'Email list imported successfully.',
        details: {
          imported: data.imported,
          duplicates: data.duplicates,
          errors: data.errors,
        }
      });
      setPasteText('');
      onImportComplete();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error occurred during paste import.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual entry submission
  const onSubmitManual = async (formData: any) => {
    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const response = await fetch('/api/contacts/import-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          ...formData
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add contact');

      setStatusMsg({
        type: 'success',
        text: `Successfully added ${data.email}.`,
        details: {
          imported: 1,
          duplicates: data.duplicateStatus ? 1 : 0,
        }
      });
      reset();
      onImportComplete();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error adding contact manually.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-zinc-900/40 border border-neutral-800 rounded-xl overflow-hidden">
      {/* Tabs list */}
      <div className="flex border-b border-neutral-800 bg-zinc-950/40">
        <button
          onClick={() => handleTabChange('csv')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b ${
            activeTab === 'csv'
              ? 'border-neutral-200 text-neutral-200 bg-neutral-900/20'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          CSV File Upload
        </button>
        <button
          onClick={() => handleTabChange('paste')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b ${
            activeTab === 'paste'
              ? 'border-neutral-200 text-neutral-200 bg-neutral-900/20'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Paste Email List
        </button>
        <button
          onClick={() => handleTabChange('manual')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b ${
            activeTab === 'manual'
              ? 'border-neutral-200 text-neutral-200 bg-neutral-900/20'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Manual Entry
        </button>
      </div>

      <div className="p-6">
        {/* Results Toast Alerts */}
        {statusMsg && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-start gap-3 border text-xs leading-relaxed ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <div className="flex-1">
              <span className="font-semibold">{statusMsg.text}</span>
              {statusMsg.details && (
                <div className="mt-2 grid grid-cols-3 gap-4 border-t border-neutral-800/50 pt-2 font-medium text-[10px] text-neutral-400 uppercase tracking-wider">
                  <div>Added: <span className="text-neutral-200 font-bold">{statusMsg.details.imported}</span></div>
                  <div>Duplicates: <span className="text-neutral-200 font-bold">{statusMsg.details.duplicates}</span></div>
                  {statusMsg.details.skipped !== undefined && (
                    <div>Skipped / Filtered: <span className="text-neutral-200 font-bold">{statusMsg.details.skipped}</span></div>
                  )}
                  {statusMsg.details.errors !== undefined && (
                    <div>Errors: <span className="text-neutral-200 font-bold">{statusMsg.details.errors}</span></div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CSV File Upload Form */}
        {activeTab === 'csv' && (
          <form onSubmit={handleCsvSubmit} className="space-y-4">
            <div className="border border-dashed border-neutral-700 hover:border-neutral-500 rounded-lg p-8 flex flex-col items-center justify-center gap-3 bg-zinc-950/20 cursor-pointer relative group transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                required
              />
              <Upload className="w-8 h-8 text-neutral-400 group-hover:text-neutral-300 transition-colors" />
              <div className="text-center">
                <p className="text-xs font-medium text-neutral-200">
                  {csvFile ? csvFile.name : 'Click or drag CSV file to upload'}
                </p>
                <p className="text-[10px] text-neutral-400 mt-1">
                  Supported columns: First Name, Last Name, Company, Title, Active Email, Phone, LinkedIn, Country
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !csvFile}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-zinc-950 font-semibold rounded-md text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Importing CSV...' : 'Start Import'}
              </button>
            </div>
          </form>
        )}

        {/* Paste Email List Form */}
        {activeTab === 'paste' && (
          <form onSubmit={handlePasteSubmit} className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                Recruiter Emails
              </label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="hr@company.com&#10;jobs@company.com&#10;careers@company.com, engineering@company.com"
                rows={5}
                className="w-full rounded-md border border-neutral-800 bg-zinc-950/40 p-3 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
                required
              />
              <span className="text-[10px] text-neutral-500">
                You can separate emails using newlines, commas, semicolons or spaces.
              </span>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !pasteText.trim()}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-zinc-950 font-semibold rounded-md text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Importing...' : 'Import Emails'}
              </button>
            </div>
          </form>
        )}

        {/* Manual entry Form */}
        {activeTab === 'manual' && (
          <form onSubmit={handleSubmit(onSubmitManual)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                  Active Email *
                </label>
                <input
                  type="email"
                  {...register('email', { required: 'Email address is required' })}
                  className="rounded-md border border-neutral-800 bg-zinc-950/40 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-neutral-700"
                />
                {errors.email && <span className="text-[10px] text-rose-400">{errors.email.message}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                  Company Name
                </label>
                <input
                  type="text"
                  {...register('company')}
                  className="rounded-md border border-neutral-800 bg-zinc-950/40 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-neutral-700"
                />
              </div>

              <div className="flex grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                    First Name
                  </label>
                  <input
                    type="text"
                    {...register('firstName')}
                    className="w-full rounded-md border border-neutral-800 bg-zinc-950/40 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-neutral-700"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                    Last Name
                  </label>
                  <input
                    type="text"
                    {...register('lastName')}
                    className="w-full rounded-md border border-neutral-800 bg-zinc-950/40 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-neutral-700"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                  Job Title / Role
                </label>
                <input
                  type="text"
                  placeholder="e.g. Technical Recruiter"
                  {...register('title')}
                  className="rounded-md border border-neutral-800 bg-zinc-950/40 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-neutral-700"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                  Phone Number
                </label>
                <input
                  type="text"
                  {...register('phone')}
                  className="rounded-md border border-neutral-800 bg-zinc-950/40 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-neutral-700"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                  LinkedIn URL
                </label>
                <input
                  type="text"
                  placeholder="https://linkedin.com/in/..."
                  {...register('linkedin')}
                  className="rounded-md border border-neutral-800 bg-zinc-950/40 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-neutral-700"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                  Country
                </label>
                <input
                  type="text"
                  {...register('country')}
                  className="rounded-md border border-neutral-800 bg-zinc-950/40 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-neutral-700"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-zinc-950 font-semibold rounded-md text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving Contact...' : 'Save Contact'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
