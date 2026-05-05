import React, { useEffect, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { initAuth, testConnection } from './services/firebase';

export default function App() {
  useEffect(() => {
    initAuth();
    testConnection();
  }, []);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none">
      <div className="scanline pointer-events-none opacity-50 z-50"></div>
      <GameCanvas />
    </div>
  );
}
