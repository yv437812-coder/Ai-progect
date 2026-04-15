document.addEventListener("DOMContentLoaded", () => {

// ================= НАСТРОЙКИ =================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("startScreen");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const TILE = 32;                 // размер клетки
const COLS = 20;
const ROWS = 12;

let grid = [];                  // лабиринт (0 проход, 1 стена)

const HERO_SPEED = 3;

// сколько дополнительных стен добавлять по сложности
const extraWallsByDifficulty = [5, 15, 30, 55, 90];

let gameRunning = false;
let gameOver = false;
let lives = 3;

// ================= КАРТИНКИ =================
// 👉 вставь ссылки если нужно

const playerImg = new Image();
playerImg.src = "https://i.postimg.cc/nzDzkvLR/image-krugok-removebg-preview.png";

const enemyImg = new Image();
enemyImg.src = "https://i.postimg.cc/HLPc3Y9Y/image-kvadlatik-removebg-preview.png";

// ================= ОБЪЕКТЫ =================

const player = { x:1, y:1 };
const enemy = { x:1, y:1 };

const exitCell = { x: COLS-2, y: ROWS-2 };

// ================= UI =================

startBtn.onclick = startGame;

restartBtn.onclick = () => {
  lives = 3;
  document.getElementById("lives").textContent = lives;
  document.getElementById("message").textContent = "";
  restartBtn.style.display = "none";
  startScreen.style.display = "block";
  gameRunning = false;
};

// ================= ГЕНЕРАЦИЯ ЛАБИРИНТА =================
// DFS maze + добавление стен по сложности

function generateMaze(diff){

  grid = Array.from({length:ROWS},()=>Array(COLS).fill(1));

  function carve(x,y){
    grid[y][x]=0;

    const dirs = shuffle([
      [2,0],[-2,0],[0,2],[0,-2]
    ]);

    for(const [dx,dy] of dirs){
      const nx=x+dx, ny=y+dy;
      if(nx>0 && ny>0 && nx<COLS-1 && ny<ROWS-1 && grid[ny][nx]===1){
        grid[y+dy/2][x+dx/2]=0;
        carve(nx,ny);
      }
    }
  }

  carve(1,1);

  // добавляем дополнительные стены (усложнение)
  let extra = extraWallsByDifficulty[diff];

  while(extra>0){
    let x = rand(1,COLS-2);
    let y = rand(1,ROWS-2);

    if(grid[y][x]===0 && !(x===1&&y===1) && !(x===exitCell.x&&y===exitCell.y)){
      grid[y][x]=1;

      // проверяем что выход достижим
      if(!pathExists()){
        grid[y][x]=0;
      } else {
        extra--;
      }
    }
  }
}

function pathExists(){
  return findPath({x:1,y:1}, exitCell).length>0;
}

function rand(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    let j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

// ================= ПОИСК ПУТИ (BFS) =================

function findPath(start,end){

  const q=[start];
  const seen=new Set([start.x+","+start.y]);
  const parent={};

  while(q.length){
    const c=q.shift();
    if(c.x===end.x && c.y===end.y){
      let path=[c];
      let k=c.x+","+c.y;
      while(parent[k]){
        k=parent[k];
        const [px,py]=k.split(",").map(Number);
        path.push({x:px,y:py});
      }
      return path.reverse();
    }

    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=c.x+dx, ny=c.y+dy;
      const key=nx+","+ny;
      if(nx>=0&&ny>=0&&nx<COLS&&ny<ROWS &&
         grid[ny][nx]===0 && !seen.has(key)){
        seen.add(key);
        parent[key]=c.x+","+c.y;
        q.push({x:nx,y:ny});
      }
    }
  }

  return [];
}

// ================= УПРАВЛЕНИЕ =================

const keys={};
document.addEventListener("keydown",e=>keys[e.key.toLowerCase()]=true);
document.addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);

// ================= ФОРА =================

let chaseDelay = 3000;
let chaseStart = 0;

// ================= ИГРА =================

function startGame(){

  const diff = +document.getElementById("difficulty").value;

  generateMaze(diff);

  player.x=1; player.y=1;

  // злодей появляется подальше
  enemy.x=COLS-2;
  enemy.y=ROWS-2;

  chaseStart = Date.now();

  startScreen.style.display="none";
  gameRunning=true;
  gameOver=false;

  update();
}

// ================= ДВИЖЕНИЕ =================

function tryMove(obj,dx,dy){
  const nx=obj.x+dx;
  const ny=obj.y+dy;
  if(grid[ny]?.[nx]===0){
    obj.x=nx;
    obj.y=ny;
  }
}

function movePlayer(){

  if(keys["w"]) tryMove(player,0,-1);
  if(keys["s"]) tryMove(player,0,1);
  if(keys["a"]) tryMove(player,-1,0);
  if(keys["d"]) tryMove(player,1,0);
}

function moveEnemy(){

  if(Date.now()-chaseStart < chaseDelay) return;

  // ищем путь к герою
  const path = findPath(enemy, player);

  if(path.length>1){
    // идём на 1 шаг (медленнее героя)
    if(Math.random()<0.7){ // замедление
      enemy.x = path[1].x;
      enemy.y = path[1].y;
    }
  }
}

// ================= ПРОВЕРКИ =================

function checkEnemyHit(){
  if(player.x===enemy.x && player.y===enemy.y){
    lives--;
    document.getElementById("lives").textContent=lives;

    player.x=1; player.y=1;
    chaseStart = Date.now();

    if(lives<=0) finish(false);
  }
}

function checkWin(){
  if(player.x===exitCell.x && player.y===exitCell.y){
    finish(true);
  }
}

function getAchievement(){
  if(lives===3) return "The best";
  if(lives===2) return "Очеровашка";
  if(lives===1) return "Лучший из худших";
  return "Главное не победа, а участие";
}

function finish(win){
  gameOver=true;
  gameRunning=false;
  document.getElementById("message").textContent =
    (win?"Победа! ":"Проигрыш! ") + getAchievement();
  restartBtn.style.display="inline-block";
}

// ================= РИСОВАНИЕ =================

function draw(){

  ctx.fillStyle="#1e1e2e";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  for(let y=0;y<ROWS;y++){
    for(let x=0;x<COLS;x++){
      if(grid[y][x]===1){
        ctx.fillStyle="#444";
        ctx.fillRect(x*TILE,y*TILE,TILE,TILE);
      }
    }
  }

  // выход
  ctx.fillStyle="lime";
  ctx.fillRect(exitCell.x*TILE+8,exitCell.y*TILE+8,16,16);

  // герой
  if(playerImg.src){
    ctx.drawImage(playerImg,player.x*TILE+4,player.y*TILE+4,24,24);
  } else {
    ctx.fillStyle="deepskyblue";
    ctx.beginPath();
    ctx.arc(player.x*TILE+16,player.y*TILE+16,10,0,Math.PI*2);
    ctx.fill();
  }

  // злодей
  if(enemyImg.src){
    ctx.drawImage(enemyImg,enemy.x*TILE+4,enemy.y*TILE+4,24,24);
  } else {
    ctx.fillStyle="red";
    ctx.fillRect(enemy.x*TILE+6,enemy.y*TILE+6,20,20);
  }
}

// ================= ЦИКЛ =================

function update(){
  if(!gameRunning || gameOver) return;

  movePlayer();
  moveEnemy();
  checkEnemyHit();
  checkWin();
  draw();

  requestAnimationFrame(update);
}

});
