const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let width, height;
function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

let keys = {};
let joystick = { active: false, dx: 0, dy: 0 };
let bullets = [], enemies = [], enemyBullets = [], shields = [];

let player = {
  x: 100, y: 100, r: 20, speed: 3.5, hp: 100,
  score: 0, level: 0, kills: 0,
  shield: false, shieldTime: 0
};

let fireCooldown = 0;
let nextLevelKills = 10;
let shieldSpawnTimer = 0;
let enemySpawnTimer = 0;
let gameOver = false;

const joystickEl = document.getElementById("joystick");
const stickEl = document.getElementById("stick");
const fireBtn = document.getElementById("fireBtn");
const hud = document.getElementById("hud");

fireBtn.ontouchstart = () => shoot();

joystickEl.ontouchstart = joystickEl.ontouchmove = (e) => {
  e.preventDefault();
  const rect = joystickEl.getBoundingClientRect();
  const touch = e.touches[0];
  const dx = touch.clientX - (rect.left + 70);
  const dy = touch.clientY - (rect.top + 70);
  const dist = Math.min(Math.sqrt(dx*dx + dy*dy), 70);
  const angle = Math.atan2(dy, dx);
  stickEl.style.left = `${70 + Math.cos(angle) * dist - 30}px`;
  stickEl.style.top = `${70 + Math.sin(angle) * dist - 30}px`;
  joystick.dx = Math.cos(angle);
  joystick.dy = Math.sin(angle);
  joystick.active = true;
};
joystickEl.ontouchend = () => {
  joystick.active = false;
  stickEl.style.left = "40px";
  stickEl.style.top = "40px";
};

function shoot() {
  if (fireCooldown <= 0 && !gameOver) {
    bullets.push({ x: player.x, y: player.y, dx: 1, dy: 0 });
    fireCooldown = 10;
  }
}

function spawnEnemy() {
  let x = width + 30;
  let y;
  do {
    y = Math.random() * height;
  } while (y > height - 200); // Hindari spawn di bawah controller
  enemies.push({ x, y, r: 20, hp: 1, shootTimer: 0, fireCount: 0 });
}

function spawnShieldItem() {
  shields.push({
    x: Math.random() * (width - 40) + 20,
    y: Math.random() * (height - 40) + 20,
    r: 15
  });
}

function activateShield() {
  player.shield = true;
  player.shieldTime = 900; // 15 detik @60fps
}

function update() {
  if (gameOver) return;

  if (joystick.active) {
    player.x += joystick.dx * player.speed;
    player.y += joystick.dy * player.speed;
  }

  if (keys["ArrowUp"]) player.y -= player.speed;
  if (keys["ArrowDown"]) player.y += player.speed;
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  player.x = Math.max(player.r, Math.min(width - player.r, player.x));
  player.y = Math.max(player.r, Math.min(height - player.r, player.y));

  fireCooldown--;

  bullets = bullets.filter(b => b.x < width);
  bullets.forEach(b => b.x += 8);

  enemies.forEach(e => {
    e.x -= 1.2;
    e.shootTimer++;
    if (e.shootTimer >= 30 && e.fireCount < 3) {
      e.shootTimer = 0;
      e.fireCount++;
      let dx = player.x - e.x;
      let dy = player.y - e.y;
      let d = Math.sqrt(dx*dx + dy*dy);
      enemyBullets.push({ x: e.x, y: e.y, dx: dx/d, dy: dy/d });
    }
  });

  enemyBullets.forEach(b => {
    b.x += b.dx * 4;
    b.y += b.dy * 4;
  });

  bullets.forEach(b => {
    enemies.forEach(e => {
      if (Math.hypot(b.x - e.x, b.y - e.y) < e.r) {
        e.hp = 0;
        player.score += 10;
        player.kills++;
      }
    });
  });

  enemies = enemies.filter(e => e.hp > 0 && e.x > -50);

  // Enemy collision
  enemies.forEach(e => {
    if (Math.hypot(player.x - e.x, player.y - e.y) < player.r + e.r) {
      if (!player.shield) player.hp -= 10;
      e.hp = 0;
    }
  });

  // Enemy bullet hit
  enemyBullets = enemyBullets.filter(b => {
    if (Math.hypot(player.x - b.x, player.y - b.y) < player.r) {
      if (!player.shield) player.hp -= 5;
      return false;
    }
    return b.x > 0 && b.x < width && b.y > 0 && b.y < height;
  });

  // Check shield item pickup
  shields = shields.filter(s => {
    if (Math.hypot(player.x - s.x, player.y - s.y) < player.r + s.r) {
      activateShield();
      return false;
    }
    return true;
  });

  // Level up
  if (player.kills >= nextLevelKills) {
    player.level++;
    nextLevelKills *= 2;
    activateShield();
  }

  if (player.shield) {
    player.shieldTime--;
    if (player.shieldTime <= 0) {
      player.shield = false;
    }
  }

  // Timed spawn: enemy dan shield
  shieldSpawnTimer++;
  enemySpawnTimer++;

  if (shieldSpawnTimer >= 1200) { // 20 detik @60fps
    spawnShieldItem();
    shieldSpawnTimer = 0;
  }

  if (enemySpawnTimer >= 60) { // setiap 1 detik (60 frame)
    spawnEnemy();
    enemySpawnTimer = 0;
  }

  // Check Game Over
  if (player.hp <= 0) {
    gameOver = true;
    hud.innerHTML += "<br><strong>Game Over</strong>";
  } else {
    hud.innerHTML = `HP: ${player.hp}<br>Score: ${player.score}<br>Level: ${player.level}`;
  }
}

function draw() {
  ctx.clearRect(0, 0, width, height);

  // Player
  ctx.fillStyle = "lime";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fill();

  if (player.shield) {
    ctx.strokeStyle = "rgba(0,200,255,0.6)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r + 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  bullets.forEach(b => {
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  enemies.forEach(e => {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fill();
  });

  enemyBullets.forEach(b => {
    ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  shields.forEach(s => {
    ctx.fillStyle = "cyan";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);
gameLoop();
