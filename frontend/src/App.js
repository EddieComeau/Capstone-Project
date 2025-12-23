import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import Home from './pages/Home';
import Players from './pages/Players';
import Teams from './pages/Teams';
import Metrics from './pages/Metrics';

export default function App() {
  return (
    <>
      <Nav />
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/players" element={<Players />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/metrics" element={<Metrics />} />
        </Routes>
      </div>
    </>
  );
}
