import { useState } from 'react';
import toast from 'react-hot-toast';
import SplitSelector from './SplitSelector';
import { expenseService } from '../../services/resources';

export default function ExpenseForm({ groupId, members, onSuccess, onCancel, initial }) {
  const [form, setForm] = useState(
    initial || {
      description: '',
      amount: '',
      currency: 'INR',
      split_type: 'equal',
      expense_date: new Date().toISOString().slice(0, 10),
      notes: '',
      participants: members.map((m) => m.id),
      split_details: {},
    }
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        description: form.description,
        amount: Number(form.amount),
        currency: form.currency,
        split_type: form.split_type,
        expense_date: form.expense_date,
        notes: form.notes || undefined,
      };

      if (form.split_type === 'equal') {
        payload.participants = form.participants;
      } else {
        // Convert split_details keys to numbers, drop empty entries
        const details = {};
        Object.entries(form.split_details || {}).forEach(([k, v]) => {
          if (v !== '' && v !== undefined) details[k] = Number(v);
        });
        payload.split_details = details;
      }

      if (initial) {
        await expenseService.update(groupId, initial.id, payload);
        toast.success('Expense updated');
      } else {
        await expenseService.create(groupId, payload);
        toast.success('Expense added');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input
            type="text"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <select
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option>INR</option>
            <option>USD</option>
            <option>EUR</option>
            <option>GBP</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            required
            value={form.expense_date}
            onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Split Type</label>
          <select
            value={form.split_type}
            onChange={(e) => setForm({ ...form, split_type: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="equal">Equal</option>
            <option value="unequal">Unequal</option>
            <option value="percentage">Percentage</option>
            <option value="share">Share</option>
          </select>
        </div>
      </div>

      <SplitSelector
        splitType={form.split_type}
        members={members}
        amount={form.amount}
        value={form}
        onChange={(v) => setForm({ ...form, ...v })}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
        <input
          type="text"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary-600 hover:bg-primary-700 text-white text-sm px-4 py-2 rounded-md transition disabled:opacity-50"
        >
          {submitting ? 'Saving...' : initial ? 'Update Expense' : 'Add Expense'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-gray-500 px-4 py-2">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
