import type { Color } from "../../engine/types";
import { SIZE } from "../../engine/engine";

const TILE_COLOR_VAR: Record<Color, string> = {
  red: "var(--tile-r)",
  green: "var(--tile-g)",
  blue: "var(--tile-b)",
};

type Props = {
  grid: Color[];
  disabled?: boolean;
  onTileClick: (index: number) => void;
  tileSize?: number;
};

export function Grid({ grid, disabled = false, onTileClick, tileSize = 50 }: Props) {
  const gap = 6;
  const padding = 8;
  const totalSize = SIZE * tileSize + (SIZE - 1) * gap + padding * 2;

  return (
    <div
      style={{
        background: "var(--grid-border)",
        borderRadius: 16,
        padding,
        width: totalSize,
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
          gap,
        }}
      >
        {grid.map((color, index) => (
          <button
            key={index}
            type="button"
            onClick={() => {
              if (disabled) return;
              onTileClick(index);
            }}
            aria-label={`cell-${index} ${color}`}
            style={{
              aspectRatio: "1 / 1",
              background: TILE_COLOR_VAR[color],
              borderRadius: 8,
              border: "none",
              padding: 0,
              cursor: disabled ? "default" : "pointer",
            }}
          />
        ))}
      </div>
    </div>
  );
}
