export interface Vector {
  x: number;
  y: number;
}

export type PowerUpType = 'MULTISHOT' | 'SHIELD' | 'SPEED' | 'CLEAR';

export interface GameObject {
  id: string;
  pos: Vector;
  width: number;
  height: number;
}

export interface Bullet extends GameObject {
  velocity: Vector;
  isPlayer: boolean;
}

export interface Enemy extends GameObject {
  type: 'SCOUT' | 'TANK' | 'SPEEDER' | 'DIVER' | 'SHIFTER' | 'WAVE' | 'BOSS';
  hp: number;
  maxHp: number;
  score: number;
  color: string;
  phase?: number;
  originalX?: number;
}

export interface PowerUp extends GameObject {
  type: PowerUpType;
  velocity: Vector;
}

export type BossState = 'NONE' | 'INTRO' | 'IDLE' | 'ATTACKING' | 'DEFEATED';

export interface Boss extends GameObject {
  hp: number;
  maxHp: number;
  state: BossState;
  attackTimer: number;
  phase: number;
}

export interface GameState {
  player: {
    pos: Vector;
    width: number;
    height: number;
    lives: number;
    score: number;
    level: number;
    powerUps: {
      MULTISHOT: number;
      SHIELD: number;
      SPEED: number;
    };
    parryTimer: number;
    parryCooldown: number;
  };
  enemies: Enemy[];
  bullets: Bullet[];
  powerUps: PowerUp[];
  boss: Boss | null;
  status: 'START' | 'PLAYING' | 'GAMEOVER' | 'LEVEL_UP' | 'VICTORY';
  level: number;
  vines: { top: number; bottom: number; left: number; right: number };
}
