export default function RetroStartScreen({ onStart }) {
    return (
      <div className="retroStart">
        <div className="retroScanlines" aria-hidden="true" />
        <div className="retroFrame">
          <div className="retroTop">SIDELINE STUDIO</div>
          <div className="retroFlash">PRESS START</div>
          <div className="retroSub">Pro Football Companion</div>
          {onStart ? (
            <button className="retroStartBtn" type="button" onClick={onStart}>
              START
            </button>
          ) : null}
        </div>
      </div>
    );
  }