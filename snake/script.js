/*
  Игра «Змейка: Собери слово»
  - Вверху показывается картинка (эмодзи) животного
  - На поле размещаются буквы названия этого животного
  - Игрок должен собрать буквы по порядку; ошибка — конец игры
  - Счёт (кол-во собранных слов) в правом верхнем углу
*/

(function () {
  'use strict';

  /** DOM */
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const animalEmojiEl = document.getElementById('animalEmoji');
  const overlayEl = document.getElementById('overlay');
  const gameOverReasonEl = document.getElementById('gameOverReason');
  const restartBtn = document.getElementById('restartBtn');

  /** Настройки сетки */
  const GRID_SIZE = 20; // 20x20
  const CELL = Math.floor(Math.min(canvas.width, canvas.height) / GRID_SIZE);
  canvas.width = CELL * GRID_SIZE;
  canvas.height = CELL * GRID_SIZE;

  /** Список животных (английское название, эмодзи) */
  const ANIMALS = [
    { name: 'dog', emoji: '🐶' },
    { name: 'cat', emoji: '🐱' },
    { name: 'rat', emoji: '🐀' },
    { name: 'parrot', emoji: '🦜' },
    { name: 'fox', emoji: '🦊' },
    { name: 'bear', emoji: '🐻' },
    { name: 'panda', emoji: '🐼' },
    { name: 'zebra', emoji: '🦓' },
    { name: 'lion', emoji: '🦁' },
    { name: 'horse', emoji: '🐴' },
    { name: 'snake', emoji: '🐍' },
    { name: 'tiger', emoji: '🐯' },
    { name: 'monkey', emoji: '🐒' },
    { name: 'rabbit', emoji: '🐰' },
    { name: 'frog', emoji: '🐸' }
  ];

  /** Состояние игры */
  let snakeBody = [];
  let direction = { x: 1, y: 0 };
  let nextDirection = { x: 1, y: 0 };
  let tickMs = 140;
  let timerId = null;
  let isGameOver = false;
  let score = 0;

  // Текущее слово
  let currentAnimal = null; // {name, emoji}
  let targetWord = '';
  let nextLetterIndex = 0; // какой индекс буквы нужно съесть следующим
  let lettersByPos = new Map(); // key "x,y" -> { char, index, x, y }

  /** Утилиты */
  const key = (x, y) => `${x},${y}`;
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function choose(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function initSnake() {
    const startX = Math.floor(GRID_SIZE / 2) - 1;
    const startY = Math.floor(GRID_SIZE / 2);
    snakeBody = [
      { x: startX - 1, y: startY },
      { x: startX, y: startY },
      { x: startX + 1, y: startY }
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
  }

  function pickNewAnimal() {
    currentAnimal = choose(ANIMALS);
    // Английские слова в верхнем регистре
    targetWord = currentAnimal.name.toLocaleUpperCase('en-US');
    nextLetterIndex = 0;
    animalEmojiEl.textContent = currentAnimal.emoji;
  }

  function isOccupied(x, y) {
    // змея
    for (const seg of snakeBody) {
      if (seg.x === x && seg.y === y) return true;
    }
    // буквы
    if (lettersByPos.has(key(x, y))) return true;
    return false;
  }

  function placeLettersForWord() {
    lettersByPos.clear();
    const used = new Set();
    // Не ставить буквы на стартовую змею
    for (const seg of snakeBody) used.add(key(seg.x, seg.y));

    for (let i = 0; i < targetWord.length; i++) {
      let x, y, k;
      let safety = 0;
      do {
        x = randInt(0, GRID_SIZE - 1);
        y = randInt(0, GRID_SIZE - 1);
        k = key(x, y);
        safety++;
        if (safety > 5000) break; // крайний случай
      } while (used.has(k));
      used.add(k);
      lettersByPos.set(k, { char: targetWord[i], index: i, x, y });
    }
  }

  function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0b1222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // тонкая сетка
    ctx.strokeStyle = '#141a2b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < GRID_SIZE; i++) {
      // вертикальные
      ctx.moveTo(i * CELL + 0.5, 0);
      ctx.lineTo(i * CELL + 0.5, canvas.height);
      // горизонтальные
      ctx.moveTo(0, i * CELL + 0.5);
      ctx.lineTo(canvas.width, i * CELL + 0.5);
    }
    ctx.stroke();
  }

  function drawSnake() {
    for (let i = 0; i < snakeBody.length; i++) {
      const seg = snakeBody[i];
      const x = seg.x * CELL;
      const y = seg.y * CELL;
      const isHead = i === snakeBody.length - 1;
      const grad = ctx.createLinearGradient(x, y, x, y + CELL);
      if (isHead) {
        grad.addColorStop(0, '#22f7b7');
        grad.addColorStop(1, '#0fbf8a');
      } else {
        grad.addColorStop(0, '#1a9b79');
        grad.addColorStop(1, '#0f7157');
      }
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#093b2e';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, CELL - 4, CELL - 4, 6);
      ctx.fill();
      ctx.stroke();

      if (isHead) {
        // глазки
        ctx.fillStyle = '#05261d';
        const eyeSize = Math.max(2, Math.floor(CELL * 0.12));
        ctx.beginPath();
        ctx.arc(x + CELL * 0.35, y + CELL * 0.35, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + CELL * 0.65, y + CELL * 0.35, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawLetters() {
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.floor(CELL * 0.6)}px Rubik, Arial, sans-serif`;
    for (const entry of lettersByPos.values()) {
      const x = entry.x * CELL;
      const y = entry.y * CELL;
      // фон плашки
      ctx.fillStyle = '#1f2a44';
      ctx.strokeStyle = '#11182a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x + 4, y + 4, CELL - 8, CELL - 8, 6);
      ctx.fill();
      ctx.stroke();
      // буква
      if (entry.index < nextLetterIndex) ctx.fillStyle = '#6ee7b7';
      else if (entry.index === nextLetterIndex) ctx.fillStyle = '#ffd166';
      else ctx.fillStyle = '#d8def0';
      ctx.fillText(entry.char, x + CELL / 2, y + CELL / 2 + 1);
    }
  }

  function draw() {
    drawGrid();
    drawLetters();
    drawSnake();
  }

  function step() {
    if (isGameOver) return;
    // применяем направление, запрещаем разворот на 180°
    if (!(nextDirection.x === -direction.x && nextDirection.y === -direction.y)) {
      direction = nextDirection;
    }

    const head = snakeBody[snakeBody.length - 1];
    const newHead = { x: head.x + direction.x, y: head.y + direction.y };

    // переход через границы (тороидальная карта)
    if (newHead.x < 0) newHead.x = GRID_SIZE - 1;
    else if (newHead.x >= GRID_SIZE) newHead.x = 0;
    if (newHead.y < 0) newHead.y = GRID_SIZE - 1;
    else if (newHead.y >= GRID_SIZE) newHead.y = 0;
    // укус себя
    for (const seg of snakeBody) {
      if (seg.x === newHead.x && seg.y === newHead.y) {
        return gameOver('Змея укусила себя');
      }
    }

    const newKey = key(newHead.x, newHead.y);
    const letter = lettersByPos.get(newKey);
    const ateLetter = Boolean(letter);

    if (ateLetter) {
      if (letter.index !== nextLetterIndex) {
        return gameOver(`Неправильная буква: ожидалась "${targetWord[nextLetterIndex]}"`);
      }
      // правильная буква
      lettersByPos.delete(newKey);
      nextLetterIndex++;
      // растём: не удаляем хвост ниже
    }

    // добавить голову
    snakeBody.push(newHead);
    if (!ateLetter) {
      // обычный ход — сдвигаем хвост
      snakeBody.shift();
    }

    // слово собрано?
    if (nextLetterIndex >= targetWord.length) {
      score++;
      scoreEl.textContent = String(score);
      // небольшое ускорение со временем, но в разумных пределах
      tickMs = Math.max(80, tickMs - 4);
      clearInterval(timerId);
      timerId = setInterval(step, tickMs);
      // новое слово и раскладка букв
      pickNewAnimal();
      placeLettersForWord();
    }

    draw();
  }

  function gameOver(reason) {
    isGameOver = true;
    draw();
    overlayEl.classList.remove('hidden');
    gameOverReasonEl.textContent = reason || 'Игра окончена';
    clearInterval(timerId);
  }

  function restart(fullReset = false) {
    isGameOver = false;
    overlayEl.classList.add('hidden');
    if (fullReset) {
      score = 0;
      scoreEl.textContent = '0';
      tickMs = 140;
    }
    initSnake();
    pickNewAnimal();
    placeLettersForWord();
    draw();
    clearInterval(timerId);
    timerId = setInterval(step, tickMs);
  }

  /** События управления */
  function onKeyDown(e) {
    const code = e.key.toLowerCase();
    if (code === 'arrowup' || code === 'w') nextDirection = { x: 0, y: -1 };
    else if (code === 'arrowdown' || code === 's') nextDirection = { x: 0, y: 1 };
    else if (code === 'arrowleft' || code === 'a') nextDirection = { x: -1, y: 0 };
    else if (code === 'arrowright' || code === 'd') nextDirection = { x: 1, y: 0 };
    else if (code === 'r') restart(true);
  }
  window.addEventListener('keydown', onKeyDown);
  restartBtn.addEventListener('click', () => restart(true));

  // Polyfill roundRect для Safari старых версий
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      const min = Math.min(w, h) / 2;
      if (r == null) r = 5;
      if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
      else r = {
        tl: Math.min(r.tl || 0, min),
        tr: Math.min(r.tr || 0, min),
        br: Math.min(r.br || 0, min),
        bl: Math.min(r.bl || 0, min)
      };
      this.beginPath();
      this.moveTo(x + r.tl, y);
      this.lineTo(x + w - r.tr, y);
      this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
      this.lineTo(x + w, y + h - r.br);
      this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
      this.lineTo(x + r.bl, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
      this.lineTo(x, y + r.tl);
      this.quadraticCurveTo(x, y, x + r.tl, y);
      this.closePath();
      return this;
    };
  }

  // Старт
  restart(true);
})();


