import React from 'react';
import { GameCanvas } from './components/GameCanvas';

export default function App() {
  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none">
      <div className="scanline pointer-events-none opacity-50 z-50"></div>
      <GameCanvas />
    </div>
  );
}
