import React, { useEffect, useState } from 'react';
import { Send, Sparkles, FileText, Trash2, MailOpen, Cpu } from 'lucide-react';
import { Resume } from '../types';

interface ComposeProps {
  gmailStatus: { connected: boolean; email?: string } | null;
}

export const Compose: React.FC<ComposeProps> = ({ gmailStatus }) => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  
  // Compose fields
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [resumeId, setResumeId] = useState<number | null>(null);
  
  // AI Assist fields
  const [aiCompany, setAiCompany] = useState('');
  const [aiRole, setAiRole] = useState('');
  const [aiContext, setAiContext] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  
  // Send state
  const [isSending, setIsSending] = useState(false);

  const loadResumes = async () => {
    try {
      const res = await fetch('/api/resumes');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.resumes && Array.isArray(data.resumes) ? data.resumes : []);
        setResumes(list);
        
        // Select default resume if settings set it
        const settingsRes = await fetch('/api/settings');
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          if (settingsData?.defaultResumeId) {
            setResumeId(settingsData.defaultResumeId);
          } else if (list.length > 0) {
            setResumeId(list[0].id);
          }
        }
      } else {
        setResumes([]);
      }
    } catch (err) {
      console.error(err);
      setResumes([]);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  const handleAIDraft = async () => {
    if (!aiCompany.trim() || !aiRole.trim()) {
      alert('Please enter a target company and role for the AI to customize the pitch.');
      return;
    }
    setIsDrafting(true);
    try {
      const response = await fetch('/api/settings/draft-ai-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: aiCompany,
          role: aiRole,
          context: aiContext
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate draft');
      
      setSubject(data.subject);
      setBody(data.body);
    } catch (err: any) {
      alert(err.message || 'AI Generation failed.');
    } finally {
      setIsDrafting(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmailStatus?.connected) {
      alert('Connect your Gmail account in Settings before sending.');
      return;
    }
    if (!to.trim() || !subject.trim() || !body.trim()) {
      alert('Recipient, subject, and body are required to send.');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/settings/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          body,
          resumeId
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send email');
      
      alert('Email successfully sent!');
      // Clear form
      setTo('');
      setSubject('');
      setBody('');
    } catch (err: any) {
      alert(err.message || 'Failed to send email.');
    } finally {
      setIsSending(false);
    }
  };

  const handleClear = () => {
    if (confirm('Clear composer fields?')) {
      setTo('');
      setSubject('');
      setBody('');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <MailOpen className="w-5 h-5 text-indigo-600" />
          Direct Mail Composer
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Draft and dispatch personalized recruiter outreach directly from your secure Gmail instance without running a bulk campaign.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COMPOSER (LEFT 7 COLS) */}
        <form onSubmit={handleSend} className="lg:col-span-7 border border-slate-200/80 bg-white rounded-2xl overflow-hidden shadow-sm space-y-0">
          {/* Header Banner */}
          <div className="bg-slate-50 border-b border-slate-200/80 px-5 py-3.5 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">New Outreach Message</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-neutral-900 text-neutral-500 hover:text-rose-400 rounded transition-colors"
                title="Wipe email fields"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Recipient */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:items-center">
              <label className="sm:col-span-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">To</label>
              <input
                type="email"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recruiter@company.com"
                className="sm:col-span-10 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
              />
            </div>

            {/* Subject */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:items-center">
              <label className="sm:col-span-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Opportunities at Company - Application"
                className="sm:col-span-10 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
              />
            </div>

            {/* Attach Resume */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:items-center">
              <label className="sm:col-span-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">Resume</label>
              <select
                value={resumeId || ''}
                onChange={(e) => setResumeId(e.target.value ? Number(e.target.value) : null)}
                className="sm:col-span-10 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
              >
                <option value="">No Resume Attachment</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}{r.description ? ` — ${r.description}` : ''}</option>
                ))}
              </select>
            </div>

            {/* Content Body */}
            <div className="flex flex-col gap-1.5 pt-2">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Message Content</label>
              <textarea
                required
                rows={12}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your email here, or use the AI Writing Assistant on the right..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 font-mono leading-relaxed transition-colors"
              />
            </div>

            {/* Send Controls */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                {resumeId ? 'PDF Resume Attached' : 'No Resume Attachment'}
              </span>
              <button
                type="submit"
                disabled={isSending || !gmailStatus?.connected}
                className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 font-bold rounded-xl text-xs transition-all disabled:opacity-40 cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <Send className="w-3.5 h-3.5" />
                {isSending ? 'Sending Email...' : 'Send Message'}
              </button>
            </div>
          </div>
        </form>

        {/* AI ASSISTANT (RIGHT 5 COLS) */}
        <div className="lg:col-span-5 border border-slate-200/80 bg-white rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">AI Writing Assistant</h3>
              <p className="text-[10px] text-slate-500">Powered by xAI Grok</p>
            </div>
          </div>

          <p className="text-[10px] text-slate-600 leading-relaxed">
            Enter the details of the job opportunity and the AI will draft a highly tailored pitch using your Personal Profile Settings automatically.
          </p>

          <div className="space-y-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Target Company Name *</label>
              <input
                type="text"
                placeholder="e.g. OpenAI, Stripe, Google"
                value={aiCompany}
                onChange={(e) => setAiCompany(e.target.value)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Target Role / Position *</label>
              <input
                type="text"
                placeholder="e.g. Frontend Engineer, Fullstack Developer"
                value={aiRole}
                onChange={(e) => setAiRole(e.target.value)}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Custom Guidelines / Context (Optional)</label>
              <textarea
                rows={3}
                placeholder="e.g. Focus on my experience with NextJS and mention my React Native open source library..."
                value={aiContext}
                onChange={(e) => setAiContext(e.target.value)}
                className="rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors resize-none font-sans"
              />
            </div>

            <button
              onClick={handleAIDraft}
              disabled={isDrafting}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 font-bold rounded-xl text-xs transition-colors disabled:opacity-40 shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isDrafting ? 'Drafting Custom Pitch...' : 'Draft Pitch with AI'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
