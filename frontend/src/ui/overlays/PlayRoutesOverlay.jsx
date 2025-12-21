export default function PlayRoutesOverlay({ routes = [], dots = [] }) {
  return (
    <svg className="routesSvg" viewBox="0 0 1200 700" preserveAspectRatio="none">
      {/* Render routes */}
      {routes.map((route, index) => (
        <path key={`route-${index}`} className="route" d={route} />
      ))}

      {/* Render dots */}
      {dots.map((dot, index) => (
        <circle
          key={`dot-${index}`}
          className={`routeDot d${index + 1}`}
          cx={dot.cx}
          cy={dot.cy}
          r={dot.r || 10} // Default radius is 10
        />
      ))}
    </svg>
  );
}
