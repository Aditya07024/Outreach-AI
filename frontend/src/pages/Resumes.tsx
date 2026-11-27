import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import {
  FilePdf,
  UploadSimple,
  Trash,
  CheckCircle,
  PencilSimple,
  Plus,
  RadioButton,
  WarningCircle,
  FileText,
  Sparkle,
  ArrowRight,
  ShieldCheck,
  X,
  Clock,
} from '@phosphor-icons/react';
import { Resume, Settings } from '../types';
import { Glass } from '../components/glass/Glass';

export const Resumes: React.FC = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Editing state
  const [editingResume, setEditingResume] = useState<Resume | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      // Fetch resumes
      const resRes = await fetch('/api/resumes');
      if (resRes.ok) {
        const resData = await resRes.json();
        const list = Array.isArray(resData) ? resData : (resData?.resumes && Array.isArray(resData.resumes) ? resData.resumes : []);
        setResumes(list);
        localStorage.setItem('outreach_resume_count', String(list.length));
        window.dispatchEvent(new CustomEvent('resumesUpdated'));
      } else {
        setResumes([]);
        localStorage.setItem('outreach_resume_count', '0');
        window.dispatchEvent(new CustomEvent('resumesUpdated'));
      }

      // Fetch settings to know default resume
      const setRes = await fetch('/api/settings');
      if (setRes.ok) {
        const setData = await setRes.json();
        setSettings(setData);
      }
    } catch (err) {
      console.error(err);
      setResumes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Staggered GSAP entrance
  useEffect(() => {
    if (isLoading || !containerRef.current) return;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        '.resume-reveal',
        { y: 20, opacity: 0, filter: 'blur(6px)' },
        {
          y: 0,
          opacity: 1,
          filter: 'blur(0px)',
          duration: 0.5,
          stagger: 0.06,
          ease: 'power3.out',
        }
      );
    });
    return () => mm.revert();
  }, [isLoading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadFile(file);
      if (!uploadName) {
        setUploadName(file.name.replace(/\.pdf$/i, ''));
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        setUploadFile(file);
        if (!uploadName) {
          setUploadName(file.name.replace(/\.pdf$/i, ''));
        }
      } else {
        alert('Please upload a PDF file.');
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
      await fetchData();

      // Notify Sidebar and rest of app that resume was uploaded
      window.dispatchEvent(new CustomEvent('resumesUpdated'));
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
          description: editDescription,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save changes');

      setEditingResume(null);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to edit resume details.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;

    try {
      await fetch(`/api/resumes/${id}`, { method: 'DELETE' });
      await fetchData();
      window.dispatchEvent(new CustomEvent('resumesUpdated'));
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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <Glass variant="strong" radius="inner" className="p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-10 h-10 rounded-full border-2 border-stone-200 border-t-[#FF6B1A] animate-spin" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold font-display text-[#2A1A0F]">Loading Resumes</h3>
            <p className="text-xs text-[#735E50]">Fetching your candidate profiles and attachments...</p>
          </div>
        </Glass>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-6">
      {/* ========================================================
          1. HEADER BANNER
         ======================================================== */}
      <div className="resume-reveal flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#2A1A0F] tracking-tight">
              Resumes & Profiles
            </h1>
            <span className="px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-[#735E50] text-xs font-mono font-bold">
              {resumes.length} {resumes.length === 1 ? 'Profile' : 'Profiles'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#735E50] mt-1">
            Upload and manage tailored PDF profiles to personalize AI cold job applications.
          </p>
        </div>
      </div>

      {/* ========================================================
          2. MAIN BENTO GRID (Uploaded Resumes vs Upload Studio)
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 COLS): UPLOADED RESUME CARDS */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold font-display uppercase tracking-wider text-[#735E50] flex items-center gap-2">
              <FilePdf size={18} className="text-[#FF6B1A]" weight="duotone" />
              <span>Active Profiles</span>
            </h2>
            <span className="text-xs text-[#735E50]">
              Campaigns attach the default profile automatically
            </span>
          </div>

          {resumes.length === 0 ? (
            <Glass variant="surface" radius="outer" className="resume-reveal p-10 text-center space-y-4 border-2 border-dashed border-stone-300">
              <div className="w-14 h-14 rounded-[20px] bg-amber-50 text-[#D99B00] flex items-center justify-center mx-auto shadow-2xs">
                <FilePdf size={28} weight="duotone" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold font-display text-[#2A1A0F]">
                  No resume uploaded yet
                </h3>
                <p className="text-xs text-[#735E50] max-w-sm mx-auto">
                  Upload your first PDF resume on the right to unlock Campaigns and start generating personalized recruiter drafts.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF6B1A]/10 text-[#FF6B1A] font-mono text-[11px] font-bold">
                <span>Upload a PDF to unlock the workspace</span>
                <ArrowRight size={12} weight="bold" />
              </div>
            </Glass>
          ) : (
            <div className="space-y-3.5">
              {resumes.map((resume) => {
                const isDefault = settings?.defaultResumeId === resume.id;

                return (
                  <Glass
                    key={resume.id}
                    variant="surface"
                    radius="inner"
                    interactive
                    className={`resume-reveal p-5 transition-all space-y-3 ${
                      isDefault ? 'border-[#D99B00]/40 ring-1 ring-[#D99B00]/30' : ''
                    }`}
                  >
                    {/* Top Row: File Icon, Name, and Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-[14px] bg-[#FF6B1A]/10 text-[#FF6B1A] flex items-center justify-center shrink-0 shadow-2xs">
                          <FilePdf size={24} weight="duotone" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold font-display text-[#2A1A0F] truncate">
                              {resume.name}
                            </h3>
                            {isDefault && (
                              <span className="px-2 py-0.5 rounded-full bg-[#D99B00]/15 text-[#D99B00] border border-[#D99B00]/30 text-[10px] font-mono font-bold flex items-center gap-1">
                                <CheckCircle size={11} weight="fill" />
                                <span>Default</span>
                              </span>
                            )}
                          </div>
                          {resume.description && (
                            <p className="text-xs text-[#735E50] mt-1 leading-relaxed line-clamp-2">
                              {resume.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Icon Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleStartEdit(resume)}
                          className="p-2 rounded-[10px] bg-white/70 hover:bg-white text-[#735E50] hover:text-[#2A1A0F] border border-white/90 shadow-2xs transition-colors cursor-pointer"
                          title="Rename or edit description"
                        >
                          <PencilSimple size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(resume.id)}
                          className="p-2 rounded-[10px] bg-white/70 hover:bg-rose-50 text-[#735E50] hover:text-[#E63946] border border-white/90 shadow-2xs transition-colors cursor-pointer"
                          title="Delete resume profile"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Row: Metadata & Default Toggle */}
                    <div className="pt-2.5 border-t border-[rgba(42,26,15,0.06)] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#735E50]">
                        <Clock size={13} />
                        <span>Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}</span>
                      </div>

                      <button
                        onClick={() => handleSetDefault(resume.id)}
                        className={`px-3 py-1 rounded-[10px] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isDefault
                            ? 'bg-[#D99B00]/10 text-[#D99B00] border border-[#D99B00]/25'
                            : 'bg-white/80 hover:bg-white text-[#735E50] hover:text-[#2A1A0F] border border-white/90 shadow-2xs'
                        }`}
                      >
                        {isDefault ? (
                          <>
                            <CheckCircle size={13} weight="fill" />
                            <span>Default Attachment</span>
                          </>
                        ) : (
                          <>
                            <RadioButton size={13} />
                            <span>Make Default</span>
                          </>
                        )}
                      </button>
                    </div>
                  </Glass>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (5 COLS): UPLOAD & PERSONA STUDIO */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold font-display uppercase tracking-wider text-[#735E50] flex items-center gap-2">
              <UploadSimple size={18} className="text-[#FF6B1A]" weight="duotone" />
              <span>Upload New Profile</span>
            </h2>
          </div>

          <Glass variant="strong" radius="outer" className="resume-reveal p-6 space-y-4">
            <form onSubmit={handleUpload} className="space-y-4">
              {/* Profile Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#735E50]">
                  Profile Label
                </label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g. Full Stack Engineer"
                  className="w-full px-3.5 py-2 text-xs bg-white/80 border border-white/90 rounded-[12px] text-[#2A1A0F] placeholder-[#735E50]/50 focus:outline-none focus:border-[#FF6B1A] shadow-2xs transition-colors"
                  required
                />
              </div>

              {/* Persona Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#735E50]">
                  Target Role & Skills (Optional)
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="e.g. Tailored for React, TypeScript, Go, and distributed systems roles..."
                  rows={2}
                  className="w-full px-3.5 py-2 text-xs bg-white/80 border border-white/90 rounded-[12px] text-[#2A1A0F] placeholder-[#735E50]/50 focus:outline-none focus:border-[#FF6B1A] shadow-2xs transition-colors resize-none"
                />
              </div>

              {/* PDF Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-[18px] p-6 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer relative group
                  ${isDragging
                    ? 'border-[#FF6B1A] bg-[#FF6B1A]/5 scale-[1.01]'
                    : uploadFile
                    ? 'border-[#1DA365]/40 bg-[#1DA365]/5'
                    : 'border-stone-300 hover:border-[#FF6B1A]/50 bg-white/40 hover:bg-white/70'
                  }
                `}
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  required
                />

                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  uploadFile ? 'bg-[#1DA365]/10 text-[#1DA365]' : 'bg-stone-100 text-[#735E50] group-hover:text-[#FF6B1A]'
                }`}>
                  {uploadFile ? (
                    <CheckCircle size={24} weight="fill" />
                  ) : (
                    <UploadSimple size={24} weight="duotone" />
                  )}
                </div>

                <div>
                  <span className="text-xs font-bold text-[#2A1A0F] block truncate max-w-[200px]">
                    {uploadFile ? uploadFile.name : 'Choose or drop PDF file'}
                  </span>
                  <span className="text-[10px] text-[#735E50] block mt-0.5 font-mono">
                    {uploadFile ? `${(uploadFile.size / 1024).toFixed(0)} KB • Ready to upload` : 'PDF format, up to 5MB'}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isUploading || !uploadFile}
                className="w-full py-2.5 bg-[#FF6B1A] hover:bg-[#FF6B1A]/90 text-white font-bold rounded-[14px] text-xs transition-all shadow-[0_4px_14px_rgba(255,107,26,0.35)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Uploading & Parsing PDF...</span>
                  </>
                ) : (
                  <>
                    <UploadSimple size={15} weight="bold" />
                    <span>Upload Resume Profile</span>
                  </>
                )}
              </button>
            </form>
          </Glass>
        </div>
      </div>

      {/* ========================================================
          3. EDIT RESUME MODAL
         ======================================================== */}
      {editingResume && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Glass variant="strong" radius="outer" className="w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-2 border-b border-[rgba(42,26,15,0.06)]">
              <h3 className="text-sm font-bold font-display uppercase tracking-wider text-[#2A1A0F]">
                Edit Resume Profile
              </h3>
              <button
                onClick={() => setEditingResume(null)}
                className="p-1 rounded-full text-[#735E50] hover:text-[#2A1A0F]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#735E50]">
                  Resume Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-white/80 border border-white/90 rounded-[12px] text-[#2A1A0F] focus:outline-none focus:border-[#FF6B1A] shadow-2xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#735E50]">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2 text-xs bg-white/80 border border-white/90 rounded-[12px] text-[#2A1A0F] focus:outline-none focus:border-[#FF6B1A] shadow-2xs resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingResume(null)}
                  className="w-1/2 py-2 bg-stone-100 hover:bg-stone-200 text-[#735E50] font-bold rounded-[12px] text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-[#FF6B1A] hover:bg-[#FF6B1A]/90 text-white font-bold rounded-[12px] text-xs transition-all shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </Glass>
        </div>
      )}
    </div>
  );
};
