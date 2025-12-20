import { useNavigate } from "react-router-dom";
import RetroStartScreen from "../ui/overlays/RetroStartScreen";

export default function StartPage() {
  const navigate = useNavigate();

  return (
    <section className="startWrap">
      <div className="startBackdrop" aria-hidden="true">
        <div className="startGrid" />
        <div className="startGlow" />
      </div>

      <div className="startPanel">
        <RetroStartScreen onStart={() => navigate("/home")} />
        <p className="startCopy">
          Old-school jumbotron vibes with a flashing marquee. Tap Start to jump into the animated Sideline Studio
          homepage, then hop to depth charts or the retro play-by-play field.
        </p>
        <div className="startActions">
          <button className="primaryBtn" type="button" onClick={() => navigate("/home")}>Start</button>
          <button className="ghostBtn" type="button" onClick={() => navigate("/depth-chart")}>Skip to Depth Chart</button>
        </div>
      </div>
    </section>
  );
}