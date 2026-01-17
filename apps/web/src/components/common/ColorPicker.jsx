/**
 * Selecteur de couleur
 */

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export default function ColorPicker({ value, onChange, colors }) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <motion.button
          key={color}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onChange(color)}
          className={`
            w-8 h-8 rounded-full relative
            transition-all duration-200
            ${value === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : 'hover:ring-1 hover:ring-white/50'}
          `}
          style={{ backgroundColor: color }}
        >
          {value === color && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Check className="w-4 h-4 text-white drop-shadow-md" />
            </motion.div>
          )}
        </motion.button>
      ))}
    </div>
  );
}
