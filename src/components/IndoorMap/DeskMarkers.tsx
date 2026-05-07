import type { Desk } from "@/utils/bookingApi";

interface DeskMarkersProps {
  desks: Desk[];
  currentFloor: number;
  onDeskClick: (desk: Desk) => void;
}

/**
 * Renders desk markers on the SVG map.
 * Clean pill-shaped markers with a status dot and short label.
 */
function DeskMarkers({ desks, currentFloor, onDeskClick }: DeskMarkersProps) {
  const floorDesks = desks.filter((d) => d.floor === currentFloor);

  return (
    <g id="DeskMarkers">
      {floorDesks.map((desk) => {
        let x = 0, y = 0;
        try {
          const loc = JSON.parse(desk.location);
          x = loc.x;
          y = loc.y;
        } catch {
          return null;
        }

        const isAvailable = desk.status === "available";
        const label = desk.name.replace("Desk-", "");

        return (
          <g
            key={desk.id}
            onClick={() => onDeskClick(desk)}
            className="desk-marker cursor-pointer"
          >
            {/* Outer glow ring */}
            <circle
              cx={x}
              cy={y}
              r={24}
              fill={isAvailable ? "#22c55e" : "#ef4444"}
              opacity={0.08}
              className={isAvailable ? "desk-pulse" : ""}
            />

            {/* Pill background */}
            <rect
              x={x - 22}
              y={y - 12}
              width={44}
              height={24}
              rx={12}
              fill={isAvailable ? "#f0fdf4" : "#fef2f2"}
              stroke={isAvailable ? "#86efac" : "#fca5a5"}
              strokeWidth={1.5}
            />

            {/* Status dot */}
            <circle
              cx={x - 10}
              cy={y}
              r={3.5}
              fill={isAvailable ? "#22c55e" : "#ef4444"}
            />

            {/* Label */}
            <text
              x={x + 6}
              y={y + 0.5}
              fontSize={10}
              fontFamily="Arial, sans-serif"
              fontWeight={700}
              fill={isAvailable ? "#166534" : "#991b1b"}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export default DeskMarkers;
