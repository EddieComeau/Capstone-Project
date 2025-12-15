export default function PlayRoutesOverlay() {
    return (
      <svg className="routesSvg" viewBox="0 0 1200 700" preserveAspectRatio="none">
        <path className="route" d="M80,520 C260,520 240,280 440,280 C620,280 640,140 820,140" />
        <path className="route" d="M120,160 C250,200 280,260 420,320 C520,360 640,360 760,340" />
        <path className="route" d="M200,620 C260,560 320,520 420,500 C560,470 700,520 820,600" />
        <circle className="routeDot d1" cx="80" cy="520" r="10" />
        <circle className="routeDot d2" cx="120" cy="160" r="10" />
        <circle className="routeDot d3" cx="200" cy="620" r="10" />
      </svg>
    );
  }
  