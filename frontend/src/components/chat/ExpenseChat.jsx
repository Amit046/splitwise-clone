import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { commentService } from '../../services/resources';

let socket;

export default function ExpenseChat({ groupId, expenseId }) {
  const [comments, setComments] = useState([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    commentService.list(groupId, expenseId)
      .then((res) => setComments(res.data.data.comments))
      .catch(() => toast.error('Failed to load comments'));

    socket = io(import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000');
    socket.emit('join_expense', expenseId);

    socket.on('new_comment', (comment) => {
      setComments((prev) => [...prev, comment]);
    });

    return () => {
      socket.emit('leave_expense', expenseId);
      socket.disconnect();
    };
  }, [expenseId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await commentService.create(groupId, expenseId, message.trim());
      setMessage('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send comment');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Comments</h3>
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 max-h-64 overflow-y-auto space-y-3">
        {comments.length === 0 ? (
          <p className="text-xs text-gray-400">No comments yet. Be the first!</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="text-sm">
              <span className="font-medium text-primary-600">{c.name}</span>
              <span className="text-gray-400 text-xs ml-2">
                {new Date(c.created_at).toLocaleTimeString()}
              </span>
              <p className="text-gray-700 mt-0.5">{c.message}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="flex gap-2 mt-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          type="submit"
          disabled={sending || !message.trim()}
          className="bg-primary-600 hover:bg-primary-700 text-white text-sm px-4 py-2 rounded-md transition disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
