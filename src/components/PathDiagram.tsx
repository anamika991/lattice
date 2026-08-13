"use client";

type Step = {
  label: string;
  meta?: string;
};

type Props = {
  steps: Step[];
};

export function PathDiagram({ steps }: Props) {
  if (steps.length === 0) return null;

  return (
    <div className="overflow-x-auto pb-2">
      <svg
        viewBox={`0 0 ${Math.max(640, steps.length * 180)} 140`}
        className="h-36 w-full min-w-[640px]"
        role="img"
        aria-label="Career path diagram"
      >
        <defs>
          <linearGradient id="nodeFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3d7a62" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0e2420" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {steps.slice(0, -1).map((_, i) => {
          const x1 = 90 + i * 180;
          const x2 = 90 + (i + 1) * 180;
          return (
            <line
              key={`line-${i}`}
              x1={x1 + 48}
              y1={56}
              x2={x2 - 48}
              y2={56}
              className="path-line"
              stroke="#c9854a"
              strokeWidth="2"
            />
          );
        })}

        {steps.map((step, i) => {
          const x = 90 + i * 180;
          return (
            <g key={`${step.label}-${i}`} className="fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
              <circle cx={x} cy={56} r={34} fill="url(#nodeFill)" stroke="#a8c4b8" strokeWidth="1.5" />
              <text
                x={x}
                y={60}
                textAnchor="middle"
                fill="#f3f7f4"
                fontSize="12"
                fontFamily="var(--font-display)"
              >
                {i + 1}
              </text>
              <text
                x={x}
                y={110}
                textAnchor="middle"
                fill="#d7e6df"
                fontSize="13"
                fontFamily="var(--font-body)"
              >
                {truncate(step.label, 22)}
              </text>
              {step.meta && (
                <text
                  x={x}
                  y={128}
                  textAnchor="middle"
                  fill="#a8c4b8"
                  fontSize="11"
                  fontFamily="var(--font-body)"
                >
                  {truncate(step.meta, 28)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
