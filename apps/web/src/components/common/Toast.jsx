/**
 * Composant Toast (utilise react-hot-toast)
 * Re-export pour faciliter les imports
 */

import toast from 'react-hot-toast';

export { toast };

export const showSuccess = (message) => toast.success(message);
export const showError = (message) => toast.error(message);
export const showInfo = (message) => toast(message);
