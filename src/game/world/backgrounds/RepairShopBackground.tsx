/**
 * T0 procedural background — Phone-repair shop.
 *
 * Shapes: glass counter, parts wall, workbench, shutter, SIM rack.
 * Tone: ember. Design tokens only — never raw hex.
 */

export function RepairShopBackground() {
  return (
    <div className="panel-bg" aria-hidden="true">
      {/* Parts wall — grid of small rectangles, upper left */}
      <div
        style={{
          position: "absolute",
          left: "3%",
          top: "5%",
          width: "30%",
          height: "38%",
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-line)",
        }}
      >
        {/* Grid of component bins */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${5 + (i % 4) * 24}%`,
              top: `${5 + Math.floor(i / 4) * 32}%`,
              width: "20%",
              height: "28%",
              background: "var(--color-raised)",
              border: "1px solid var(--color-line)",
              opacity: 0.7 + (i % 3) * 0.1,
            }}
          />
        ))}
      </div>

      {/* Glass counter — lower left, reflective surface feel */}
      <div
        style={{
          position: "absolute",
          left: "5%",
          bottom: "8%",
          width: "38%",
          height: "22%",
          background: "var(--color-raised)",
          borderTop: "2px solid var(--color-amber)",
          opacity: 0.9,
        }}
      >
        {/* Glass reflection line */}
        <div
          style={{
            position: "absolute",
            top: "3px",
            left: "5%",
            right: "5%",
            height: "1px",
            background: "var(--color-amber)",
            opacity: 0.3,
          }}
        />
      </div>

      {/* Workbench — middle area */}
      <div
        style={{
          position: "absolute",
          left: "38%",
          bottom: "8%",
          width: "32%",
          height: "30%",
          background: "var(--color-surface)",
          borderTop: "2px solid var(--color-line)",
        }}
      >
        {/* Tool shapes */}
        <div
          style={{
            position: "absolute",
            top: "15%",
            left: "10%",
            width: "25%",
            height: "4px",
            background: "var(--color-dim)",
            borderRadius: "2px",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            width: "15%",
            height: "15%",
            background: "var(--color-dim)",
            borderRadius: "2px",
            opacity: 0.6,
          }}
        />
      </div>

      {/* SIM rack — upper mid-right */}
      <div
        style={{
          position: "absolute",
          right: "22%",
          top: "8%",
          width: "16%",
          height: "30%",
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-line)",
        }}
      >
        {/* SIM card slots */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "12%",
              top: `${10 + i * 22}%`,
              width: "76%",
              height: "16%",
              background: "var(--color-raised)",
              border: "1px solid var(--color-line)",
              borderRadius: "1px",
            }}
          />
        ))}
      </div>

      {/* Shutter — tall right edge, corrugated lines */}
      <div
        style={{
          position: "absolute",
          right: "0%",
          top: "0%",
          width: "15%",
          height: "100%",
          background: "var(--color-surface)",
          borderLeft: "2px solid var(--color-line)",
        }}
      >
        {/* Corrugated shutter lines */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${i * 5}%`,
              height: "2px",
              background: "var(--color-line)",
              opacity: 0.4 + (i % 3) * 0.1,
            }}
          />
        ))}
      </div>
    </div>
  );
}
