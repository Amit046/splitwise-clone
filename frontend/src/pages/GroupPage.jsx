import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../components/common/Navbar';
import Loader from '../components/common/Loader';
import ExpenseForm from '../components/expenses/ExpenseForm';
import { groupService, expenseService } from '../services/resources';
import { useAuth } from '../context/AuthContext';

export default function GroupPage() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  const load = async () => {
    try {
      const [gRes, eRes] = await Promise.all([
        groupService.get(groupId),
        expenseService.list(groupId),
      ]);
      setGroup(gRes.data.data.group);
      setExpenses(eRes.data.data.expenses);
    } catch {
      toast.error('Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [groupId]);

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      await groupService.addMember(groupId, inviteEmail);
      toast.success('Member added');
      setInviteEmail('');
      setShowInvite(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await groupService.removeMember(groupId, userId);
      toast.success('Member removed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot remove member');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await expenseService.remove(groupId, expenseId);
      toast.success('Expense deleted');
      load();
    } catch {
      toast.error('Failed to delete expense');
    }
  };

  if (loading) return <><Navbar /><Loader label="Loading group..." /></>;

  const isCreator = group?.created_by === user?.id;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{group.name}</h1>
            {group.description && <p className="text-sm text-gray-500 mt-1">{group.description}</p>}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Link
              to={`/groups/${groupId}/balances`}
              className="text-sm border border-gray-300 hover:border-primary-500 text-gray-600 hover:text-primary-600 px-3 py-1.5 rounded-md transition"
            >
              Balances
            </Link>
            <Link
              to={`/groups/${groupId}/csv`}
              className="text-sm border border-gray-300 hover:border-primary-500 text-gray-600 hover:text-primary-600 px-3 py-1.5 rounded-md transition"
            >
              Import CSV
            </Link>
            <button
              onClick={() => setShowInvite((v) => !v)}
              className="text-sm border border-gray-300 hover:border-primary-500 text-gray-600 hover:text-primary-600 px-3 py-1.5 rounded-md transition"
            >
              Add Member
            </button>
            <button
              onClick={() => setShowAddExpense((v) => !v)}
              className="bg-primary-600 hover:bg-primary-700 text-white text-sm px-4 py-1.5 rounded-md transition"
            >
              + Expense
            </button>
          </div>
        </div>

        {/* Members strip */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Members</h2>
          <div className="flex flex-wrap gap-2">
            {group.members.map((m) => (
              <div key={m.id} className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1 text-sm">
                <span>{m.name}</span>
                {m.role === 'creator' && <span className="text-xs text-primary-600">(creator)</span>}
                {isCreator && m.role !== 'creator' && (
                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    className="text-gray-400 hover:text-red-500 ml-1 text-xs leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Invite form */}
        {showInvite && (
          <form onSubmit={handleInvite} className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex gap-2">
            <input
              type="email"
              placeholder="Enter member's email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white text-sm px-4 py-2 rounded-md transition">
              Add
            </button>
            <button type="button" onClick={() => setShowInvite(false)} className="text-sm text-gray-400 px-2">
              Cancel
            </button>
          </form>
        )}

        {/* Add expense form */}
        {showAddExpense && (
          <div className="mb-4">
            <ExpenseForm
              groupId={groupId}
              members={group.members}
              onSuccess={() => { setShowAddExpense(false); load(); }}
              onCancel={() => setShowAddExpense(false)}
            />
          </div>
        )}

        {/* Expense list */}
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Expenses</h2>
        {expenses.length === 0 ? (
          <p className="text-sm text-gray-500">No expenses yet. Add one above.</p>
        ) : (
          <div className="space-y-2">
            {expenses.map((e) => (
              <div key={e.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
                <div className="min-w-0">
                  <Link
                    to={`/groups/${groupId}/expenses/${e.id}`}
                    className="font-medium text-gray-900 hover:text-primary-600 truncate block"
                  >
                    {e.description}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {e.expense_date} · Paid by {e.paid_by_name} · {e.split_type}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <span className="font-semibold text-gray-800">
                    {e.currency} {Number(e.amount).toFixed(2)}
                  </span>
                  <button
                    onClick={() => handleDeleteExpense(e.id)}
                    className="text-xs text-gray-400 hover:text-red-500 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
