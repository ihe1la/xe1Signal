export function StrengthBars({ value = 76 }: { value?: number }) {
  return (
    <span className="flex items-end gap-1" aria-label={`Signal strength ${value}`}>
      {[1, 20, 40, 60, 80, 100].map((level, index) => (
        <i key={level} className="block w-1 rounded-sm" style={{ height: `${5 + index * 2}px`, background: value >= level ? "#8f7be9" : "#24242e" }} />
      ))}
    </span>
  );
}
