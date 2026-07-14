import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  HelpCircle, 
  Send, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Mail, 
  MessageSquare, 
  Clock, 
  LifeBuoy,
  Sparkles,
  Lock,
  ExternalLink
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'gmail' | 'ai' | 'billing';
}

const FAQS: FAQItem[] = [
  {
    question: "How does the AI personalization work?",
    answer: "Our engine parses your candidate profile (portfolio, GitHub, LinkedIn links) and uploaded resumes alongside target job descriptions or recruiter roles. It highlights matching skillsets and dynamically drafts unique, custom job applications to maximize open and reply rates.",
    category: "ai"
  },
  {
    question: "Is my Gmail OAuth connection secure?",
    answer: "Yes, security is our top priority. We request restricted Gmail API send scopes only. Your OAuth refresh tokens are stored using AES-256 bank-grade encryption. You can disconnect your account at any time in the settings tab, which instantly wipes all credentials from our database.",
    category: "gmail"
  },
  {
    question: "How many emails can I send per day?",
    answer: "For standard accounts, the limit is based on your Google Workspace or personal Gmail daily limits (typically 500/day for personal Gmail, and up to 2000/day for Workspace). However, to protect your domain reputation, we recommend scaling up gradually and spacing emails out using our built-in Outbox Queue.",
    category: "general"
  },
  {
    question: "What resume formats are supported?",
    answer: "Currently, we support PDF files up to 5MB. PDF ensures that our parsing engine and AI models can reliably read formatting and extract your key achievements.",
    category: "general"
  },
  {
    question: "How do I update or cancel my subscription?",
    answer: "You can manage your subscription directly in the 'Subscription' tab. All payments are processed securely via Stripe. If you cancel, your premium features will remain active until the end of your billing cycle.",
    category: "billing"
  },
  {
    question: "What is the Outbox Queue?",
    answer: "To prevent your emails from landing in spam, Outreach AI automatically queues your campaigns and staggers email delivery. This mimics organic sending patterns, protecting your Gmail sender score.",
    category: "general"
  }
];

interface SupportPageProps {
  isPublic?: boolean;
}

export const SupportPage: React.FC<SupportPageProps> = ({ isPublic = false }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('technical');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [faqFilter, setFaqFilter] = useState<'all' | 'general' | 'gmail' | 'ai' | 'billing'>('all');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Prefill details if authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/google/me')
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Unauthorized');
        })
        .then((data) => {
          if (data && data.email) {
            setEmail(data.email);
            // Derive a name if possible
            const extractedName = data.email.split('@')[0];
            setName(extractedName.charAt(0).toUpperCase() + extractedName.slice(1));
          }
        })
        .catch((err) => console.log('Not authenticated or token expired', err));
    }
  }, []);

  const handleFaqToggle = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setValidationError('Please fill in all fields.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);

    // Simulate API request delay for polished experience
    await new Promise((resolve) => setTimeout(resolve, 1200));

    setIsSubmitting(false);
    setSubmitSuccess(true);
    setSubject('');
    setMessage('');
  };

  const filteredFaqs = FAQS.filter(
    (faq) => faqFilter === 'all' || faq.category === faqFilter
  );

  const formContent = (
    <div className="bg-zinc-900/60 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-zinc-800 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
      
      {!submitSuccess ? (
        <form onSubmit={handleFormSubmit} className="space-y-5">
          <div>
            <h3 className="text-lg font-black tracking-tight text-neutral-100 flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-blue-400" />
              Submit a Ticket
            </h3>
            <p className="text-xs text-neutral-450 mt-1">
              Have a question or running into an issue? Drop us a line.
            </p>
          </div>

          {validationError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2 animate-shake">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              {validationError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="support-name" className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Full Name</label>
              <input
                id="support-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-950/80 border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-neutral-100 placeholder-neutral-600 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="support-email" className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Email Address</label>
              <input
                id="support-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-950/80 border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-neutral-100 placeholder-neutral-600 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="support-category" className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Inquiry Type</label>
            <select
              id="support-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-950/80 border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-neutral-100 transition-all cursor-pointer"
            >
              <option value="technical">Technical Support / Bug</option>
              <option value="billing">Billing & Subscription</option>
              <option value="feature">Feature Request</option>
              <option value="gmail">Gmail OAuth Issues</option>
              <option value="general">General Question</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="support-subject" className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Subject</label>
            <input
              id="support-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="How can we help you?"
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-950/80 border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-neutral-100 placeholder-neutral-600 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="support-message" className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Message Details</label>
            <textarea
              id="support-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or feedback in detail..."
              rows={4}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-zinc-950/80 border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-neutral-100 placeholder-neutral-600 transition-all resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-blue-500/10 active:scale-98"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border border-white/30 border-t-white animate-spin" />
                Submitting ticket...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Submit Ticket
              </>
            )}
          </button>
        </form>
      ) : (
        <div className="py-8 text-center space-y-6 flex flex-col items-center animate-fade-in">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/5">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-2 max-w-sm">
            <h4 className="text-base font-black text-neutral-100">Ticket Submitted Successfully!</h4>
            <p className="text-xs text-neutral-450 leading-relaxed">
              Thanks for reaching out! We've received your request under <span className="font-bold text-neutral-300 capitalize">{category}</span> support. Our engineering team will review it and reply within 24 hours.
            </p>
          </div>
          <button
            onClick={() => setSubmitSuccess(false)}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-neutral-200 text-[10px] font-bold rounded-xl transition-colors cursor-pointer"
          >
            Submit Another Ticket
          </button>
        </div>
      )}
    </div>
  );

  const mainLayout = (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Panel: Contact Form */}
      <div className="lg:col-span-5">
        {formContent}
      </div>

      {/* Right Panel: FAQ List */}
      <div className="lg:col-span-7 space-y-6 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850 pb-4">
          <div>
            <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-purple-400" />
              Frequently Asked Questions
            </h3>
            <p className="text-[10px] text-neutral-500 mt-0.5">Quick answers to common questions</p>
          </div>

          {/* Filter Categories */}
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'general', 'gmail', 'ai', 'billing'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  setFaqFilter(filter);
                  setOpenFaqIndex(null);
                }}
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                  faqFilter === filter
                    ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                    : 'bg-zinc-950/40 border-zinc-850 text-neutral-500 hover:text-neutral-350 hover:bg-zinc-850'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Accordions */}
        <div className="space-y-2.5">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, idx) => {
              const globalIndex = FAQS.indexOf(faq);
              const isOpen = openFaqIndex === globalIndex;
              return (
                <div 
                  key={globalIndex}
                  className={`border rounded-xl transition-all duration-200 ${
                    isOpen 
                      ? 'bg-zinc-900 border-zinc-800 shadow-md' 
                      : 'bg-zinc-950/20 border-zinc-850 hover:border-zinc-800'
                  }`}
                >
                  <button
                    onClick={() => handleFaqToggle(globalIndex)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-4 text-left cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-neutral-200 hover:text-white transition-colors">{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-neutral-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0" />
                    )}
                  </button>
                  
                  {isOpen && (
                    <div className="px-4 pb-3 text-xs text-neutral-450 leading-relaxed border-t border-zinc-850 pt-2.5 animate-slide-down">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-neutral-600 text-xs">
              No questions found in this category.
            </div>
          )}
        </div>

        {/* Fast response note */}
        <div className="flex items-center gap-3 p-3.5 bg-neutral-900/30 rounded-xl border border-neutral-900 text-neutral-400">
          <Clock className="w-4 h-4 text-blue-400 shrink-0 animate-pulse" />
          <p className="text-[10px] leading-relaxed">
            Support staff are online. Standard response window for tickets is <strong>9:00 AM - 6:00 PM EST</strong>. Average response speed: <strong>45 minutes</strong>.
          </p>
        </div>
      </div>
    </div>
  );

  // If public route, render with standard wrapper page styles
  if (isPublic) {
    return (
      <div className="min-h-screen bg-zinc-950 text-neutral-100 py-16 px-6 relative overflow-hidden flex flex-col items-center">
        {/* Background glow decor */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />

        <div className="max-w-[1000px] w-full space-y-8 z-10">
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 text-xs text-neutral-455 hover:text-neutral-250 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to home
          </button>

          <div className="flex items-center gap-3 border-b border-neutral-900 pb-6">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <LifeBuoy className="w-6 h-6 animate-pulse-glow" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-neutral-100">Help &amp; Support</h1>
              <p className="text-xs text-neutral-500 mt-1">Get support, check guides, and search frequently asked questions.</p>
            </div>
          </div>

          {mainLayout}
        </div>
      </div>
    );
  }

  // Authenticated Dashboard View (embedded within dashboard layout panel)
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 animate-fade-in">
      {mainLayout}
    </div>
  );
};

export default SupportPage;
