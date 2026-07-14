import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LandingPage } from './pages/LandingPage';

import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsAndConditions } from './pages/TermsAndConditions';
import { SupportPage } from './pages/SupportPage';

// Views
import { Dashboard } from './pages/Dashboard';
import { Campaigns } from './pages/Campaigns';
import { Outbox } from './pages/Outbox';
import { Resumes } from './pages/Resumes';
import { History } from './pages/History';
import { Logs } from './pages/Logs';
import { Settings } from './pages/Settings';
import { Compose } from './pages/Compose';
import { PricingPage } from './pages/PricingPage';
import { Subscription } from './pages/Subscription';
import { AdminPortal } from './pages/AdminPortal';

// Global fetch interceptor to append authorization token & handle 401s
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const token = localStorage.getItem('token');
  if (token) {
    init = init || {};
    init.headers = init.headers || {};
    if (init.headers instanceof Headers) {
      if (!init.headers.has('Authorization')) {
        init.headers.set('Authorization', `Bearer ${token}`);
      }
    } else if (Array.isArray(init.headers)) {
      const hasAuth = init.headers.some(([k]) => k.toLowerCase() === 'authorization');
      if (!hasAuth) {
        init.headers.push(['Authorization', `Bearer ${token}`]);
      }
    } else {
      const headersRecord = init.headers as Record<string, string>;
      if (!headersRecord['Authorization'] && !headersRecord['authorization']) {
        headersRecord['Authorization'] = `Bearer ${token}`;
      }
    }
  }

  const response = await originalFetch(input, init);
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('unauthorized'));
  }
  return response;
};

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [gmailStatus, setGmailStatus] = useState<{ connected: boolean; email?: string } | null>(null);
  const [currentTitle, setCurrentTitle] = useState('Dashboard');
  const [paymentRequiredUserId, setPaymentRequiredUserId] = useState<string | null>(null);
  
  // Subscription / User profile status
  const [currentUser, setCurrentUser] = useState<{
    id: number;
    email: string | null;
    role: string;
    paid: boolean;
    plan: string | null;
    paidUntil: string | null;
  } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchUserProfile = async () => {
    if (!localStorage.getItem('token')) {
      setLoadingUser(false);
      return;
    }
    try {
      setLoadingUser(true);
      const response = await fetch('/api/auth/google/me');
      if (response.ok) {
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          setCurrentUser(data);
        } catch (jsonErr) {
          console.warn('Failed to parse user profile JSON. Response was:', text, jsonErr);
        }
      } else if (response.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error('Failed to retrieve user profile', err);
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchGmailStatus = async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const response = await fetch('/api/auth/google/status');
      if (!response.ok) return;
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        setGmailStatus(data);
      } catch (jsonErr) {
        console.warn('Failed to parse Gmail status JSON. Response was:', text, jsonErr);
      }
    } catch (err) {
      console.error('Failed to retrieve Gmail OAuth connection status', err);
    }
  };

  useEffect(() => {
    // Process URL authentication or payment redirects from Google Callback (supports query params or hash)
    const hash = window.location.hash;
    const search = window.location.search;
    
    let params: URLSearchParams | null = null;
    let isHash = false;
    
    if (hash) {
      const cleanHash = hash.startsWith('#') ? hash.substring(1) : hash;
      // Simple check to make sure it looks like query params rather than a standard element ID
      if (cleanHash.includes('=')) {
        params = new URLSearchParams(cleanHash);
        isHash = true;
      }
    }
    
    if (!params && search) {
      params = new URLSearchParams(search);
    }
    
    if (params) {
      const token = params.get('token');
      const paymentRequired = params.get('payment_required');
      const userId = params.get('userId');
      const error = params.get('error');

      if (token) {
        localStorage.setItem('token', token);
        if (isHash) {
          window.location.hash = '';
        } else {
          try {
            window.history.replaceState({}, '', window.location.pathname);
          } catch (err) {
            console.warn('replaceState failed', err);
          }
        }
        setIsAuthenticated(true);
      } else if (paymentRequired === 'true' && userId) {
        setPaymentRequiredUserId(userId);
        if (isHash) {
          window.location.hash = '';
        } else {
          try {
            window.history.replaceState({}, '', window.location.pathname);
          } catch (err) {
            console.warn('replaceState failed', err);
          }
        }
      } else if (error) {
        alert(`Authentication Failed: ${error}`);
        if (isHash) {
          window.location.hash = '';
        } else {
          try {
            window.history.replaceState({}, '', window.location.pathname);
          } catch (err) {
            console.warn('replaceState failed', err);
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserProfile();
      fetchGmailStatus();
      // Poll Gmail connection state every 30 seconds
      const interval = setInterval(fetchGmailStatus, 30000);
      return () => clearInterval(interval);
    } else {
      setCurrentUser(null);
      setLoadingUser(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
    };
    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setGmailStatus(null);
    setCurrentUser(null);
  };

  if (loadingUser && isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-neutral-400 gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-neutral-800 border-t-purple-500 animate-spin" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 animate-pulse">Loading Session...</span>
      </div>
    );
  }

  const isPaid = currentUser?.paid || currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  return (
    <BrowserRouter>
      <Routes>
        {/* Public static content routes */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsAndConditions />} />

        {!isAuthenticated ? (
          <>
            {/* Unauthenticated support portal */}
            <Route path="/support" element={<SupportPage isPublic={true} />} />
            {/* Unauthenticated admin portal */}
            <Route 
              path="/admin-portal" 
              element={
                <div className="min-h-screen bg-zinc-950 text-neutral-100 flex flex-col justify-center">
                  <AdminPortal 
                    currentUser={currentUser}
                    onAdminLoginSuccess={fetchUserProfile}
                    onAdminLogout={handleLogout}
                  />
                </div>
              } 
            />
            {/* Catch-all maps to LandingPage if unauthenticated */}
            <Route 
              path="*" 
              element={
                <LandingPage 
                  onAuthenticated={() => setIsAuthenticated(true)} 
                  initialPaymentRequiredUserId={paymentRequiredUserId}
                  onClearPaymentRequired={() => setPaymentRequiredUserId(null)}
                />
              } 
            />
          </>
        ) : (
          /* Authenticated workspace layout routes */
          <Route 
            path="*" 
            element={
              <div className="flex min-h-screen bg-zinc-950 text-neutral-100">
                {/* Nav Sidebar */}
                <Sidebar 
                  gmailStatus={gmailStatus} 
                  onLogout={handleLogout} 
                  isPaid={isPaid} 
                  userRole={currentUser?.role}
                  isOpen={sidebarOpen}
                  onClose={() => setSidebarOpen(false)}
                />

                {/* Main Content Pane */}
                <div className="flex-1 md:pl-64 flex flex-col min-h-screen">
                  
                  {/* Top Navbar */}
                  <Header 
                    title={currentTitle} 
                    gmailStatus={gmailStatus} 
                    onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                  />

                  {/* View Router */}
                  <main className="flex-grow">
                    <Routes>
                      <Route 
                        path="/" 
                        element={
                          <PageWrapper title="Dashboard" setTitle={setCurrentTitle}>
                            <Dashboard 
                              isPaid={isPaid}
                              user={currentUser}
                              onPaymentSuccess={(newToken) => {
                                localStorage.setItem('token', newToken);
                                fetchUserProfile();
                              }}
                            />
                          </PageWrapper>
                        } 
                      />
                      <Route 
                        path="/compose" 
                        element={
                          <PageWrapper title="Compose Email" setTitle={setCurrentTitle}>
                            <Compose gmailStatus={gmailStatus} />
                          </PageWrapper>
                        } 
                      />
                      <Route 
                        path="/campaigns" 
                        element={
                          <PageWrapper title="Campaigns" setTitle={setCurrentTitle}>
                            <Campaigns />
                          </PageWrapper>
                        } 
                      />
                      <Route 
                        path="/outbox" 
                        element={
                          <PageWrapper title="Outbox Queue" setTitle={setCurrentTitle}>
                            <Outbox />
                          </PageWrapper>
                        } 
                      />
                      <Route 
                        path="/resumes" 
                        element={
                          <PageWrapper title="Resumes" setTitle={setCurrentTitle}>
                            <Resumes />
                          </PageWrapper>
                        } 
                      />
                      <Route 
                        path="/history" 
                        element={
                          <PageWrapper title="Outreach History" setTitle={setCurrentTitle}>
                            <History />
                          </PageWrapper>
                        } 
                      />
                      <Route 
                        path="/logs" 
                        element={
                          <PageWrapper title="System Logs" setTitle={setCurrentTitle}>
                            <Logs />
                          </PageWrapper>
                        } 
                      />
                      <Route 
                        path="/settings" 
                        element={
                          <PageWrapper title="Settings" setTitle={setCurrentTitle}>
                            <Settings 
                              gmailStatus={gmailStatus} 
                              onRefreshGmailStatus={fetchGmailStatus} 
                              isPaid={isPaid}
                            />
                          </PageWrapper>
                        } 
                      />
                      <Route 
                        path="/subscription" 
                        element={
                          <PageWrapper title="Subscription Details" setTitle={setCurrentTitle}>
                            <Subscription 
                              user={currentUser} 
                              onPaymentSuccess={(newToken) => {
                                localStorage.setItem('token', newToken);
                                fetchUserProfile();
                              }}
                            />
                          </PageWrapper>
                        } 
                      />
                      <Route 
                        path="/support" 
                        element={
                          <PageWrapper title="Support Help Center" description="Get help with your Outreach AI account, search frequently asked questions, or contact support." setTitle={setCurrentTitle}>
                            <SupportPage isPublic={false} />
                          </PageWrapper>
                        } 
                      />
                      <Route 
                        path="/admin-portal" 
                        element={
                          <PageWrapper title="Admin Command Center" setTitle={setCurrentTitle}>
                            <AdminPortal 
                              currentUser={currentUser}
                              onAdminLoginSuccess={fetchUserProfile}
                              onAdminLogout={handleLogout}
                            />
                          </PageWrapper>
                        } 
                      />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </main>
                </div>
              </div>
            }
          />
        )}
      </Routes>
    </BrowserRouter>
  );
};

// Simple helper component to set document / header titles dynamically on load
interface PageWrapperProps {
  title: string;
  description?: string;
  setTitle: (title: string) => void;
  children: React.ReactNode;
}

const PageWrapper: React.FC<PageWrapperProps> = ({ title, description, setTitle, children }) => {
  useEffect(() => {
    setTitle(title);
    document.title = `${title} | Outreach AI`;
    
    try {
      // Update dynamic meta description for SEO
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute(
        'content', 
        description || "Automate personalized career outreach, build campaigns, and scale your job search with Outreach AI."
      );
    } catch (err) {
      console.warn('Failed to update meta description', err);
    }
  }, [title, description, setTitle]);

  return <>{children}</>;
};

export default App;
