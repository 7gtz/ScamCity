/**
 * T0 procedural background — Bank branch interior.
 *
 * Shapes: counter line, queue barrier, teller window, ATM alcove.
 * Tone: paper. Design tokens only — never raw hex.
 */

export function BankBranchBackground() {
  return (
    <div className="panel-bg" aria-hidden="true">
      {/* Counter line — long horizontal, mid-height */}
      <div
        style={{
          position: "absolute",
          left: "5%",
          top: "52%",
          width: "55%",
          height: "3px",
          background: "var(--color-paper-line)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "5%",
          top: "45%",
          width: "55%",
          height: "10%",
          background: "var(--color-paper-2)",
          borderBottom: "2px solid var(--color-paper-line)",
        }}
      />

      {/* Queue barrier — zigzag rope stands */}
      <div
        style={{
          position: "absolute",
          left: "8%",
          top: "72%",
          width: "38%",
          height: "18%",
        }}
      >
        {/* Stanchion posts */}
        {[0, 33, 66, 100].map((pct) => (
          <div
            key={pct}
            style={{
              position: "absolute",
              left: `${pct}%`,
              bottom: 0,
              width: "4px",
              height: "100%",
              background: "var(--color-paper-muted)",
              opacity: 0.4,
            }}
          />
        ))}
        {/* Rope lines */}
        {[0, 33, 66].map((pct) => (
          <div
            key={`rope-${pct}`}
            style={{
              position: "absolute",
              left: `${pct}%`,
              top: "25%",
              width: "33%",
              height: "2px",
              background: "var(--color-paper-muted)",
              opacity: 0.3,
            }}
          />
        ))}
      </div>

      {/* Teller window — upper right area */}
      <div
        style={{
          position: "absolute",
          right: "18%",
          top: "15%",
          width: "22%",
          height: "32%",
          background: "var(--color-paper-2)",
          border: "2px solid var(--color-paper-line)",
        }}
      >
        {/* Glass panel */}
        <div
          style={{
            position: "absolute",
            inset: "12%",
            background: "linear-gradient(180deg, color-mix(in oklch, var(--color-amber) 5%, transparent), transparent)",
            border: "1px solid var(--color-paper-line)",
          }}
        />
      </div>

      {/* ATM alcove — right side, darker */}
      <div
        style={{
          position: "absolute",
          right: "2%",
          top: "38%",
          width: "14%",
          height: "48%",
          background: "var(--color-paper-2)",
          borderLeft: "2px solid var(--color-paper-line)",
        }}
      >
        {/* ATM screen */}
        <div
          style={{
            position: "absolute",
            top: "15%",
            left: "20%",
            width: "60%",
            height: "25%",
            background: "var(--color-paper-muted)",
            opacity: 0.2,
            borderRadius: "2px",
          }}
        />
        {/* Keypad */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "25%",
            width: "50%",
            height: "20%",
            background: "var(--color-paper-line)",
            opacity: 0.3,
            borderRadius: "2px",
          }}
        />
      </div>
    </div>
  );
}
