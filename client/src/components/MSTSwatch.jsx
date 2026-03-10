import { MST_COLORS } from '../constants/mst';

export default function MSTSwatch({ selected, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {Object.entries(MST_COLORS).map(([tone, color]) => {
        const num = Number(tone);
        const isSelected = selected === num;
        return (
          <button
            key={tone}
            type="button"
            onClick={() => onChange(num)}
            className="w-10 h-10 rounded-full transition-all focus:outline-none"
            style={{
              backgroundColor: color,
              border: isSelected ? '3px solid #1d4ed8' : '2px solid #d1d5db',
              boxShadow: isSelected ? '0 0 0 2px white, 0 0 0 4px #1d4ed8' : 'none'
            }}
            aria-label={`MST tone ${tone}`}
            aria-pressed={isSelected}
          />
        );
      })}
    </div>
  );
}
