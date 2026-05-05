import { 
  GameState, 
  Bullet, 
  Enemy, 
  PowerUp, 
  PowerUpType,
  Vector
} from '../types';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  PLAYER_WIDTH, 
  PLAYER_HEIGHT, 
  PLAYER_SPEED,
  BULLET_SPEED,
  BULLET_WIDTH,
  BULLET_HEIGHT,
  COLORS,
  POWERUP_PROBABILITY,
  ENEMY_WIDTH,
  ENEMY_HEIGHT,
  ENEMY_PADDING,
  ENEMY_COLS,
  ENEMY_ROWS
} from '../constants';

export class GameEngine {
  state: GameState;
  
  constructor() {
    this.state = this.getInitialState();
  }

  getInitialState(): GameState {
    const state: GameState = {
      player: {
        pos: { x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2, y: CANVAS_HEIGHT - PLAYER_HEIGHT - 20 },
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        lives: 3,
        score: 0,
        level: 1,
        powerUps: {
          MULTISHOT: 0,
          SHIELD: 0,
          SPEED: 0,
        },
        parryTimer: 0,
        parryCooldown: 0,
      },
      enemies: [],
      bullets: [],
      powerUps: [],
      boss: null,
      vines: { top: 0, bottom: CANVAS_HEIGHT, left: 0, right: CANVAS_WIDTH },
      status: 'PLAYING',
      level: 1,
    };
    
    // Spawn initial enemies for first level
    const level = 1;
    const rows = Math.min(ENEMY_ROWS + Math.floor(level / 2), 7);
    const cols = ENEMY_COLS;
    const startX = (CANVAS_WIDTH - (cols * (ENEMY_WIDTH + ENEMY_PADDING))) / 2;
    const startY = 80;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let type: Enemy['type'] = 'SCOUT';
        let hp = 1;
        let color = '#00ff41';
        let score = 10;

        if (r === 0) {
          type = 'TANK';
          hp = 3;
          color = '#ff0000';
          score = 50;
        } else if (r === 1) {
          type = 'DIVER';
          hp = 1;
          color = '#ff00ff';
          score = 40;
        } else if (r === 2) {
          type = 'SHIFTER';
          hp = 1;
          color = '#00ffff';
          score = 30;
        } else if (r === 3) {
          type = 'WAVE';
          hp = 1;
          color = '#ffff00';
          score = 25;
        }

        state.enemies.push({
          id: `enemy-${r}-${c}-${Date.now()}`,
          pos: {
            x: startX + c * (ENEMY_WIDTH + ENEMY_PADDING),
            y: startY + r * (ENEMY_HEIGHT + ENEMY_PADDING),
          },
          originalX: startX + c * (ENEMY_WIDTH + ENEMY_PADDING),
          width: ENEMY_WIDTH,
          height: ENEMY_HEIGHT,
          type,
          hp,
          maxHp: hp,
          score,
          color,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    return state;
  }

  triggerBoss() {
    this.state.enemies = [];
    this.state.bullets = this.state.bullets.filter(b => b.isPlayer);
    this.state.status = 'PLAYING';
    this.state.boss = {
      id: 'h-e-l',
      pos: { x: CANVAS_WIDTH / 2 - 100, y: -250 },
      width: 240,
      height: 120,
      hp: 150, // Reduced from 300 for balance
      maxHp: 150,
      state: 'INTRO',
      attackTimer: 0,
      phase: 0
    };
  }

  spawnEnemies(level: number) {
    this.state.enemies = [];
    const rows = Math.min(ENEMY_ROWS + Math.floor(level / 2), 7);
    const cols = ENEMY_COLS;
    const startX = (CANVAS_WIDTH - (cols * (ENEMY_WIDTH + ENEMY_PADDING))) / 2;
    const startY = 80;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let type: Enemy['type'] = 'SCOUT';
        let hp = 1;
        let color = '#00ff41';
        let score = 10;

        if (r === 0) {
          type = 'TANK';
          hp = 3;
          color = '#ff0000';
          score = 50;
        } else if (r === 1) {
          type = 'DIVER';
          hp = 1;
          color = '#ff00ff';
          score = 40;
        } else if (r === 2) {
          type = 'SHIFTER';
          hp = 1;
          color = '#00ffff';
          score = 30;
        } else if (r === 3) {
          type = 'WAVE';
          hp = 1;
          color = '#ffff00';
          score = 25;
        }

        this.state.enemies.push({
          id: `enemy-${r}-${c}-${Date.now()}`,
          pos: {
            x: startX + c * (ENEMY_WIDTH + ENEMY_PADDING),
            y: startY + r * (ENEMY_HEIGHT + ENEMY_PADDING),
          },
          originalX: startX + c * (ENEMY_WIDTH + ENEMY_PADDING),
          width: ENEMY_WIDTH,
          height: ENEMY_HEIGHT,
          type,
          hp,
          maxHp: hp,
          score,
          color,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
  }

  update(keys: Set<string>, delta: number, sequence?: string[]) {
    if (this.state.status !== 'PLAYING') return;

    // Secret Sequence Check (U, U, D, D, L, R)
    if (sequence && sequence.length >= 6) {
        const lastSix = sequence.slice(-6).join(',');
        if (lastSix === 'ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowLeft,ArrowRight') {
            if (!this.state.boss) {
                sequence.length = 0; // Clear sequence so it doesn't trigger repeatedly
                this.triggerBoss();
            }
        }
    }

    if (this.state.level === 100 && !this.state.boss) {
        this.triggerBoss();
    }

    // Player Movement (Constrained by vines)
    let speedMult = this.state.player.powerUps.SPEED > Date.now() ? 1.5 : 1.0;
    if (this.state.boss) speedMult *= 1.25; // Speed boost during boss fight
    
    const playerSpeed = PLAYER_SPEED * speedMult;
    
    // Parry Timers
    if (this.state.player.parryTimer > 0) this.state.player.parryTimer--;
    if (this.state.player.parryCooldown > 0) this.state.player.parryCooldown--;

    if ((keys.has('ArrowLeft') || keys.has('a')) && this.state.player.pos.x > this.state.vines.left) {
      this.state.player.pos.x -= playerSpeed;
    }
    if ((keys.has('ArrowRight') || keys.has('d')) && this.state.player.pos.x < this.state.vines.right - this.state.player.width) {
      this.state.player.pos.x += playerSpeed;
    }
    if ((keys.has('ArrowUp') || keys.has('w')) && this.state.player.pos.y > 350) { // Limit upward movement to lower half
      this.state.player.pos.y -= playerSpeed;
    }
    if ((keys.has('ArrowDown') || keys.has('s')) && this.state.player.pos.y < CANVAS_HEIGHT - this.state.player.height - 20) {
      this.state.player.pos.y += playerSpeed;
    }

    // Boss Phase Logic
    if (this.state.boss) {
        this.updateBoss(delta);
    }

    // Bullets movement
    this.state.bullets.forEach(b => {
      // Homing Missiles logic
      if (b.id.startsWith('missile-')) {
        const dx = this.state.player.pos.x + this.state.player.width / 2 - b.pos.x;
        const dy = this.state.player.pos.y + this.state.player.height / 2 - b.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 400) { // Only home if somewhat close
            const angle = Math.atan2(dy, dx);
            const homingForce = 0.25;
            b.velocity.x += Math.cos(angle) * homingForce;
            b.velocity.y += Math.sin(angle) * homingForce;
        }
        
        // Cap speed but allow it to be faster than normal bullets
        const speed = Math.sqrt(b.velocity.x**2 + b.velocity.y**2);
        const maxMissileSpeed = 6;
        if (speed > maxMissileSpeed) {
            b.velocity.x = (b.velocity.x / speed) * maxMissileSpeed;
            b.velocity.y = (b.velocity.y / speed) * maxMissileSpeed;
        }
      }
      b.pos.y += b.velocity.y;
      b.pos.x += b.velocity.x;
    });
    this.state.bullets = this.state.bullets.filter(b => b.pos.y > -50 && b.pos.y < CANVAS_HEIGHT + 50);

    // Enemy movement (if not boss)
    if (!this.state.boss) {
        const time = Date.now() / 1000;
        this.state.enemies.forEach(e => {
            switch(e.type) {
                case 'WAVE':
                    e.pos.x = (e.originalX || 0) + Math.sin(time * 3 + (e.phase || 0)) * 40;
                    e.pos.y += 0.1 * this.state.level;
                    break;
                case 'SHIFTER':
                    if (Math.floor(time * 2) % 2 === 0) {
                        e.pos.x += 2;
                    } else {
                        e.pos.x -= 2;
                    }
                    e.pos.y += 0.05 * this.state.level;
                    break;
                case 'DIVER':
                    const distToPlayer = Math.abs(e.pos.x - this.state.player.pos.x);
                    if (distToPlayer < 100 && e.pos.y < CANVAS_HEIGHT - 200) {
                        e.pos.y += 2 * this.state.level;
                        e.pos.x += (this.state.player.pos.x - e.pos.x) * 0.05;
                    } else {
                        e.pos.y += 0.1 * this.state.level;
                        e.pos.x += Math.sin(time * 2) * 1;
                    }
                    break;
                default:
                    e.pos.x += Math.cos(time) * 1;
                    e.pos.y += 0.05 * this.state.level;
            }
        });
    }

    // Enemy shooting
    if (!this.state.boss && Math.random() < 0.01 + (this.state.level * 0.005) && this.state.enemies.length > 0) {
      const shooter = this.state.enemies[Math.floor(Math.random() * this.state.enemies.length)];
      
      if (shooter.type === 'DIVER') {
          // Spread shot
          [-1, 0, 1].forEach(dx => {
              this.state.bullets.push({
                  id: `ebullet-${Date.now()}-${dx}`,
                  pos: { x: shooter.pos.x + shooter.width / 2, y: shooter.pos.y + shooter.height },
                  velocity: { x: dx * 1, y: BULLET_SPEED / 2 },
                  width: BULLET_WIDTH,
                  height: BULLET_HEIGHT,
                  isPlayer: false,
              });
          });
      } else {
          this.state.bullets.push({
              id: `ebullet-${Date.now()}`,
              pos: { x: shooter.pos.x + shooter.width / 2, y: shooter.pos.y + shooter.height },
              velocity: { x: 0, y: BULLET_SPEED / 2 },
              width: BULLET_WIDTH,
              height: BULLET_HEIGHT,
              isPlayer: false,
          });
      }
    }

    // Powerups movement
    this.state.powerUps.forEach(p => {
        p.pos.y += p.velocity.y;
    });
    this.state.powerUps = this.state.powerUps.filter(p => p.pos.y < CANVAS_HEIGHT);

    this.checkCollisions();

    // Check if level clear
    if (this.state.enemies.length === 0 && !this.state.boss && this.state.status === 'PLAYING') {
      this.state.status = 'LEVEL_UP';
      setTimeout(() => {
        if (this.state.level < 100) {
            this.state.level++;
            this.spawnEnemies(this.state.level);
            this.state.status = 'PLAYING';
        }
      }, 2000);
    }

    // Check game over
    if (this.state.player.lives <= 0) {
      this.state.status = 'GAMEOVER';
    }
  }

  updateBoss(delta: number) {
    const b = this.state.boss!;
    b.phase += 0.02;

    switch (b.state) {
      case 'INTRO':
        if (b.pos.y < 50) {
          b.pos.y += 2;
        } else {
          b.state = 'IDLE';
          b.attackTimer = 100;
        }
        break;

      case 'IDLE':
        b.pos.x = CANVAS_WIDTH / 2 - b.width / 2 + Math.sin(b.phase * 2.5) * 250; // Super fast sweep
        b.pos.y = 50 + Math.cos(b.phase * 1.2) * 50;
        b.attackTimer--;
        if (b.attackTimer <= 0) {
          b.state = 'ATTACKING';
          b.attackTimer = 200;
        }
        break;

      case 'ATTACKING':
        b.pos.x = CANVAS_WIDTH / 2 - b.width / 2 + Math.sin(b.phase * 3) * 300;
        
        // Attack 1: Barrage (Reduced frequency/speed)
        if (b.attackTimer % 12 === 0) {
            [-2, 0, 2].forEach(dx => {
                this.state.bullets.push({
                    id: `hel-${Date.now()}-${dx}`,
                    pos: { x: b.pos.x + b.width / 2 + dx * 30, y: b.pos.y + b.height },
                    velocity: { x: (dx * 1.2) + Math.sin(b.phase) * 2, y: 5 }, 
                    width: 4,
                    height: 20,
                    isPlayer: false
                });
            });
        }

        // Homing Missiles Salvo (Reduced frequency)
        if (b.attackTimer % 180 === 0 || b.attackTimer % 180 === 15) {
            [0, b.width].forEach(side => {
                this.state.bullets.push({
                    id: `missile-${Date.now()}-${side}-${b.attackTimer}`,
                    pos: { x: b.pos.x + side, y: b.pos.y + b.height / 2 },
                    velocity: { x: side === 0 ? -3 : 3, y: 1 },
                    width: 14,
                    height: 14,
                    isPlayer: false
                });
            });
        }

        // Attack 2: Warp Suppression (Vines/Lasers)
        if (b.attackTimer < 150) {
            this.state.vines.left = Math.min(350, this.state.vines.left + 3.5);
            this.state.vines.right = Math.max(CANVAS_WIDTH - 350, this.state.vines.right - 3.5);
        }

        b.attackTimer--;
        if (b.attackTimer <= 0) {
          b.state = 'IDLE';
          b.attackTimer = 150;
          // Reset vines slowly
          const vineReset = setInterval(() => {
              this.state.vines.left = Math.max(0, this.state.vines.left - 2);
              this.state.vines.right = Math.min(CANVAS_WIDTH, this.state.vines.right + 2);
              if (this.state.vines.left === 0) clearInterval(vineReset);
          }, 16);
        }
        break;

      case 'DEFEATED':
        b.pos.y += 5;
        if (b.pos.y > CANVAS_HEIGHT) {
            this.state.boss = null;
            this.state.status = 'VICTORY';
        }
        break;
    }
  }

  checkCollisions() {
    // Player Bullets vs Boss
    if (this.state.boss && this.state.boss.state !== 'INTRO') {
        const b = this.state.boss;
        this.state.bullets.filter(bul => bul.isPlayer).forEach(bullet => {
            if (this.isColliding(bullet, b)) {
                b.hp--;
                bullet.pos.y = -100;
                if (b.hp <= 0) b.state = 'DEFEATED';
            }
        });
    }

    // Player Bullets vs Enemies
    this.state.bullets.filter(b => b.isPlayer).forEach(bullet => {
      this.state.enemies.forEach((enemy, idx) => {
        if (this.isColliding(bullet, enemy)) {
          enemy.hp--;
          bullet.pos.y = -100; // Trash bullet
          if (enemy.hp <= 0) {
            this.state.player.score += enemy.score;
            this.state.enemies.splice(idx, 1);
            
            // Spawn powerup
            if (Math.random() < POWERUP_PROBABILITY) {
              const types: PowerUpType[] = ['MULTISHOT', 'SHIELD', 'SPEED', 'CLEAR'];
              this.state.powerUps.push({
                id: `pw-${Date.now()}`,
                type: types[Math.floor(Math.random() * types.length)],
                pos: { x: enemy.pos.x, y: enemy.pos.y },
                velocity: { x: 0, y: 2 },
                width: 25,
                height: 25,
              });
            }
          }
        }
      });
    });

    // Enemy Bullets vs Player
    this.state.bullets.filter(b => !b.isPlayer).forEach(bullet => {
      if (this.isColliding(bullet, this.state.player)) {
        if (this.state.player.parryTimer > 0) {
            // SUCCESSFUL PARRY
            bullet.isPlayer = true;
            bullet.velocity.y *= -1.5; // Deflect back faster
            bullet.velocity.x *= -1;
            this.state.player.score += 100;
            // Extend parry slightly on success
            this.state.player.parryTimer = Math.min(this.state.player.parryTimer + 5, 20);
        } else {
            bullet.pos.y = CANVAS_HEIGHT + 100; // Trash bullet
            if (this.state.player.powerUps.SHIELD < Date.now()) {
              this.state.player.lives = Math.max(0, this.state.player.lives - 1);
            }
        }
      }
    });

    // Powerups vs Player
    this.state.powerUps.forEach((pw, idx) => {
      if (this.isColliding(pw, this.state.player)) {
        if (pw.type === 'CLEAR') {
          this.state.bullets = this.state.bullets.filter(b => b.isPlayer);
        } else {
          this.state.player.powerUps[pw.type] = Date.now() + 10000;
        }
        this.state.powerUps.splice(idx, 1);
      }
    });

    // Enemies vs Player (Crash)
    this.state.enemies.forEach(e => {
        if (this.isColliding(e, this.state.player)) {
            this.state.player.lives = 0;
        }
        if (e.pos.y > CANVAS_HEIGHT - 50) {
            this.state.player.lives = 0;
        }
    });

    // Boss vs Player (Physical Barrier)
    if (this.state.boss && this.state.boss.state !== 'INTRO' && this.state.boss.state !== 'DEFEATED') {
        if (this.isColliding(this.state.player, this.state.boss)) {
            // Push player down significantly if they try to fly past or through
            const pushBack = 10;
            if (this.state.player.pos.y < this.state.boss.pos.y + this.state.boss.height) {
                this.state.player.pos.y = this.state.boss.pos.y + this.state.boss.height + pushBack;
            }
            
            // Damage player if no shield
            if (this.state.player.powerUps.SHIELD < Date.now()) {
                this.state.player.lives = Math.max(0, this.state.player.lives - 0.05); // Slightly slower tick
            }
        }
    }
  }

  isColliding(a: any, b: any) {
    return a.pos.x < b.pos.x + b.width &&
           a.pos.x + a.width > b.pos.x &&
           a.pos.y < b.pos.y + b.height &&
           a.pos.y + a.height > b.pos.y;
  }

  shoot() {
    if (this.state.status !== 'PLAYING') return;

    const isMultishot = this.state.player.powerUps.MULTISHOT > Date.now();
    
    if (isMultishot) {
      [-0.5, 0, 0.5].forEach(dx => {
        this.state.bullets.push({
          id: `pbullet-${Date.now()}-${dx}`,
          pos: { x: this.state.player.pos.x + this.state.player.width / 2, y: this.state.player.pos.y },
          velocity: { x: dx * 2, y: -BULLET_SPEED },
          width: BULLET_WIDTH,
          height: BULLET_HEIGHT,
          isPlayer: true,
        });
      });
    } else {
      this.state.bullets.push({
        id: `pbullet-${Date.now()}`,
        pos: { x: this.state.player.pos.x + this.state.player.width / 2, y: this.state.player.pos.y },
        velocity: { x: 0, y: -BULLET_SPEED },
        width: BULLET_WIDTH,
        height: BULLET_HEIGHT,
        isPlayer: true,
      });
    }
  }

  parry() {
    if (this.state.status !== 'PLAYING') return;
    if (this.state.player.parryCooldown > 0) return;
    
    this.state.player.parryTimer = 15; // 15 frames of parry window
    this.state.player.parryCooldown = 60; // 1 second cooldown (approx 60fps)
  }

  start() {
    this.state = this.getInitialState();
    this.state.status = 'PLAYING';
    this.spawnEnemies(1);
  }
}
