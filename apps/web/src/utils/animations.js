/**
 * Configurations d'animations Framer Motion
 */

// Variants pour les cellules de grille
export const cellVariants = {
  idle: { scale: 1 },
  active: { 
    scale: 1.02,
    boxShadow: '0 0 10px rgba(99, 102, 241, 0.5)'
  },
  typing: { 
    scale: [1, 1.08, 1],
    transition: { duration: 0.15 }
  },
  correct: { 
    backgroundColor: ['rgba(34, 197, 94, 0.3)', 'rgba(34, 197, 94, 0.5)', 'rgba(34, 197, 94, 0.3)'],
    transition: { duration: 0.5 }
  },
  incorrect: {
    x: [0, -4, 4, -4, 4, 0],
    backgroundColor: ['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.5)', 'rgba(239, 68, 68, 0.3)'],
    transition: { duration: 0.4 }
  }
};

// Variants pour le scoreboard
export const scoreVariants = {
  initial: { scale: 1 },
  update: {
    scale: [1, 1.2, 1],
    color: ['#ffffff', '#22c55e', '#ffffff'],
    transition: { duration: 0.3 }
  }
};

// Variants pour la presence (halo)
export const presenceVariants = {
  visible: {
    opacity: [0.4, 0.7, 0.4],
    scale: [1, 1.02, 1],
    transition: { 
      repeat: Infinity, 
      duration: 2,
      ease: 'easeInOut'
    }
  },
  hidden: {
    opacity: 0,
    scale: 1
  }
};

// Variants pour les modals
export const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: 20
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300
    }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 20,
    transition: {
      duration: 0.2
    }
  }
};

// Variants pour les messages de chat
export const messageVariants = {
  hidden: {
    opacity: 0,
    y: 10
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.1
    }
  }
};

// Variants pour les cartes de partie
export const gameCardVariants = {
  hidden: {
    opacity: 0,
    x: -20
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3
    }
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.2
    }
  },
  hover: {
    x: 4,
    transition: {
      duration: 0.2
    }
  }
};

// Transitions communes
export const springTransition = {
  type: 'spring',
  damping: 25,
  stiffness: 300
};

export const fastTransition = {
  duration: 0.15
};

export const mediumTransition = {
  duration: 0.3
};
