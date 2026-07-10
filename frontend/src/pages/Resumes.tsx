import React, { useEffect, useState } from 'react';
import { Upload, FileText, Trash2, CheckCircle2, Circle, Edit3 } from 'lucide-react';
import { Resume, Settings } from '../types';

export const Resumes: React.FC = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Editing state
  const [editingResume, setEditingResume] = useState<Resume | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const fetchData = async () => {
    try {
      // Fetch resumes
      const resRes = await fetch('/api/resumes');
      const resData = await resRes.json();
      setResumes(resData);

      // Fetch settings to know default resume
      const setRes = await fetch('/api/settings');
      const setData = await setRes.json();
      setSettings(setData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadFile(file);
      // Auto fill name if blank
      if (!uploadName) {
        setUploadName(file.name.replace('.pdf', ''));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('resume', uploadFile);
    formData.append('name', uploadName);
    formData.append('description', uploadDescription);

    try {
      const response = await fetch('/api/resumes', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to upload resume');

      setUploadFile(null);
      setUploadName('');
      setUploadDescription('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to upload resume.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartEdit = (resume: Resume) => {
    setEditingResume(resume);
    setEditName(resume.name);
    setEditDescription(resume.description || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResume) return;

    try {
      const response = await fetch(`/api/resumes/${editingResume.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save changes');

      setEditingResume(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to edit resume details.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;

    try {
      await fetch(`/api/resumes/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          defaultResumeId: id,
        }),
      });

      if (!response.ok) throw new Error('Failed to set default resume');
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-neutral-100 tracking-tight">Resume Attachments</h2>
        <p className="text-xs text-neutral-400 mt-1">
          Upload and manage multiple resume profiles (e.g., Full Stack, Backend, React) to attach to campaigns.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* RESUMES LIST PANEL */}
        <div className="lg:col-span-2 border border-neutral-800 bg-zinc-900/10 rounded-xl p-6 flex flex-col gap-4">
          <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Uploaded Resumes</h3>
          
          <div className="divide-y divide-neutral-900">
            {resumes.length === 0 ? (
              <div className="text-center py-12 text-xs text-neutral-500">
                No resumes uploaded. Drag and drop a PDF on the right to upload.
              </div>
            ) : (
              resumes.map((resume) => {
                const isDefault = settings?.defaultResumeId === resume.id;
                
                return (
                  <div key={resume.id} className="flex justify-between items-center py-4 first:pt-0 last:pb-0 gap-4">
                    <div className="flex items-start gap-3">
                      <FileText className="w-8 h-8 text-neutral-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-neutral-200 text-xs block">{resume.name}</span>
                        {resume.description && (
                          <p className="text-[10px] text-neutral-450 mt-1 italic leading-relaxed max-w-md">
                            {resume.description}
                          </p>
                        )}
                        <span className="text-[9px] text-neutral-500 font-medium block mt-1.5">
                          Uploaded on {new Date(resume.uploadedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Default Toggle Button */}
                      <button
                        onClick={() => handleSetDefault(resume.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[10px] font-semibold transition-all ${
                          isDefault
                            ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400 font-bold'
                            : 'bg-zinc-950/20 border-neutral-900 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        {isDefault ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Default</span>
                          </>
                        ) : (
                          <>
                            <Circle className="w-3.5 h-3.5 text-neutral-600" />
                            <span>Set Default</span>
                          </>
                        )}
                      </button>

                      {/* Rename / Edit Button */}
                      <button
                        onClick={() => handleStartEdit(resume)}
                        className="p-1.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 rounded-md transition-all"
                        title="Rename or edit description"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(resume.id)}
                        className="p-1.5 bg-neutral-900 hover:bg-rose-950/20 border border-rose-900/30 hover:border-rose-900/35 text-neutral-500 hover:text-rose-400 rounded-md transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* UPLOAD FORM PANEL */}
        <div className="border border-neutral-800 bg-zinc-900/10 rounded-xl p-6 h-fit">
          <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-4">Upload PDF Resume</h3>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Profile Label Name</label>
              <input
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="e.g. Backend Developer"
                className="rounded-md border border-neutral-850 bg-zinc-950 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-neutral-700"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Profile Description (Optional)</label>
              <textarea
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="e.g. Tailored for Go, NodeJS, PostgreSQL backend roles..."
                rows={2}
                className="rounded-md border border-neutral-850 bg-zinc-950 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-neutral-700 resize-none font-sans"
              />
            </div>

            <div className="border border-dashed border-neutral-700 hover:border-neutral-500 rounded-lg p-6 flex flex-col items-center justify-center gap-2 bg-zinc-950/20 cursor-pointer relative group transition-colors">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                required
              />
              <Upload className="w-6 h-6 text-neutral-500 group-hover:text-neutral-400 transition-colors" />
              <div className="text-center">
                <span className="text-[11px] font-semibold text-neutral-300 block truncate max-w-[180px]">
                  {uploadFile ? uploadFile.name : 'Choose PDF File'}
                </span>
                <span className="text-[9px] text-neutral-500 block mt-0.5">PDF format, up to 5MB</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isUploading || !uploadFile}
              className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-zinc-950 font-bold rounded-md text-xs transition-colors disabled:opacity-40"
            >
              {isUploading ? 'Uploading PDF...' : 'Upload Resume'}
            </button>
          </form>
        </div>

      </div>

      {/* RENAME / EDIT RESUME DETAILS MODAL */}
      {editingResume && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md border border-neutral-800 bg-zinc-900 rounded-xl p-6 space-y-4 shadow-xl relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 to-cyan-500" />
            <h3 className="text-sm font-semibold text-neutral-250 uppercase tracking-wider">
              Edit Resume Details
            </h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-neutral-450 font-semibold uppercase tracking-wider">Resume Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded-md border border-neutral-800 bg-zinc-950 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-neutral-700"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-neutral-455 font-semibold uppercase tracking-wider">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="rounded-md border border-neutral-800 bg-zinc-950 px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-neutral-700 resize-none font-sans"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingResume(null)}
                  className="w-1/2 py-2 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 font-semibold rounded-lg text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-neutral-100 hover:bg-neutral-200 text-zinc-950 font-bold rounded-lg text-xs transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
