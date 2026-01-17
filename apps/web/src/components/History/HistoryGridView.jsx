/**
 * Vue d'une grille historique
 */

export default function HistoryGridView({ crossword, claims }) {
  if (!crossword) return null;
  
  const { gridData, finalGridState } = crossword;
  const { rows, cols, cells } = gridData;
  
  // Map des claims par position
  const claimsByPosition = {};
  for (const claim of claims) {
    // TODO: mapper entry_id vers positions
  }
  
  return (
    <div className="space-y-3">
      {/* Mini grille */}
      <div 
        className="grid gap-px mx-auto"
        style={{
          gridTemplateColumns: `repeat(${cols}, 16px)`,
          gridTemplateRows: `repeat(${rows}, 16px)`,
        }}
      >
        {cells.map((cell) => {
          const key = `${cell.row}-${cell.col}`;
          const value = finalGridState?.[key] || '';
          
          return (
            <div
              key={key}
              className={`
                flex items-center justify-center text-[8px] font-mono
                ${cell.isBlack ? 'bg-gray-950' : 'bg-gray-800 border border-gray-700'}
              `}
            >
              {!cell.isBlack && value}
            </div>
          );
        })}
      </div>
      
      {/* Legende des claims */}
      <div className="flex flex-wrap gap-2">
        {claims.slice(0, 5).map((claim) => (
          <div 
            key={claim.entryId}
            className="flex items-center gap-1 text-xs"
          >
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: claim.color }}
            />
            <span className="text-gray-400">{claim.claimedByPseudo}</span>
          </div>
        ))}
        {claims.length > 5 && (
          <span className="text-xs text-gray-500">+{claims.length - 5}</span>
        )}
      </div>
      
      {/* Scores finaux */}
      {crossword.finalScores && (
        <div className="text-xs text-gray-400">
          Top: {crossword.finalScores.slice(0, 3).map((s, i) => (
            <span key={i} className="mr-2">
              {i + 1}. {s.pseudo} ({s.score})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
