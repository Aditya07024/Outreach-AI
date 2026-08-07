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
    <div className="w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Tabs list */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <button
          onClick={() => handleTabChange('csv')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'csv'
              ? 'border-slate-900 text-slate-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          CSV File Upload
        </button>
        <button
          onClick={() => handleTabChange('paste')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'paste'
              ? 'border-slate-900 text-slate-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Paste Email List
        </button>
        <button
          onClick={() => handleTabChange('manual')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'manual'
              ? 'border-slate-900 text-slate-900 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
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
            className={`mb-6 p-4 rounded-xl flex items-start gap-3 border text-xs leading-relaxed ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            )}
            <div className="flex-1">
              <span className="font-bold">{statusMsg.text}</span>
              {statusMsg.details && (
                <div className="mt-2 grid grid-cols-3 gap-4 border-t border-slate-200 pt-2 font-semibold text-[10px] text-slate-600 uppercase tracking-wider">
                  <div>Added: <span className="text-slate-900 font-bold">{statusMsg.details.imported}</span></div>
                  <div>Duplicates: <span className="text-slate-900 font-bold">{statusMsg.details.duplicates}</span></div>
                  {statusMsg.details.skipped !== undefined && (
                    <div>Skipped: <span className="text-slate-900 font-bold">{statusMsg.details.skipped}</span></div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CSV File Upload Form */}
        {activeTab === 'csv' && (
          <form onSubmit={handleCsvSubmit} className="space-y-4">
            <div className="border border-dashed border-slate-300 hover:border-slate-500 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-50 cursor-pointer relative group transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                required
              />
              <Upload className="w-8 h-8 text-slate-400 group-hover:text-slate-600 transition-colors" />
              <div className="text-center">
                <p className="text-xs font-bold text-slate-800">
                  {csvFile ? csvFile.name : 'Click or drag CSV file to upload'}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Supported columns: First Name, Last Name, Company, Title, Active Email, Phone, LinkedIn, Country
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !csvFile}
                className="px-5 py-2.5 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 font-bold rounded-xl text-xs transition-all disabled:opacity-40 cursor-pointer shadow-xs active:scale-[0.98]"
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
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Recruiter Emails
              </label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="hr@company.com&#10;jobs@company.com&#10;careers@company.com, engineering@company.com"
                rows={5}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                required
              />
              <span className="text-[10px] text-slate-500">
                You can separate emails using newlines, commas, semicolons or spaces.
              </span>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !pasteText.trim()}
                className="px-5 py-2.5 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 font-bold rounded-xl text-xs transition-all disabled:opacity-40 cursor-pointer shadow-xs active:scale-[0.98]"
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
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Active Email *
                </label>
                <input
                  type="email"
                  {...register('email', { required: 'Email address is required' })}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                />
                {errors.email && <span className="text-[10px] text-rose-600 font-bold">{errors.email.message}</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Company Name
                </label>
                <input
                  type="text"
                  {...register('company')}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                />
              </div>

              <div className="flex grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    First Name
                  </label>
                  <input
                    type="text"
                    {...register('firstName')}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Last Name
                  </label>
                  <input
                    type="text"
                    {...register('lastName')}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Job Title / Role
                </label>
                <input
                  type="text"
                  placeholder="e.g. Technical Recruiter"
                  {...register('title')}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Phone Number
                </label>
                <input
                  type="text"
                  {...register('phone')}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  LinkedIn URL
                </label>
                <input
                  type="text"
                  placeholder="https://linkedin.com/in/..."
                  {...register('linkedin')}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Country
                </label>
                <input
                  type="text"
                  {...register('country')}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 font-bold rounded-xl text-xs transition-all disabled:opacity-40 cursor-pointer shadow-xs active:scale-[0.98]"
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
