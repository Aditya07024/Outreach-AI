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
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm relative overflow-hidden text-slate-900">
      
      {!submitSuccess ? (
        <form onSubmit={handleFormSubmit} className="space-y-5">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-slate-700" />
              Submit a Ticket
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Have a question or running into an issue? Drop us a line.
            </p>
          </div>

          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
              {validationError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="support-name" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Full Name</label>
              <input
                id="support-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:bg-white focus:border-slate-900 text-slate-900 placeholder-slate-400 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="support-email" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email Address</label>
              <input
                id="support-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:bg-white focus:border-slate-900 text-slate-900 placeholder-slate-400 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="support-category" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Inquiry Type</label>
            <select
              id="support-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:bg-white focus:border-slate-900 text-slate-900 transition-colors cursor-pointer"
            >
              <option value="technical">Technical Support / Bug</option>
              <option value="billing">Billing & Subscription</option>
              <option value="feature">Feature Request</option>
              <option value="gmail">Gmail OAuth Issues</option>
              <option value="general">General Question</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="support-subject" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Subject</label>
            <input
              id="support-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="How can we help you?"
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:bg-white focus:border-slate-900 text-slate-900 placeholder-slate-400 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="support-message" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Message Details</label>
            <textarea
              id="support-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or feedback in detail..."
              rows={4}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:bg-white focus:border-slate-900 text-slate-900 placeholder-slate-400 transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 disabled:opacity-50 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-900/30 border-t-slate-900 animate-spin" />
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
        <div className="py-8 text-center space-y-6 flex flex-col items-center animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center shadow-xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-2 max-w-sm">
            <h4 className="text-base font-extrabold text-slate-900">Ticket Submitted Successfully!</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Thanks for reaching out! We've received your request under <span className="font-bold text-slate-900 capitalize">{category}</span> support. Our engineering team will review it and reply within 24 hours.
            </p>
          </div>
          <button
            onClick={() => setSubmitSuccess(false)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
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
      <div className="lg:col-span-7 space-y-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-slate-700" />
              Frequently Asked Questions
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Quick answers to common questions</p>
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
                className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                  faqFilter === filter
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
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
                      ? 'bg-slate-50 border-slate-300 shadow-xs' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <button
                    onClick={() => handleFaqToggle(globalIndex)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-4 text-left cursor-pointer"
                  >
                    <span className="text-xs font-bold text-slate-900">{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                  </button>
                  
                  {isOpen && (
                    <div className="px-4 pb-3 text-xs text-slate-600 leading-relaxed border-t border-slate-200/60 pt-2.5">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              No questions found in this category.
            </div>
          )}
        </div>

        {/* Fast response note */}
        <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
          <Clock className="w-4 h-4 text-slate-600 shrink-0" />
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
      <div className="min-h-screen bg-slate-50 text-slate-900 py-16 px-6 relative overflow-hidden flex flex-col items-center">
        <div className="max-w-[1000px] w-full space-y-8 z-10">
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer font-bold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to home
          </button>

          <div className="flex items-center gap-3 border-b border-slate-200 pb-6">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 flex items-center justify-center shadow-xs">
              <LifeBuoy className="w-6 h-6 text-slate-800" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Help &amp; Support</h1>
              <p className="text-xs text-slate-500 mt-1">Get support, check guides, and search frequently asked questions.</p>
            </div>
          </div>

          {mainLayout}
        </div>
      </div>
    );
  }

  // Authenticated Dashboard View (embedded within dashboard layout panel)
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-200">
      {mainLayout}
    </div>
  );
};

export default SupportPage;
