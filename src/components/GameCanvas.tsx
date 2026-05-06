import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from '../services/Engine';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } from '../constants';

import { sounds } from '../services/Sounds';

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef(new GameEngine());
  const [gameState, setGameState] = useState(engineRef.current.state);
  const [keys] = useState(new Set<string>());
  const [cheatMessage, setCheatMessage] = useState('');
  const lastShootRef = useRef(0);
  const sequenceRef = useRef<string[]>([]);
  let lastBossHp = 0;

  const handleSecretPress = (key: string) => {
    const keyMap: Record<string, string> = {
        'w': 'ArrowUp', 's': 'ArrowDown', 'a': 'ArrowLeft', 'd': 'ArrowRight',
        'ArrowUp': 'ArrowUp', 'ArrowDown': 'ArrowDown', 'ArrowLeft': 'ArrowLeft', 'ArrowRight': 'ArrowRight'
    };
    const translatedKey = keyMap[key] || key;
    
    sequenceRef.current.push(translatedKey);
    if (sequenceRef.current.length > 7) sequenceRef.current.shift();
    
    const cheat = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowRight', 'ArrowDown'];
    if (sequenceRef.current.join(',') === cheat.join(',')) {
      engineRef.current.state.player.powerUps.SHIELD = Date.now() + 999999999;
      setCheatMessage('GOD MODE ACTIVE');
      setTimeout(() => setCheatMessage(''), 3000);
      sounds.playTone(440, 'sine', 0.2, 0.1);
      sounds.playTone(880, 'sine', 0.3, 0.1);
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keys.add(e.key);
    handleSecretPress(e.key);
    
    if (e.key === ' ' || e.key === 'f' || e.key === 'e' || e.key === 'E') {
      const now = Date.now();
      if (now - lastShootRef.current > 200) {
        engineRef.current.shoot();
        sounds.shoot();
        lastShootRef.current = now;
      }
    }

    if (e.key === 'Shift' || e.key === 'x' || e.key === 'q' || e.key === 'Q') {
      engineRef.current.parry();
      sounds.parry();
    }
  }, [keys]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keys.delete(e.key);
  }, [keys]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    let animationFrameId: number;
    let lastEnemyCount = engineRef.current.state.enemies.length;
    let lastLives = engineRef.current.state.player.lives;

    const render = () => {
      try {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
          engineRef.current.update(keys, 16, sequenceRef.current);

          // Sound bridges
          const currentState = engineRef.current.state;
          const volMult = currentState.boss ? 0.5 : 1.0; // Duck sounds during boss

          if (currentState.enemies.length < lastEnemyCount || (currentState.boss && currentState.boss.hp < lastBossHp)) {
              sounds.playTone(100, 'sawtooth', 0.2, 0.05 * volMult);
          }
          if (currentState.player.lives < lastLives) {
              sounds.hit();
          }
          
          lastEnemyCount = currentState.enemies.length;
          lastLives = currentState.player.lives;
          lastBossHp = currentState.boss?.hp || 0;

          draw(ctx, engineRef.current.state);
          setGameState({ ...engineRef.current.state });
        }
      } catch (err) {
        console.error("Render loop error:", err);
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [handleKeyDown, handleKeyUp, keys]);

  const draw = (ctx: CanvasRenderingContext2D, state: typeof gameState) => {
    // Clear
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid (8-bit style)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Vines (The Box)
    if (state.vines.left > 0 || state.vines.right < CANVAS_WIDTH) {
        ctx.fillStyle = '#166534';
        ctx.fillRect(0, 0, state.vines.left, CANVAS_HEIGHT);
        ctx.fillRect(state.vines.right, 0, CANVAS_WIDTH - state.vines.right, CANVAS_HEIGHT);
        
        // Thorny texture
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 2;
        for (let i = 0; i < CANVAS_HEIGHT; i += 20) {
            ctx.beginPath();
            ctx.moveTo(state.vines.left, i);
            ctx.lineTo(state.vines.left - 10, i + 10);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(state.vines.right, i);
            ctx.lineTo(state.vines.right + 10, i + 10);
            ctx.stroke();
        }
    }

    // Player
    const p = state.player;
    ctx.fillStyle = p.powerUps.SHIELD > Date.now() ? '#ffffff' : COLORS.PLAYER;
    
    // Parry visual effect
    if (p.parryTimer > 0) {
        ctx.strokeStyle = `rgba(0, 255, 65, ${p.parryTimer / 15})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.pos.x + 20, p.pos.y + 15, 35 - p.parryTimer, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = `rgba(255, 255, 255, ${p.parryTimer / 30})`;
        ctx.beginPath();
        ctx.arc(p.pos.x + 20, p.pos.y + 15, 30, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Draw 8-bit ship
    ctx.fillRect(p.pos.x + 15, p.pos.y, 10, 10); // nose
    ctx.fillRect(p.pos.x, p.pos.y + 10, 40, 10); // body
    ctx.fillRect(p.pos.x + 10, p.pos.y + 20, 20, 10); // base

    if (p.powerUps.SHIELD > Date.now()) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.pos.x + 20, p.pos.y + 15, 30, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Boss (H.E.L - High-Energy Leviathan)
    if (state.boss) {
        const b = state.boss;
        ctx.save();
        ctx.translate(b.pos.x + b.width / 2, b.pos.y + b.height / 2);
        
        const bounceY = Math.sin(Date.now() * 0.01) * 15;
        ctx.translate(0, bounceY);

        // --- Ship Hull ---
        // Main structural wings
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(-120, 0);
        ctx.lineTo(-80, -40);
        ctx.lineTo(80, -40);
        ctx.lineTo(120, 0);
        ctx.lineTo(80, 40);
        ctx.lineTo(-80, 40);
        ctx.closePath();
        ctx.fill();

        // Secondary armor plating
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-60, -50, 120, 100);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.strokeRect(-60, -50, 120, 100);

        // --- Energy Conduits ---
        const pulse = (Math.sin(Date.now() * 0.01) + 1) / 2;
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.3 + pulse * 0.7})`;
        ctx.lineWidth = 3;
        // Lateral conduits
        ctx.beginPath();
        ctx.moveTo(-100, -20); ctx.lineTo(-40, -20);
        ctx.moveTo(100, -20); ctx.lineTo(40, -20);
        ctx.moveTo(-100, 20); ctx.lineTo(-40, 20);
        ctx.moveTo(100, 20); ctx.lineTo(40, 20);
        ctx.stroke();

        // Bridge / Command Center
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(-40, -50);
        ctx.lineTo(-20, -70);
        ctx.lineTo(20, -70);
        ctx.lineTo(40, -50);
        ctx.fill();
        
        // Command Windows (Glowing Blue)
        ctx.fillStyle = '#38bdf8';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#38bdf8';
        ctx.fillRect(-15, -65, 30, 5);
        ctx.shadowBlur = 0;

        // Engines / Thrusters
        const engineGlow = Math.random() * 10 + 10;
        ctx.fillStyle = '#f87171';
        ctx.shadowBlur = engineGlow;
        ctx.shadowColor = '#f87171';
        ctx.fillRect(-115, -20, 10, 40);
        ctx.fillRect(105, -20, 10, 40);
        
        // Venting particles/steam effect (simulated with lines)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        for(let i=0; i<3; i++) {
            const shift = (Date.now() * 0.1 + i*10) % 30;
            ctx.beginPath();
            ctx.moveTo(-90, -40 - shift);
            ctx.lineTo(-85, -50 - shift);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(90, -40 - shift);
            ctx.lineTo(85, -50 - shift);
            ctx.stroke();
        }

        // Glowing Core
        const coreSize = 25 + Math.sin(Date.now() * 0.02) * 5;
        const gradient = ctx.createRadialGradient(0, 0, 5, 0, 0, coreSize);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.4, '#ef4444');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Weapon Batteries
        ctx.fillStyle = '#64748b';
        ctx.fillRect(-55, 30, 15, 25);
        ctx.fillRect(40, 30, 15, 25);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-52, 55, 9, 10);
        ctx.fillRect(43, 55, 9, 10);

        ctx.restore();

        // HP Bar (Epic Technocratic Design)
        const barWidth = 600;
        const barHeight = 12;
        const barX = CANVAS_WIDTH / 2 - barWidth / 2;
        const barY = 30;

        // Background / Border
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.lineWidth = 2;
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Fill
        const hpRatio = b.hp / b.maxHp;
        const hpGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
        hpGrad.addColorStop(0, '#7f1d1d'); // Dark red
        hpGrad.addColorStop(hpRatio, '#ef4444'); // Bright red
        hpGrad.addColorStop(Math.min(1, hpRatio + 0.05), 'rgba(239, 68, 68, 0.2)');
        
        ctx.fillStyle = hpGrad;
        ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * hpRatio, barHeight - 4);
        
        // Segments
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 10; i++) {
            const sx = barX + (barWidth / 10) * i;
            ctx.beginPath();
            ctx.moveTo(sx, barY);
            ctx.lineTo(sx, barY + barHeight);
            ctx.stroke();
        }

        // Label
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ef4444';
        ctx.fillText('H.E.L // SUPREME COMMANDER', CANVAS_WIDTH / 2, barY - 10);
        ctx.shadowBlur = 0;
        
        // HP Percentage
        ctx.font = '8px monospace';
        ctx.fillText(`${Math.ceil(hpRatio * 100)}%`, barX + barWidth + 25, barY + barHeight - 2);
    }

    // Enemies
    state.enemies.forEach(e => {
      ctx.fillStyle = e.color;
      // 8-bit alien
      ctx.fillRect(e.pos.x + 10, e.pos.y, 20, 5);
      ctx.fillRect(e.pos.x + 5, e.pos.y + 5, 30, 10);
      ctx.fillRect(e.pos.x, e.pos.y + 15, 40, 5);
      ctx.fillRect(e.pos.x + 5, e.pos.y + 20, 5, 5);
      ctx.fillRect(e.pos.x + 30, e.pos.y + 20, 5, 5);
      
      // HP bar
      if (e.hp < e.maxHp) {
          ctx.fillStyle = '#333';
          ctx.fillRect(e.pos.x, e.pos.y - 10, e.width, 4);
          ctx.fillStyle = '#0f0';
          ctx.fillRect(e.pos.x, e.pos.y - 10, (e.hp / e.maxHp) * e.width, 4);
      }
    });

    // Bullets
    state.bullets.forEach(b => {
      if (b.id.startsWith('missile-')) {
          const angle = Math.atan2(b.velocity.y, b.velocity.x);
          ctx.save();
          ctx.translate(b.pos.x + b.width / 2, b.pos.y + b.height / 2);
          ctx.rotate(angle);
          
          // Rocket Body
          ctx.fillStyle = '#fbbf24';
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#fbbf24';
          ctx.beginPath();
          ctx.moveTo(b.width / 2, 0);
          ctx.lineTo(-b.width / 2, -b.height / 3);
          ctx.lineTo(-b.width / 2, b.height / 3);
          ctx.closePath();
          ctx.fill();
          
          // Engine Flame
          const flicker = Math.random() * 5;
          const grad = ctx.createLinearGradient(-b.width / 2, 0, -b.width, 0);
          grad.addColorStop(0, '#f87171');
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.fillRect(-b.width / 2 - flicker, -b.height / 4, b.width / 2, b.height / 2);
          
          ctx.restore();
          
          // Persistent Trail (drawn after restore to be in world space)
          ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
          ctx.fillRect(b.pos.x - b.velocity.x * 2, b.pos.y - b.velocity.y * 2, b.width, b.height);
          ctx.shadowBlur = 0;
      } else {
          ctx.fillStyle = b.isPlayer ? COLORS.PLAYER_BULLET : COLORS.ENEMY_BULLET;
          ctx.fillRect(b.pos.x, b.pos.y, b.width, b.height);
      }
    });

    // Powerups
    state.powerUps.forEach(pw => {
      ctx.fillStyle = COLORS.POWERUP[pw.type];
      ctx.font = '20px serif';
      ctx.textAlign = 'center';
      const symbols: any = { MULTISHOT: 'M', SHIELD: 'S', SPEED: '>', CLEAR: 'C' };
      ctx.fillText(symbols[pw.type], pw.pos.x + pw.width / 2, pw.pos.y + pw.height);
    });

    if (state.status === 'VICTORY') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#facd15';
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('H.E.L NEUTRALIZED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
        ctx.fillStyle = '#fff';
        ctx.font = '24px monospace';
        ctx.fillText('LEGENDARY PILOT STATUS ACHIEVED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
        ctx.font = '16px monospace';
        ctx.fillText('CLICK TO RETURN TO BASE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
    }

    if (state.status === 'GAMEOVER') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
      ctx.fillStyle = '#fff';
      ctx.font = '24px monospace';
      ctx.fillText(`FINAL SCORE: ${state.player.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
      ctx.font = '16px monospace';
      ctx.fillText('CLICK TO RE-ENGAGE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70);
    }

    if (state.status === 'LEVEL_UP') {
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 36px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`LEVEL ${state.level} CLEAR!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }
  };

  const handleStart = () => {
    sounds.init();
    engineRef.current.start();
  };

  useEffect(() => {
    if (gameState.status === 'START' || gameState.status === 'GAMEOVER' || gameState.status === 'VICTORY') {
        sounds.stopBossTheme();
    }
  }, [gameState.status]);

  useEffect(() => {
    if (gameState.boss && gameState.boss.state !== 'DEFEATED') {
        sounds.bossTheme();
    } else {
        sounds.stopBossTheme();
    }
  }, [gameState.boss?.state]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black overflow-hidden relative">
      <div 
        className="relative shadow-[0_0_50px_rgba(34,197,94,0.1)]"
        style={{ 
          width: 'min(100vw, (100vh * 4 / 3))',
          aspectRatio: '4 / 3'
        }}
      >
        {/* HUD Overlay */}
        <div className="absolute top-0 left-0 right-0 p-2 md:p-4 flex justify-between items-center pointer-events-none z-10 font-mono text-green-500 text-[10px] md:text-xl">
          <div className="bg-black/40 backdrop-blur-sm px-2 py-0.5 md:px-3 md:py-1 rounded border border-green-500/20">
            SCORE: {gameState.player.score.toString().padStart(6, '0')}
          </div>
          <div className="flex gap-1 md:gap-2">
            <div className="bg-black/40 backdrop-blur-sm px-2 py-0.5 md:px-3 md:py-1 rounded border border-green-500/20">
                L: {gameState.level}
            </div>
            <div className="bg-black/40 backdrop-blur-sm px-2 py-1 md:px-3 md:py-1.5 rounded border border-red-500/20 flex flex-col items-start gap-0.5">
                <div className="text-[8px] md:text-xs text-red-500/70 font-black tracking-tighter uppercase">Integrity</div>
                <div className="w-16 md:w-32 h-1.5 md:h-3 bg-red-950/40 rounded-full overflow-hidden border border-red-500/20">
                    <div 
                        className="h-full bg-red-500 transition-all duration-300 shadow-[0_0_10px_rgba(239,68,68,0.5)]" 
                        style={{ width: `${(gameState.player.lives / 3) * 100}%` }}
                    />
                </div>
            </div>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full cursor-none touch-none"
          onClick={() => {
              if (gameState.status === 'GAMEOVER' || gameState.status === 'VICTORY') handleStart();
              if (gameState.status === 'PLAYING' || gameState.status === 'START') {
                sounds.init();
                engineRef.current.shoot();
                sounds.shoot();
              }
          }}
        />

        {cheatMessage && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-4 py-1 font-mono font-bold text-xs rounded animate-bounce z-50">
            {cheatMessage}
          </div>
        )}

        {/* Mobile Controls Overlay */}
        <div className="md:hidden absolute bottom-2 left-2 right-2 flex justify-between items-end z-30 pointer-events-none">
            <div className="grid grid-cols-3 gap-0.5 pointer-events-auto opacity-30">
                <div />
                <button 
                    className="w-12 h-12 bg-white/5 backdrop-blur-sm rounded-lg flex items-center justify-center active:bg-white/10 border border-white/10 text-white text-lg"
                    onTouchStart={(e) => { e.preventDefault(); keys.add('ArrowUp'); handleSecretPress('ArrowUp'); }}
                    onTouchEnd={() => keys.delete('ArrowUp')}
                >↑</button>
                <div />
                <button 
                    className="w-12 h-12 bg-white/5 backdrop-blur-sm rounded-lg flex items-center justify-center active:bg-white/10 border border-white/10 text-white text-lg"
                    onTouchStart={(e) => { e.preventDefault(); keys.add('ArrowLeft'); handleSecretPress('ArrowLeft'); }}
                    onTouchEnd={() => keys.delete('ArrowLeft')}
                >←</button>
                <button 
                    className="w-12 h-12 bg-white/5 backdrop-blur-sm rounded-lg flex items-center justify-center active:bg-white/10 border border-white/10 text-white text-lg"
                    onTouchStart={(e) => { e.preventDefault(); keys.add('ArrowDown'); handleSecretPress('ArrowDown'); }}
                    onTouchEnd={() => keys.delete('ArrowDown')}
                >↓</button>
                <button 
                    className="w-12 h-12 bg-white/5 backdrop-blur-sm rounded-lg flex items-center justify-center active:bg-white/10 border border-white/10 text-white text-lg"
                    onTouchStart={(e) => { e.preventDefault(); keys.add('ArrowRight'); handleSecretPress('ArrowRight'); }}
                    onTouchEnd={() => keys.delete('ArrowRight')}
                >→</button>
            </div>
            
            <div className="flex flex-col gap-1 pointer-events-auto">
                <button 
                    className={`w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition-all border-2 shadow-lg ${gameState.player.parryCooldown > 0 ? 'bg-gray-600/10 border-gray-500/10 opacity-20' : 'bg-cyan-500/20 border-cyan-400/20 opacity-40'}`}
                    onTouchStart={(e) => {
                        e.preventDefault();
                        if (gameState.player.parryCooldown === 0) {
                            engineRef.current.parry();
                            sounds.parry();
                        }
                    }}
                >
                    <span className="text-white font-black text-[9px] uppercase tracking-tighter">PARRY</span>
                </button>
                
                <button 
                    className="w-20 h-20 bg-red-600/20 backdrop-blur-sm rounded-full flex items-center justify-center active:scale-95 transition-transform border-4 border-red-500/20 shadow-xl opacity-40"
                    onTouchStart={(e) => {
                        e.preventDefault();
                        engineRef.current.shoot();
                        sounds.shoot();
                    }}
                >
                    <span className="text-white font-black text-[10px] uppercase tracking-tighter">FIRE</span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
