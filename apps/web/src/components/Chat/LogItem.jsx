/**
 * Log d'action
 */

import { Check, X, LogIn, LogOut, RefreshCw, Zap } from 'lucide-react';

const LOG_ICONS = {
  log_success: Check,
  log_fail: X,
  log_attempt: Zap,
  log_join: LogIn,
  log_leave: LogOut,
  log_next: RefreshCw,
};

const LOG_COLORS = {
  log_success: 'text-green-400',
  log_fail: 'text-red-400',
  log_attempt: 'text-gray-400',
  log_join: 'text-blue-400',
  log_leave: 'text-gray-500',
  log_next: 'text-yellow-400',
};

export default function LogItem({ type, content, pseudo, color }) {
  const Icon = LOG_ICONS[type] || Zap;
  const colorClass = LOG_COLORS[type] || 'text-gray-400';
  
  return (
    <div className={`chat-message log ${colorClass} flex items-center gap-2 text-xs rounded px-2 py-1`}>
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span>{content}</span>
    </div>
  );
}
