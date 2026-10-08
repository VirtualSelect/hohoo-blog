import React, { useId } from "react";
import styles from "./styles.module.css";

// Schematic layouts, not sky coordinates or a real-time observing chart.
// Big Dipper: closed four-star bowl and a three-star handle (within Ursa Major).
// https://science.nasa.gov/image-article/apod-2006-march-17-the-big-dipper-cluster/
// Cassiopeia: the characteristic five-star W, with Gamma at its central point.
// https://www.esa.int/ESA_Multimedia/Images/2018/10/The_Ghost_Nebula
// Orion's shoulders, belt and feet; Cygnus's Northern Cross; Lyra's parallelogram.
// https://science.nasa.gov/asset/hubble/orion-constellation/
// https://science.nasa.gov/solar-system/skywatching/night-sky-network/the-summer-triangles-hidden-treasures/
const charts = [
  {
    key: "dipper",
    name: ["北斗七星", "Big Dipper", "北斗七星"],
    path: "M16 15 12 45 54 55 67 30 16 15 M67 30 92 25 116 17 139 27",
    stars: [
      ["Dubhe", 16, 15, 1.8],
      ["Merak", 12, 45, 1.4],
      ["Phecda", 54, 55, 1.4],
      ["Megrez", 67, 30, 1.1],
      ["Alioth", 92, 25, 1.8],
      ["Mizar", 116, 17, 1.5],
      ["Alkaid", 139, 27, 1.7],
    ],
  },
  {
    key: "cassiopeia",
    name: ["仙后座", "Cassiopeia", "仙后座"],
    path: "M12 20 41 57 67 29 95 62 125 8",
    stars: [
      ["Caph", 12, 20, 1.5],
      ["Schedar", 41, 57, 1.8],
      ["Gamma Cassiopeiae", 67, 29, 1.7],
      ["Ruchbah", 95, 62, 1.3],
      ["Segin", 125, 8, 1.1],
    ],
  },
  {
    key: "orion",
    name: ["猎户座", "Orion", "獵戶座"],
    path: "M35 12 111 20 89 48 78 53 67 58 35 12 M67 58 43 91 123 85 89 48",
    stars: [
      ["Betelgeuse", 35, 12, 2.1],
      ["Bellatrix", 111, 20, 1.5],
      ["Mintaka", 89, 48, 1.3],
      ["Alnilam", 78, 53, 1.4],
      ["Alnitak", 67, 58, 1.3],
      ["Saiph", 43, 91, 1.5],
      ["Rigel", 123, 85, 2.2],
    ],
  },
  {
    key: "cygnus",
    name: ["天鹅座", "Cygnus", "天鵝座"],
    path: "M71 12 80 40 96 91 M24 55 80 40 137 29",
    stars: [
      ["Deneb", 71, 12, 2.1],
      ["Sadr", 80, 40, 1.8],
      ["Albireo", 96, 91, 1.3],
      ["Gienah", 24, 55, 1.4],
      ["Delta Cygni", 137, 29, 1.4],
    ],
  },
  {
    key: "lyra",
    name: ["天琴座", "Lyra", "天琴座"],
    path: "M25 12 76 25 118 40 102 91 60 77 76 25",
    stars: [
      ["Vega", 25, 12, 2.3],
      ["Zeta Lyrae", 76, 25, 1.2],
      ["Delta Lyrae", 118, 40, 1.1],
      ["Sulafat", 102, 91, 1.4],
      ["Sheliak", 60, 77, 1.3],
    ],
  },
];

export default function Constellations({ t }) {
  const id = useId();
  return charts.map((chart, index) => (
    <svg
      key={chart.key}
      className={styles.constellations}
      data-constellation={chart.key}
      style={{
        "--chart-period": `${10 + index * 1.1}s`,
        "--chart-phase": `${-index * 2.3}s`,
      }}
      viewBox="0 0 160 116"
      role="img"
      aria-label={`${t(...chart.name)} · ${t("艺术化星图", "illustrated star chart", "藝術化星圖")}`}
    >
      <title>{t(...chart.name)}</title>
      <defs>
        <radialGradient id={`${id}-${chart.key}`}>
          <stop offset="0" stopColor="#f5fbff" stopOpacity="0.95" />
          <stop offset="0.15" stopColor="#c8e6ff" stopOpacity="0.6" />
          <stop offset="0.45" stopColor="#9cc6e3" stopOpacity="0.17" />
          <stop offset="1" stopColor="#b5cee2" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path className={styles.starLines} d={chart.path} />
      <path className={styles.starTrace} d={chart.path} pathLength="1" />
      {chart.stars.map(([name, cx, cy, radius], starIndex) => (
        <g
          key={name}
          style={{
            "--star-period": `${3.8 + ((starIndex * 7 + index * 3) % 6) * 0.47}s`,
            "--star-phase": `${-(starIndex * 0.83 + index * 1.37)}s`,
          }}
        >
          <g transform={`translate(${cx} ${cy})`}>
            <circle
              className={styles.starHalo}
              r={radius * 7}
              fill={`url(#${id}-${chart.key})`}
            />
            {radius >= 1.7 && (
              <path
                className={styles.starFlare}
                d={`M0 ${-radius * 5} Q${radius * 0.35} ${-radius * 0.35} ${radius * 3.5} 0 Q${radius * 0.35} ${radius * 0.35} 0 ${radius * 5} Q${-radius * 0.35} ${radius * 0.35} ${-radius * 3.5} 0 Q${-radius * 0.35} ${-radius * 0.35} 0 ${-radius * 5}`}
              />
            )}
            <circle className={styles.starNodes} r={radius * 1.1} />
          </g>
        </g>
      ))}
      <text className={styles.starLabel} x="8" y="110">
        {t(...chart.name)}
      </text>
    </svg>
  ));
}
