/**
 * T0 procedural background — Police station front desk.
 *
 * Shapes: front desk, notice board, corridor door.
 * Tone: dark. Design tokens only — never raw hex.
 */

export function PoliceStationBackground() {
  return (
    <div className="panel-bg" aria-hidden="true">
      {/* Notice board — upper left, institutional feel */}
      <div
        style={{
          position: "absolute",
          left: "4%",
          top: "6%",
          width: "28%",
          height: "28%",
          background: "var(--color-raised)",
          border: "2px solid var(--color-line)",
        }}
      >
        {/* Notices / papers */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "10%",
            width: "35%",
            height: "40%",
            background: "var(--color-bone)",
            opacity: 0.08,
            transform: "rotate(-2deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "20%",
            right: "10%",
            width: "30%",
            height: "35%",
            background: "var(--color-bone)",
            opacity: 0.06,
            transform: "rotate(1deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "12%",
            left: "25%",
            width: "40%",
            height: "25%",
            background: "var(--color-bone)",
            opacity: 0.07,
          }}
        />
      </div>

      {/* Front desk — large horizontal surface */}
      <div
        style={{
          position: "absolute",
          left: "8%",
          top: "45%",
          width: "55%",
          height: "25%",
          background: "var(--color-raised)",
          borderTop: "3px solid var(--color-line)",
        }}
      >
        {/* Desk items */}
        <div
          style={{
            position: "absolute",
            top: "15%",
            right: "8%",
            width: "12%",
            height: "35%",
            background: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            borderRadius: "2px",
          }}
        />
        {/* Badge / nameplate */}
        <div
          style={{
            position: "absolute",
            top: "-12px",
            left: "5%",
            width: "20%",
            height: "8px",
            background: "var(--color-amber)",
            opacity: 0.4,
            borderRadius: "1px",
          }}
        />
      </div>

      {/* Corridor door — tall, right side, institutional */}
      <div
        style={{
          position: "absolute",
          right: "5%",
          top: "10%",
          width: "16%",
          height: "60%",
          background: "var(--color-surface)",
          border: "2px solid var(--color-line)",
        }}
      >
        {/* Door window — small reinforced glass */}
        <div
          style={{
            position: "absolute",
            top: "12%",
            left: "15%",
            width: "70%",
            height: "20%",
            background: "var(--color-dim)",
            opacity: 0.3,
            border: "1px solid var(--color-line)",
          }}
        />
        {/* Push plate */}
        <div
          style={{
            position: "absolute",
            top: "45%",
            left: "25%",
            width: "50%",
            height: "12%",
            background: "var(--color-dim)",
            opacity: 0.25,
            borderRadius: "1px",
          }}
        />
        {/* "RESTRICTED" indication */}
        <div
          style={{
            position: "absolute",
            bottom: "8%",
            left: "10%",
            right: "10%",
            height: "4px",
            background: "var(--color-amber)",
            opacity: 0.3,
          }}
        />
      </div>

      {/* Floor line — ground plane */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: "12%",
          height: "2px",
          background: "var(--color-line)",
          opacity: 0.4,
        }}
      />
    </div>
  );
}
