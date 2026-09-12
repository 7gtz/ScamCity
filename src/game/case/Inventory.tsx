/**
 * Inventory — items and documents carried between panels.
 *
 * Uses `useGameState(s => s.inventory)` to read the store reactively.
 *
 * Spec: ops/prompts/antigravity-dialogue-case.md §4.6.
 */

"use client";

import { useGameState } from "@/game/integration/use-game-state";

export interface InventoryProps {
  /** Optional callback when an item is selected for detail view. */
  onSelectItem?: (itemId: string) => void;
  className?: string;
}

/**
 * Renders the player's carried items.
 *
 * Uses design tokens only. Keyboard operable.
 */
export function Inventory({ onSelectItem, className = "" }: InventoryProps) {
  const inventory = useGameState((s) => s.inventory);

  if (inventory.length === 0) {
    return (
      <aside
        aria-label="Inventory"
        className={`border border-line bg-ink/90 p-4 text-sm ${className}`}
      >
        <h3 className="mb-2 font-semibold text-smoke">Inventory</h3>
        <p className="text-dim italic">No items carried.</p>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Inventory"
      className={`border border-line bg-ink/90 p-4 text-sm ${className}`}
    >
      <h3 className="mb-3 font-semibold text-smoke">Inventory</h3>
      <ul className="flex flex-col gap-1">
        {inventory.map((itemId) => (
          <li key={itemId}>
            <button
              type="button"
              onClick={() => onSelectItem?.(itemId)}
              className="w-full rounded px-3 py-2 text-left text-ash transition-colors hover:bg-raised hover:text-bone focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber"
            >
              {itemId}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
