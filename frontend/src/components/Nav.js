import React from 'react';
import { Link } from 'react-router-dom';

export default function Nav() {
  return (
    <div className="header">
      <div className="container" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <Link to="/" style={{color:'#fff', fontWeight:700, textDecoration:'none'}}>NFL Cards</Link>
        </div>
        <nav>
          <Link to="/" style={{color:'#fff', marginRight:12}}>Home</Link>
          <Link to="/players" style={{color:'#fff', marginRight:12}}>Players</Link>
          <Link to="/teams" style={{color:'#fff', marginRight:12}}>Teams</Link>
          <Link to="/metrics" style={{color:'#fff'}}>Metrics</Link>
        </nav>
      </div>
    </div>
  );
}
