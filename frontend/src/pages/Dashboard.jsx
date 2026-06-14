import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../components/common/Navbar';
import Loader from '../components/common/Loader';
import { groupService, balanceService } from '../services/resources';

export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [myBalance, setMyBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [groupsRes, balanceRes] = await Promise.all([
        groupService.list(),
        balanceService.getMyBalance(),
      ]);
      setGroups(groupsRes.data.data.groups);
      setMyBalance(balanceRes.data.data.balance);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await groupService.create(form);
      toast.success('Group created');
      setForm({ name: '', description: '' });
      setShowCreate(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create group');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Your Groups</h1>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="bg-primary-600 hover:bg-primary-700 text-white text-sm px-4 py-2 rounded-md transition"
          >
            + New Group
          </button>
        </div>

        {myBalance !== null && (
          <div className={`mb-6 p-4 rounded-lg border ${myBalance >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-sm text-gray-600">Your overall balance</p>
            <p className={`text-2xl font-bold ${myBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {myBalance >= 0 ? `You are owed ${myBalance.toFixed(2)}` : `You owe ${Math.abs(myBalance).toFixed(2)}`}
            </p>
          </div>
        )}

        {showCreate && (
          <form onSubmit={handleCreate} className="bg-white p-4 rounded-lg border border-gray-200 mb-6 space-y-3">
            <input
              type="text"
              placeholder="Group name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white text-sm px-4 py-2 rounded-md transition">
              Create
            </button>
          </form>
        )}

        {loading ? (
          <Loader label="Loading groups..." />
        ) : groups.length === 0 ? (
          <p className="text-gray-500 text-sm">No groups yet. Create one to get started.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {groups.map((g) => (
              <Link
                key={g.id}
                to={`/groups/${g.id}`}
                className="bg-white p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-sm transition block"
              >
                <h3 className="font-semibold text-gray-900">{g.name}</h3>
                {g.description && <p className="text-sm text-gray-500 mt-1">{g.description}</p>}
                <p className="text-xs text-gray-400 mt-2">{g.member_count} members</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
