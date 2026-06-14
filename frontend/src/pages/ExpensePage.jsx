import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../components/common/Navbar';
import Loader from '../components/common/Loader';
import ExpenseForm from '../components/expenses/ExpenseForm';
import ExpenseChat from '../components/chat/ExpenseChat';
import { expenseService, groupService } from '../services/resources';

export default function ExpensePage() {
  const { groupId, expenseId } = useParams();
  const navigate = useNavigate();
  const [expense, setExpense] = useState(null);
  const [members, setMembers] = useState([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [eRes, gRes] = await Promise.all([
        expenseService.get(groupId, expenseId),
        groupService.get(groupId),
      ]);
      setExpense(eRes.data.data.expense);
      setMembers(gRes.data.data.group.members);
    } catch {
      toast.error('Failed to load expense');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [expenseId]);

  const handleDelete = async () => {
    if (!confirm('Delete this expense?')) return;
    try {
      await expenseService.remove(groupId, expenseId);
      toast.success('Expense deleted');
      navigate(`/groups/${groupId}`);
    } catch {
      toast.error('Failed to delete expense');
    }
  };

  if (loading) return <><Navbar /><Loader /></>;

  const editInitial = expense ? {
    id: expense.id,
    description: expense.description,
    amount: expense.amount,
    currency: expense.currency,
    split_type: expense.split_type,
    expense_date: expense.expense_date.slice(0, 10),
    notes: expense.notes || '',
    participants: expense.splits.map((s) => s.user_id),
    split_details: expense.split_type !== 'equal'
      ? Object.fromEntries(
          expense.splits.map((s) => [s.user_id,
            expense.split_type === 'percentage' ? s.percentage :
            expense.split_type === 'share' ? s.shares : s.owed_amount
          ])
        )
      : {},
  } : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate(`/groups/${groupId}`)}
          className="text-sm text-gray-500 hover:text-primary-600 mb-4 inline-block"
        >
          ← Back to group
        </button>

        {editing ? (
          <ExpenseForm
            groupId={groupId}
            members={members}
            initial={editInitial}
            onSuccess={() => { setEditing(false); load(); }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{expense.description}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {expense.expense_date?.slice(0, 10)} · Paid by {expense.paid_by_name}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {expense.currency} {Number(expense.amount).toFixed(2)}
                </div>
                <div className="text-xs text-gray-400 mt-0.5 capitalize">{expense.split_type} split</div>
              </div>
            </div>

            {expense.notes && (
              <p className="text-sm text-gray-600 mt-3 border-t pt-3">{expense.notes}</p>
            )}

            {/* Splits breakdown */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Split Breakdown</h3>
              <div className="space-y-1.5">
                {expense.splits.map((s) => (
                  <div key={s.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">{s.name}</span>
                    <div className="text-right">
                      <span className="font-medium">{expense.currency} {Number(s.owed_amount).toFixed(2)}</span>
                      {s.percentage != null && (
                        <span className="text-gray-400 text-xs ml-1">({s.percentage}%)</span>
                      )}
                      {s.shares != null && (
                        <span className="text-gray-400 text-xs ml-1">({s.shares} shares)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-5 pt-4 border-t">
              <button
                onClick={() => setEditing(true)}
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md transition"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="text-sm bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-md transition"
              >
                Delete
              </button>
            </div>

            <ExpenseChat groupId={groupId} expenseId={expenseId} />
          </div>
        )}
      </div>
    </div>
  );
}
