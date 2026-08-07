import React, { useEffect, useState } from 'react';
import { Search, Eye, AlertOctagon, CheckCircle2, RefreshCw, Mail } from 'lucide-react';
import { EmailHistory } from '../types';

export const History: React.FC = () => {
  const [history, setHistory] = useState<EmailHistory[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<EmailHistory | null>(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/history?search=${encodeURIComponent(search)}`);
      if (!response.ok) {
        setHistory([]);
        return;
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setHistory(data);
      } else if (data && Array.isArray(data.history)) {
        setHistory(data.history);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error('Error fetching email history:', err);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [search]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Outreach Log History</h1>
          <p className="text-xs text-slate-500 mt-1">Audit log of all individual cold emails sent to recruiters and clients.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchHistory}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Refresh History Log"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, email, or campaign..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 shadow-2xs transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <th className="p-4">Recipient</th>
                <th className="p-4">Campaign</th>
                <th className="p-4">Email Subject</th>
                <th className="p-4">Sent Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-900 mx-auto mb-2"></div>
                    <span className="text-xs text-slate-500 font-medium">Loading history logs...</span>
                  </td>
                </tr>
              ) : !Array.isArray(history) || history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500">
                    <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-800">No Outreach History Found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Sent emails will automatically populate here after dispatching campaigns.</p>
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">
                        {item.contact?.firstName ? `${item.contact.firstName} ${item.contact.lastName || ''}` : 'Recruiter / Client'}
                      </div>
                      <div className="text-[10px] text-slate-500">{item.contact?.email || '—'}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{item.contact?.company || '—'}</div>
                    </td>
                    <td className="p-4 text-slate-700 font-medium truncate max-w-[140px]">
                      {item.campaign?.name || '—'}
                    </td>
                    <td className="p-4 text-slate-700 max-w-xs truncate">{item.subject}</td>
                    <td className="p-4 text-slate-500 font-mono text-[11px]">
                      {new Date(item.sentAt).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        item.status === 'SENT' 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {item.status === 'SENT' ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <AlertOctagon className="w-3 h-3 text-rose-600" />}
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 rounded-xl text-[11px] font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                        title="View Full Sent Email"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Inspector */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full overflow-hidden shadow-xl text-slate-900 space-y-0">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">Email Log Inspection</span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">{selectedItem.subject}</h3>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono font-bold">Recipient Email</span>
                  <span className="font-bold text-slate-900">{selectedItem.contact?.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono font-bold">Sent Date & Time</span>
                  <span className="font-mono text-slate-800">{new Date(selectedItem.sentAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono font-bold">Target Company / Role</span>
                  <span className="font-medium text-slate-800">{selectedItem.contact?.company || 'N/A'} {selectedItem.contact?.role ? `(${selectedItem.contact.role})` : ''}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-mono font-bold">Delivery Status</span>
                  <span className="font-bold text-emerald-700">{selectedItem.status}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-slate-400 block text-[10px] uppercase font-mono font-bold">Delivered Message Body</span>
                <div className="p-4 bg-white border border-slate-200 rounded-xl text-slate-800 font-sans whitespace-pre-wrap leading-relaxed shadow-inner max-h-60 overflow-y-auto">
                  {selectedItem.body}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
