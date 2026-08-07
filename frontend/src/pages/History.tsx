import React, { useEffect, useState } from 'react';
import { Search, Eye, AlertOctagon, CheckCircle2 } from 'lucide-react';
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
      const data = await response.json();
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [search]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Outreach Log History</h2>
          <p className="text-xs text-slate-500 mt-1">Audit log of all individual cold emails sent to recruiters.</p>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, email, or campaign..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
        </div>
      </div>

      {/* Main List */}
      <div className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <th className="p-4">Recipient</th>
                <th className="p-4">Campaign</th>
                <th className="p-4">Email Subject</th>
                <th className="p-4">Sent Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-300 border-t-slate-800 mx-auto"></div>
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No matching outreach records found in history.
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">
                        {item.contact?.firstName ? `${item.contact.firstName} ${item.contact.lastName || ''}` : 'Recruiter'}
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
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'SENT' 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                        title="View Full Sent Email"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECTION MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl border border-slate-200 bg-white rounded-2xl p-6 space-y-4 shadow-xl text-slate-900">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Outreach Details</h3>
                <p className="text-[10px] text-slate-500">Sent to: {selectedItem.contact?.email}</p>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">To Recipient</span>
                  <span className="text-slate-900 font-bold block">{selectedItem.contact?.firstName ? `${selectedItem.contact.firstName} ${selectedItem.contact.lastName || ''}` : 'Recruiter'}</span>
                  <span className="text-slate-500 font-mono text-[11px] block">{selectedItem.contact?.email}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Campaign Batch</span>
                  <span className="text-slate-900 font-bold block">{selectedItem.campaign?.name || 'Direct Outreach'}</span>
                  <span className="text-slate-500 font-mono text-[11px] block">{new Date(selectedItem.sentAt).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Subject Header</span>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-900 font-semibold">
                  {selectedItem.subject}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Sent Email Body</span>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-800 leading-relaxed font-mono whitespace-pre-wrap max-h-[250px] overflow-y-auto">
                  {selectedItem.body}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
