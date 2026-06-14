/**
 * Renders inputs for the chosen split_type and produces:
 * - participants: number[] (for 'equal')
 * - split_details: { [userId]: number } (for unequal/percentage/share)
 *
 * `members` = group members [{id, name, email}], `amount` = expense total.
 */
export default function SplitSelector({ splitType, members, amount, value, onChange }) {
  const toggleParticipant = (userId) => {
    const current = value.participants || [];
    const next = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId];
    onChange({ ...value, participants: next });
  };

  const setDetail = (userId, val) => {
    const next = { ...(value.split_details || {}) };
    next[userId] = val === '' ? '' : Number(val);
    onChange({ ...value, split_details: next });
  };

  if (splitType === 'equal') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Split equally between</label>
        <div className="space-y-1">
          {members.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={(value.participants || []).includes(m.id)}
                onChange={() => toggleParticipant(m.id)}
              />
              {m.name}
            </label>
          ))}
        </div>
      </div>
    );
  }

  const detailLabel = {
    unequal: 'Amount',
    percentage: 'Percentage (%)',
    share: 'Shares',
  }[splitType];

  const details = value.split_details || {};
  const sum = Object.values(details).reduce((a, b) => a + (Number(b) || 0), 0);

  let helper = null;
  if (splitType === 'unequal') {
    helper = `Sum: ${sum.toFixed(2)} / ${Number(amount || 0).toFixed(2)}`;
  } else if (splitType === 'percentage') {
    helper = `Sum: ${sum.toFixed(2)}% / 100%`;
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{detailLabel} per person</label>
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3">
            <span className="text-sm text-gray-700 w-28 truncate">{m.name}</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={details[m.id] ?? ''}
              onChange={(e) => setDetail(m.id, e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        ))}
      </div>
      {helper && <p className="text-xs text-gray-400 mt-2">{helper}</p>}
    </div>
  );
}
