import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LandingPage } from './pages/LandingPage';

// Views
import { Dashboard } from './pages/Dashboard';
import { Campaigns } from './pages/Campaigns';
import { Outbox } from './pages/Outbox';
import { Resumes } from './pages/Resumes';
import { History } from './pages/History';
import { Logs } from './pages/Logs';
import { Settings } from './pages/Settings';

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

  const fetchGmailStatus = async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const response = await fetch('/api/auth/google/status');
      if (!response.ok) return;
      const data = await response.json();
      setGmailStatus(data);
    } catch (err) {
      console.error('Failed to retrieve Gmail OAuth connection status', err);
    }
  };

  useEffect(() => {
    // Process URL authentication or payment redirects from Google Callback
    const hash = window.location.hash;
    if (hash) {
      const cleanHash = hash.startsWith('#') ? hash.substring(1) : hash;
      const params = new URLSearchParams(cleanHash);
      const token = params.get('token');
      const paymentRequired = params.get('payment_required');
      const userId = params.get('userId');

      if (token) {
        localStorage.setItem('token', token);
        window.location.hash = ''; // clear hash
        setIsAuthenticated(true);
      } else if (paymentRequired === 'true' && userId) {
        setPaymentRequiredUserId(userId);
        window.location.hash = '';
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchGmailStatus();
      // Poll Gmail connection state every 30 seconds
      const interval = setInterval(fetchGmailStatus, 30000);
      return () => clearInterval(interval);
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
  };

  if (!isAuthenticated) {
    return (
      <LandingPage 
        onAuthenticated={() => setIsAuthenticated(true)} 
        initialPaymentRequiredUserId={paymentRequiredUserId}
        onClearPaymentRequired={() => setPaymentRequiredUserId(null)}
      />
    );
  }

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-zinc-950 text-neutral-100">
        
        {/* Nav Sidebar */}
        <Sidebar gmailStatus={gmailStatus} onLogout={handleLogout} />

        {/* Main Content Pane */}
        <div className="flex-1 pl-64 flex flex-col min-h-screen">
          
          {/* Top Navbar */}
          <Header title={currentTitle} gmailStatus={gmailStatus} />

          {/* View Router */}
          <main className="flex-grow">
            <Routes>
              <Route 
                path="/" 
                element={
                  <PageWrapper title="Dashboard" setTitle={setCurrentTitle}>
                    <Dashboard />
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
                    <Settings gmailStatus={gmailStatus} onRefreshGmailStatus={fetchGmailStatus} />
                  </PageWrapper>
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
};

// Simple helper component to set document / header titles dynamically on load
interface PageWrapperProps {
  title: string;
  setTitle: (title: string) => void;
  children: React.ReactNode;
}

const PageWrapper: React.FC<PageWrapperProps> = ({ title, setTitle, children }) => {
  useEffect(() => {
    setTitle(title);
    document.title = `${title} | AI Job Outreach Assistant`;
  }, [title, setTitle]);

  return <>{children}</>;
};

export default App;
