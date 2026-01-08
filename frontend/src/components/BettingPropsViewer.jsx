// src/components/BettingPropsViewer.jsx
import { useEffect, useState } from 'react';

function BettingPropsViewer() {
  const [props, setProps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [playerId, setPlayerId] = useState('');

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    fetch(`/api/betting/props?playerId=${playerId}`)
      .then(res => res.json())
      .then(data => {
        setProps(data.props || []);
        setLoading(false);
      });
  }, [playerId]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">🎯 Betting Props Viewer</h2>
      <input
        placeholder="Enter Player ID"
        className="border p-2 rounded mr-2"
        value={playerId}
        onChange={e => setPlayerId(e.target.value)}
      />
      {loading ? <p>Loading...</p> : (
        <ul className="mt-4">
          {props.map(p => (
            <li key={p._id} className="mb-2 border p-2 rounded">
              <strong>{p.prop_type}</strong>: {p.line_value} ({p.vendor})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default BettingPropsViewer;
