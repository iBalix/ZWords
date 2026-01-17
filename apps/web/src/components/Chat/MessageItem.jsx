/**
 * Message de chat
 */

export default function MessageItem({ pseudo, color, content, isMe }) {
  return (
    <div className={`chat-message rounded px-2 py-1 ${isMe ? 'bg-gray-800/30' : ''}`}>
      <span 
        className="font-medium text-sm mr-2"
        style={{ color }}
      >
        {pseudo}:
      </span>
      <span className="text-sm text-gray-200">
        {content}
      </span>
    </div>
  );
}
