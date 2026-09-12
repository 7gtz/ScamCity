/**
 * T0 procedural background — Detective office.
 *
 * Shapes: desk, window with amber slat lines, corkboard, door.
 * Tone: ember. Design tokens only — never raw hex.
 */

export function OfficeBackground() {
  return (
    <div className="panel-bg" aria-hidden="true">
      {/* Desk — large dark rectangle */}
      <div
        style={{
          position: "absolute",
          left: "10%",
          bottom: "8%",
          width: "50%",
          height: "28%",
          background: "var(--color-surface)",
          borderTop: "2px solid var(--color-line)",
        }}
      />

      {/* Window with amber slat lines */}
      <div
        style={{
          position: "absolute",
          right: "12%",
          top: "8%",
          width: "28%",
          height: "42%",
          background: "var(--color-ink)",
          border: "2px solid var(--color-line)",
        }}
      >
        {/* Amber blinds */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "8%",
              right: "8%",
              top: `${12 + i * 14}%`,
              height: "3px",
              background: "var(--color-amber)",
              opacity: 0.5 - i * 0.06,
            }}
          />
        ))}
      </div>

      {/* Corkboard — textured rectangle on the wall */}
      <div
        style={{
          position: "absolute",
          left: "5%",
          top: "10%",
          width: "22%",
          height: "35%",
          background: "var(--color-raised)",
          border: "2px solid var(--color-line)",
        }}
      >
        {/* Pin marks */}
        <div
          style={{
            position: "absolute",
            top: "15%",
            left: "20%",
            width: "6px",
            height: "6px",
            borderRadius: "var(--radius-full)",
            background: "var(--color-amber)",
            opacity: 0.7,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "60%",
            width: "6px",
            height: "6px",
            borderRadius: "var(--radius-full)",
            background: "var(--color-amber)",
            opacity: 0.5,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "65%",
            left: "35%",
            width: "6px",
            height: "6px",
            borderRadius: "var(--radius-full)",
            background: "var(--color-amber)",
            opacity: 0.6,
          }}
        />
      </div>

      {/* Door — tall rectangle on the right */}
      <div
        style={{
          position: "absolute",
          right: "2%",
          top: "15%",
          width: "10%",
          height: "65%",
          background: "var(--color-raised)",
          borderLeft: "2px solid var(--color-line)",
          borderTop: "2px solid var(--color-line)",
        }}
      >
        {/* Door handle */}
        <div
          style={{
            position: "absolute",
            left: "15%",
            top: "48%",
            width: "5px",
            height: "12px",
            borderRadius: "2px",
            background: "var(--color-amber)",
            opacity: 0.6,
          }}
        />
      </div>
    </div>
  );
}
