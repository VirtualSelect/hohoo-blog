// Conceptual artwork, not measured research data. Deterministic paths also render in SSR.
const terrainLines = Array.from({ length: 52 }, (_, row) => {
  const depth = row / 51;
  const points = Array.from({ length: 89 }, (_, point) => {
    const x = (point / 88) * 1600;
    const envelope = Math.sin(depth * Math.PI) ** 0.75;
    const ridge =
      165 * Math.exp(-(((x - 1030 - depth * 120) / 180) ** 2)) +
      85 * Math.exp(-(((x - 410 + depth * 120) / 220) ** 2)) +
      70 * Math.exp(-(((x - 1500) / 190) ** 2));
    const y =
      215 + depth * 255 - ridge * envelope + 14 * Math.sin(x / 145 + depth * 6);
    return `${point ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return points.join(" ");
});

export function ResearchTerrain() {
  return (
    <svg
      className="atlas-terrain"
      viewBox="0 0 1600 500"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {terrainLines.map((path, index) => (
        <path
          key={index}
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          opacity={0.12 + Math.sin((index / 51) * Math.PI) * 0.47}
        />
      ))}
    </svg>
  );
}

export function DocumentFlow() {
  return (
    <svg className="atlas-documents" viewBox="0 0 690 370" aria-hidden="true">
      <g className="atlas-doc-connect" fill="none" strokeWidth="2">
        <path d="M155 193 338 248 555 187" />
        <circle cx="155" cy="193" r="4" />
        <circle cx="338" cy="248" r="4" />
        <circle cx="555" cy="187" r="4" />
      </g>
      <g transform="translate(55 110) rotate(-17) skewX(19)">
        <rect
          className="atlas-sheet-shadow"
          x="-7"
          y="16"
          width="155"
          height="126"
          rx="9"
        />
        <rect className="atlas-sheet" width="155" height="126" rx="9" />
        <path
          className="atlas-doc-connect"
          d="M30 41c0-19 32-20 32-3 0 10-18 9-18 20m0 9v3"
          fill="none"
          strokeWidth="4"
        />
        <path className="atlas-doc-lines" d="M27 88h98M27 100h72" />
      </g>
      <g transform="translate(270 110) rotate(-13) skewX(18)">
        <rect
          className="atlas-sheet-shadow"
          x="-5"
          y="19"
          width="220"
          height="166"
          rx="9"
        />
        <rect className="atlas-sheet" width="220" height="166" rx="9" />
        <path className="atlas-doc-window" d="M0 30h220" />
        <g className="atlas-doc-dot">
          <circle cx="18" cy="16" r="3" />
          <circle cx="31" cy="16" r="3" />
          <circle cx="44" cy="16" r="3" />
        </g>
        <path
          className="atlas-doc-connect"
          d="m48 54-13 12 13 12m38-24 13 12-13 12m-18-29-9 33"
          fill="none"
          strokeWidth="3"
        />
        <path
          className="atlas-doc-lines"
          d="M34 103h150M34 119h125M34 135h147"
        />
      </g>
      <g transform="translate(518 104) rotate(14) skewX(-17)">
        <rect
          className="atlas-sheet-shadow"
          x="6"
          y="18"
          width="138"
          height="126"
          rx="9"
        />
        <rect className="atlas-sheet" width="138" height="126" rx="9" />
        <path
          className="atlas-doc-connect"
          d="M28 30h31l14 14v30H28Zm31 0v14h14M37 53h23M37 63h18"
          fill="none"
          strokeWidth="2"
        />
        <path className="atlas-doc-lines" d="M27 91h85M27 104h66" />
      </g>
      <g className="atlas-doc-labels">
        <text x="75" y="55">
          QUESTION
        </text>
        <text x="326" y="60">
          CODE
        </text>
        <text x="541" y="57">
          EVIDENCE
        </text>
      </g>
      <g className="atlas-doc-connect" fill="none">
        <path d="m125 63 3 30m235-25-6 27m219-28-4 25" />
      </g>
    </svg>
  );
}

export function ArticleSketch({ domain }: { domain?: string }) {
  return (
    <svg
      viewBox="0 0 360 150"
      className="atlas-article-sketch"
      aria-hidden="true"
    >
      {domain === "embodied-ai" ? (
        <g fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M100 122h160M142 122l21-42 42-17-25-37m-30 97 30-40 41-20-33-37M175 23l19-6m-6 9 20-4M207 20l16 14" />
          <circle cx="170" cy="81" r="10" />
          <circle cx="212" cy="63" r="8" />
          <circle cx="183" cy="26" r="6" />
          <path d="M242 109h26v14h-26z" strokeDasharray="4 4" />
        </g>
      ) : domain === "ai-apps" ? (
        <g fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="80" y="39" width="92" height="57" rx="9" />
          <path d="m95 96-4 16 22-16M188 62h79v48h-10l4 14-23-14h-50zM98 58h49m-49 14h35m67 7h48m-48 14h32" />
        </g>
      ) : (
        <g fill="none" stroke="currentColor" strokeWidth="1.7">
          <rect x="31" y="61" width="45" height="30" rx="5" />
          <path d="M84 76h45m-9-7 9 7-9 7" />
          <rect x="140" y="49" width="69" height="54" rx="7" />
          <path d="M220 76h39m-9-7 9 7-9 7" />
          <rect x="272" y="36" width="20" height="24" rx="2" />
          <rect x="296" y="36" width="20" height="24" rx="2" />
          <rect x="272" y="65" width="20" height="24" rx="2" />
          <rect x="296" y="65" width="20" height="24" rx="2" />
          <rect x="272" y="94" width="20" height="24" rx="2" />
          <rect x="296" y="94" width="20" height="24" rx="2" />
          <text
            x="174"
            y="81"
            textAnchor="middle"
            fill="currentColor"
            stroke="none"
            fontSize="13"
            fontFamily="monospace"
          >
            K / V
          </text>
        </g>
      )}
    </svg>
  );
}
