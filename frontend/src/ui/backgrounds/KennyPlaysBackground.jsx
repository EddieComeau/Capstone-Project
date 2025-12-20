import { useMemo, useState } from "react";
import PlayRoutesOverlay from "../overlays/PlayRoutesOverlay";

export default function KenneyPlaysBackground() {
  const [spritesOk, setSpritesOk] = useState(true);
  const grass = import.meta.env.VITE_HOME_KENNEY_GRASS || "/kenney/grass_tile.png";

  const kenneyStyle = {
    "--kenney-img": `url(${grass})`,
    backgroundImage: `linear-gradient(135deg, rgba(15, 59, 22, 0.35), rgba(5, 7, 13, 0.25)), url(${grass})`,
    backgroundBlendMode: "overlay, normal",
  };

  const fallbackSprites = useMemo(
    () => (
      <div className="kenneyFallback" aria-hidden="true">
        <div className="helmetChip home">HOME</div>
        <div className="helmetChip away">AWAY</div>
        <div className="ballChip">BALL</div>
      </div>
    ),
    []
  );

  return (
    <div className="kenneyBg" style={kenneyStyle}>
      {spritesOk ? (
        <>
          <img
            className="kenneySprite helmet h1"
            src="/kenney/helmet_home.png"
            alt="Home helmet"
            onError={() => setSpritesOk(false)}
          />
          <img
            className="kenneySprite helmet h2"
            src="/kenney/helmet_away.png"
            alt="Away helmet"
            onError={() => setSpritesOk(false)}
          />
          <img
            className="kenneySprite ball"
            src="/kenney/football.png"
            alt="Football"
            onError={() => setSpritesOk(false)}
          />
        </>
      ) : (
        fallbackSprites
      )}
      <PlayRoutesOverlay />
    </div>
  );
}