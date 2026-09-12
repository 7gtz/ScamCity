/**
 * T0 procedural background — Victim's flat.
 *
 * Shapes: kitchen table, landline/mobile, front door, window, sideboard.
 * Tone: dark. Design tokens only — never raw hex.
 */

export function VictimFlatBackground() {
  return (
    <div className="panel-bg" aria-hidden="true">
      {/* Window — upper left, dark with faint light */}
      <div
        style={{
          position: "absolute",
          left: "4%",
          top: "8%",
          width: "24%",
          height: "32%",
          background: "var(--color-surface)",
          border: "2px solid var(--color-line)",
        }}
      >
        {/* Faint amber light through curtain */}
        <div
          style={{
            position: "absolute",
            inset: "10%",
            background: "linear-gradient(180deg, color-mix(in oklch, var(--color-amber) 12%, transparent) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* Kitchen table — wide surface, lower half */}
      <div
        style={{
          position: "absolute",
          left: "8%",
          bottom: "10%",
          width: "40%",
          height: "22%",
          background: "var(--color-raised)",
          borderTop: "2px solid var(--color-line)",
        }}
      >
        {/* Paper on table */}
        <div
          style={{
            position: "absolute",
            top: "15%",
            left: "12%",
            width: "35%",
            height: "60%",
            background: "var(--color-bone)",
            opacity: 0.1,
            transform: "rotate(-3deg)",
          }}
        />
      </div>

      {/* Landline / phone — small shape on surface */}
      <div
        style={{
          position: "absolute",
          left: "52%",
          bottom: "18%",
          width: "10%",
          height: "10%",
          background: "var(--color-surface)",
          border: "1.5px solid var(--color-line)",
          borderRadius: "2px",
        }}
      >
        {/* Handset shape */}
        <div
          style={{
            position: "absolute",
            top: "-20%",
            left: "15%",
            width: "70%",
            height: "30%",
            background: "var(--color-dim)",
            borderRadius: "2px",
          }}
        />
      </div>

      {/* Sideboard — mid-right area */}
      <div
        style={{
          position: "absolute",
          right: "15%",
          top: "35%",
          width: "25%",
          height: "20%",
          background: "var(--color-raised)",
          border: "1.5px solid var(--color-line)",
        }}
      />

      {/* Front door — tall rectangle on the right */}
      <div
        style={{
          position: "absolute",
          right: "2%",
          top: "10%",
          width: "12%",
          height: "70%",
          background: "var(--color-raised)",
          borderLeft: "2px solid var(--color-line)",
        }}
      >
        {/* Peephole */}
        <div
          style={{
            position: "absolute",
            left: "40%",
            top: "35%",
            width: "8px",
            height: "8px",
            borderRadius: "var(--radius-full)",
            background: "var(--color-dim)",
          }}
        />
        {/* Handle */}
        <div
          style={{
            position: "absolute",
            left: "20%",
            top: "50%",
            width: "5px",
            height: "14px",
            borderRadius: "2px",
            background: "var(--color-smoke)",
            opacity: 0.5,
          }}
        />
      </div>
    </div>
  );
}
