import type { ArtworkDesign } from "./theme-artwork-config";

/** Theme-specific stills remain legible while WebGL is closed or unavailable. */
export default function ArtworkFallback({
  design,
  context,
  className,
  hidden,
}: {
  design: ArtworkDesign;
  context: "home" | "about";
  className: string;
  hidden: boolean;
}) {
  const about = context === "about";
  return (
    <svg
      className={className}
      viewBox="0 0 600 420"
      aria-hidden="true"
      style={{ visibility: hidden ? "hidden" : "visible" }}
    >
      <g
        fill="currentColor"
        fillOpacity=".06"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity=".5"
        strokeLinejoin="round"
      >
        {design === "space" ? (
          about ? (
            <g fill="none">
              {[0, 1, 2, 3, 4].map((i) => (
                <path
                  key={i}
                  d={`M100 ${280 - i * 18} C220 ${310 - i * 14} 300 ${70 + i * 20} 500 ${125 + i * 14}`}
                />
              ))}
            </g>
          ) : (
            <g>
              <path d="M220 310 180 180 240 95 285 180 280 310ZM280 310 270 130 325 65 375 145 350 310ZM350 310 360 190 410 130 450 220 405 310Z" />
              <path
                d="M240 95 240 280M325 65 325 290M410 130 395 290M180 180 240 220 285 180M270 130 325 180 375 145"
                fill="none"
              />
            </g>
          )
        ) : design === "clear" ? (
          <g fill="none" strokeWidth="13">
            <path d="M211 292C102 230 195 76 300 100S420 280 334 300 170 234 240 162 455 126 447 235 304 334 211 292Z" />
            <path
              d="M211 292C102 230 195 76 300 100S420 280 334 300 170 234 240 162 455 126 447 235 304 334 211 292Z"
              stroke="var(--page-bg, #fff)"
              strokeWidth="6"
            />
          </g>
        ) : design === "classic" ? (
          about ? (
            <g>
              <path d="M100 270 180 120 265 195 350 80 440 170 500 270 430 320 350 250 265 320 180 245Z" />
              <path d="M180 120V245M265 195V320M350 80V250M440 170 430 320" />
            </g>
          ) : (
            <g>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <path
                  key={i}
                  d={`M${115 + i * 24} ${275 - i * 25} Q${160 + i * 15} ${195 - i * 15} 300 ${205 - i * 22} Q${425 - i * 15} ${175 - i * 12} ${490 - i * 25} ${255 - i * 22} Q360 ${350 - i * 20} ${115 + i * 24} ${275 - i * 25}Z`}
                />
              ))}
            </g>
          )
        ) : design === "garden" ? (
          <g fill="none">
            <ellipse cx="300" cy="338" rx="28" ry="7" />
            <path d="M300 331C292 262 308 198 300 91M282 337 300 318 318 337" />
            <path d="M300 112Q271 109 273 79Q297 83 300 112ZM300 112Q327 105 329 77Q307 80 300 112ZM300 112Q286 87 299 62Q314 83 300 112ZM300 91Q309 77 317 80Q317 90 300 91Z" />
            <path
              d="M273 79 300 112 329 77M300 112 299 62M300 91 317 80"
              strokeOpacity=".3"
            />
            {about ? (
              <g>
                <path d="M300 289Q237 271 189 215M300 248Q357 240 406 189M302 204Q256 180 221 137M301 169Q344 146 369 111" />
                <path d="M249 265Q211 271 205 239Q236 236 249 265ZM350 233Q360 198 390 205Q388 233 350 233ZM267 186Q239 191 237 163Q257 160 267 186Z" />
                <path d="M205 239 249 265M350 233 390 205M237 163 267 186" />
                <path
                  d="M189 215 221 137M406 189 369 111"
                  strokeOpacity=".25"
                />
                {[
                  [189, 215],
                  [221, 137],
                  [369, 111],
                  [406, 189],
                ].map(([x, y]) => (
                  <g key={x}>
                    <circle
                      cx={x}
                      cy={y}
                      r="5"
                      fill="currentColor"
                      fillOpacity=".3"
                    />
                    <circle cx={x} cy={y} r="10" strokeOpacity=".25" />
                  </g>
                ))}
              </g>
            ) : (
              <g>
                <path d="M298 290Q219 297 196 235Q267 224 298 290ZM302 253Q376 262 402 194Q328 186 302 253ZM301 211Q238 209 223 150Q283 146 301 211ZM301 168Q354 171 370 116Q313 111 301 168" />
                <path d="M196 235 298 290M302 253 402 194M223 150 301 211M301 168 370 116" />
              </g>
            )}
          </g>
        ) : design === "photo" ? (
          about ? (
            <g>
              {[0, 1, 2, 3, 4].map((i) => (
                <path
                  key={i}
                  d={`M${150 + i * 60} ${125 - i * 8}Q${180 + i * 60} 100 ${210 + i * 60} ${117 - i * 8}V295Q${180 + i * 60} 275 ${150 + i * 60} 305Z`}
                />
              ))}
            </g>
          ) : (
            <g>
              {[0, 1, 2].map((i) => (
                <g key={i}>
                  <ellipse
                    cx={210 + i * 85}
                    cy={235 - i * 25}
                    rx="80"
                    ry="113"
                  />
                  <ellipse
                    cx={210 + i * 85}
                    cy={235 - i * 25}
                    rx="62"
                    ry="94"
                  />
                </g>
              ))}
              <path d="M195 350 420 285M120 235 345 170" />
            </g>
          )
        ) : design === "construct" ? (
          <g>
            <path d="M140 150 355 90 465 155 250 215ZM140 150V280L250 345 465 280V155M250 215V345M140 280 355 220 465 280M355 90V220" />
            <path d="M180 185 250 230 425 180V255L250 300 180 260Z" />
          </g>
        ) : design === "map" ? (
          <g fill="none">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <path
                key={i}
                d={`M${120 + i * 53} ${120 + Math.sin(i) * 35}Q${190 + i * 32} ${300 - i * 10} ${150 + i * 50} ${310 - Math.sin(i) * 25}`}
              />
            ))}
            {[0, 1, 2, 3, 4].map((i) => (
              <path
                key={i}
                d={`M${120 + i * 7} ${120 + i * 47}Q280 ${270 - i * 17} ${438 + i * 3} ${110 + i * 50}`}
              />
            ))}
          </g>
        ) : about ? (
          <g>
            <path d="M85 240 285 285 505 230V252L285 310 85 265ZM285 285V310M85 240V100Q190 85 285 135Q395 75 505 110V230Q395 210 285 285Q185 215 85 240Z" />
            <path d="M285 285V135Q355 145 407 65V205Q352 245 285 285Z" />
            <path
              d="M120 155 175 140 210 165 255 150M120 195 170 185 220 205 255 190"
              fill="none"
            />
          </g>
        ) : (
          <g fill="none">
            <ellipse cx="300" cy="196" rx="140" ry="130" />
            <ellipse
              cx="300"
              cy="196"
              rx="75"
              ry="130"
              transform="rotate(38 300 196)"
            />
            <ellipse
              cx="300"
              cy="196"
              rx="140"
              ry="48"
              transform="rotate(-20 300 196)"
            />
            <circle
              cx="300"
              cy="196"
              r="27"
              fill="currentColor"
              fillOpacity=".12"
            />
            <path d="M300 326V350M235 355Q300 330 365 355" />
          </g>
        )}
      </g>
    </svg>
  );
}
