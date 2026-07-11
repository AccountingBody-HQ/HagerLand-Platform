export function HeroGraphic() {
  const pins = [
    { x: 155, y: 90, label: 'London' },
    { x: 70, y: 110, label: 'Washington DC' },
    { x: 95, y: 85, label: 'Toronto' },
    { x: 320, y: 150, label: 'Addis Ababa' },
    { x: 370, y: 210, label: 'Melbourne' },
  ]

  return (
    <svg viewBox="0 0 420 260" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
      <g opacity="0.5">
        {Array.from({ length: 14 }).map((_, row) =>
          Array.from({ length: 22 }).map((_, col) => (
            <circle
              key={`${row}-${col}`}
              cx={10 + col * 19}
              cy={10 + row * 19}
              r="1.4"
              fill="#D6DAD5"
            />
          ))
        )}
      </g>
      {pins.map((pin) => (
        <g key={pin.label}>
          <circle cx={pin.x} cy={pin.y} r="14" fill="#E9F5EE" />
          <circle cx={pin.x} cy={pin.y} r="5" fill="#1C7C4C" />
        </g>
      ))}
    </svg>
  )
}
