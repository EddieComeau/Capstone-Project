import PlayRoutesOverlay from "../overlays/PlayRoutesOverlay";

export default function KenneyPlaysBackground() {
  const grass = import.meta.env.VITE_HOME_KENNEY_GRASS || "/kenney/grass_tile.png";

  return (
    <div className="kenneyBg" style={{ backgroundImage: `url(${grass})` }}>
      <img className="kenneySprite helmet h1" src="/kenney/helmet_home.png" alt="" />
      <img className="kenneySprite helmet h2" src="/kenney/helmet_away.png" alt="" />
      <img className="kenneySprite ball" src="/kenney/football.png" alt="" />
      <PlayRoutesOverlay />
    </div>
  );
}
