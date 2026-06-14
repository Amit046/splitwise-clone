import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../components/common/Navbar';
import Loader from '../components/common/Loader';
import { balanceService, settlementService, groupService } from '../services/resources';
import { useAuth } from '../context/AuthContext';

export default function BalancesPage() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settleForm, setSettleForm] = useState({ paid_to: '', amount: '', note: '' });
  const [showSettle, setShowSettle] = useState(false);
  const [settling, setSettling] = useState(false);

  const load = async () => {
    try {
      const [bRes, gRes] = await Promise.all([
        balanceService.getGroupBalances(groupId),
        groupService.get(groupId),
      ]);
      setData(bRes.data.data);
      setMembers(gRes.data.data.group.members.filter((m) => m.id !== user.id));
    } catch {
      toast.error('Failed to load balances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [groupId]);

  const handleSettle = async (e) => {
    e.preventDefault();
    setSettling(true);
    try {
      await settlementService.create(groupId, {
        paid_to: Number(settleForm.paid_to),
        amount: Number(settleForm.amount),
        currency: 'INR',
        note: settleForm.note || undefined,
      });
      toast.success('Settlement recorded');
      setSettleForm({ paid_to: '', amount: '', note: '' });
      setShowSettle(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record settlement');
    } finally {
      setSettling(false);
    }
  };

  if (loading) return <><Navbar /><Loader /></>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Balances</h1>
          <button
            onClick={() => setShowSettle((v) => !v)}
            className="bg-primary-600 hover:bg-primary-700 text-white text-sm px-4 py-2 rounded-md transition"
          >
            Settle Up
          </button>
        </div>

        {showSettle && (
          <form onSubmit={handleSettle} className="bg-white rounded-lg border border-gray-200 p-4 mb-6 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Record a Payment</h3>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Paid To</label>
              <select
                required
                value={settleForm.paid_to}
                onChange={(e) => setSettleForm({ ...settleForm, paid_to: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select member...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={settleForm.amount}
                onChange={(e) => setSettleForm({ ...settleForm, amount: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
              <input
                type="text"
                value={settleForm.note}
                onChange={(e) => setSettleForm({ ...settleForm, note: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={settling} className="bg-primary-600 hover:bg-primary-700 text-white text-sm px-4 py-2 rounded-md disabled:opacity-50 transition">
                {settling ? 'Recording...' : 'Record Payment'}
              </button>
              <button type="button" onClick={() => setShowSettle(false)} className="text-sm text-gray-400 px-3">Cancel</button>
            </div>
          </form>
        )}

        {/* Net balances */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Net Balances</h2>
          <div className="space-y-2">
            {data.balances.map((b) => (
              <div key={b.user_id} className="flex justify-between items-center text-sm">
                <span className="text-gray-700">{b.name}</span>
                <span className={`font-semibold ${Number(b.balance) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {Number(b.balance) >= 0 ? `+${Number(b.balance).toFixed(2)}` : Number(b.balance).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Positive = gets back money. Negative = owes money.</p>
        </div>

        {/* Simplified debts */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Suggested Settlements</h2>
          {data.simplified_debts.length === 0 ? (
            <p className="text-sm text-gray-500">Everyone is settled up! 🎉</p>
          ) : (
            <div className="space-y-2">
              {data.simplified_debts.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-amber-50 rounded-md px-3 py-2">
                  <span className="font-medium text-gray-800">{d.from_name}</span>
                  <span className="text-gray-400">owes</span>
                  <span className="font-medium text-gray-800">{d.to_name}</span>
                  <span className="ml-auto font-semibold text-amber-700">
                    {Number(d.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
