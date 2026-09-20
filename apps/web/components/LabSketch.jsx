// Decorative schematics. Meaningful labels live in the surrounding HTML.
export default function LabSketch({ kind = "application" }) {
  return (
    <svg
      className="lab-sketch"
      viewBox="0 0 240 120"
      fill="none"
      aria-hidden="true"
    >
      {kind === "application" ? (
        <>
          <path d="M48 60h52m40 0h52" stroke="currentColor" />
          <rect
            x="16"
            y="39"
            width="32"
            height="42"
            rx="3"
            stroke="currentColor"
          />
          <rect
            x="100"
            y="30"
            width="40"
            height="60"
            rx="3"
            stroke="currentColor"
          />
          <rect
            x="192"
            y="39"
            width="32"
            height="42"
            rx="3"
            stroke="currentColor"
          />
          <path
            d="m81 54 6 6-6 6m88-12 6 6-6 6M26 51h12m-12 8h8m76-12h20m-20 10h14m-14 10h20m62-12h12"
            stroke="currentColor"
          />
        </>
      ) : kind === "model" ? (
        <>
          {[25, 60, 95].map((y) => (
            <g key={y}>
              <path
                d={`M35 ${y}L120 25M35 ${y}L120 60M35 ${y}L120 95M120 ${y}L205 60`}
                stroke="currentColor"
                opacity=".3"
              />
              <circle cx="35" cy={y} r="6" fill="currentColor" />
              <circle
                cx="120"
                cy={y}
                r="8"
                fill="var(--hh-bg)"
                stroke="currentColor"
              />
            </g>
          ))}
          <circle cx="205" cy="60" r="12" stroke="currentColor" />
        </>
      ) : (
        <>
          <path
            d="M45 60a75 36 0 0 1 150 0m0 0a75 36 0 0 1-150 0"
            stroke="currentColor"
            strokeDasharray="4 5"
          />
          <circle
            cx="45"
            cy="60"
            r="12"
            fill="var(--hh-bg)"
            stroke="currentColor"
          />
          <circle
            cx="195"
            cy="60"
            r="12"
            fill="var(--hh-bg)"
            stroke="currentColor"
          />
          <rect
            x="105"
            y="44"
            width="30"
            height="32"
            rx="5"
            stroke="currentColor"
          />
          <circle cx="114" cy="55" r="2" fill="currentColor" />
          <circle cx="126" cy="55" r="2" fill="currentColor" />
          <path
            d="m116 22 7 3-6 5m7 60-7 5 6 3M112 66h16"
            stroke="currentColor"
          />
        </>
      )}
    </svg>
  );
}
