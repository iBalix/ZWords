/**
 * Log d'action avec couleur du joueur
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

const LOG_BG = {
  log_success: 'bg-green-500/20 border-l-2 border-green-500',
  log_fail: 'bg-red-500/20 border-l-2 border-red-500',
  log_attempt: 'bg-gray-500/10',
  log_join: 'bg-blue-500/20 border-l-2 border-blue-500',
  log_leave: 'bg-gray-500/10',
  log_next: 'bg-yellow-500/20 border-l-2 border-yellow-500',
};

export default function LogItem({ type, content, pseudo, color }) {
  const Icon = LOG_ICONS[type] || Zap;
  const bgClass = LOG_BG[type] || 'bg-gray-500/10';
  
  // Utiliser la couleur du joueur pour success/fail
  const usePlayerColor = (type === 'log_success' || type === 'log_fail') && color;
  
  return (
    <div 
      className={`flex items-center gap-2 text-xs rounded px-2 py-1.5 ${bgClass}`}
      style={usePlayerColor ? { borderLeftColor: color } : {}}
    >
      <Icon 
        className="w-3.5 h-3.5 flex-shrink-0" 
        style={usePlayerColor ? { color } : {}}
      />
      {pseudo && usePlayerColor && (
        <span 
          className="font-semibold"
          style={{ color }}
        >
          {pseudo}
        </span>
      )}
      <span className={type === 'log_success' ? 'text-green-300' : type === 'log_fail' ? 'text-red-300' : 'text-gray-300'}>
        {content}
      </span>
    </div>
  );
}
