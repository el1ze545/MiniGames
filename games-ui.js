// Склонение: plural(1, 'попытку', 'попытки', 'попыток') -> 'попытку'
function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

const gameModal = {
  // token растёт при каждом закрытии окна. Игры с таймерами сверяют его,
  // чтобы не «оживить» уже закрытое окно
  token: 0,
  lastFocus: null,
  overlay: null,
  titleEl: null,
  bodyEl: null,
  closeBtn: null,

  init() {
    if (document.getElementById('game-modal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'game-modal';
    overlay.className = 'game-modal';
    overlay.innerHTML = `
      <div class="game-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="game-modal-title">
        <button class="game-modal__close" type="button" aria-label="Закрыть">&times;</button>
        <h2 class="game-modal__title" id="game-modal-title"></h2>
        <div class="game-modal__body"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    this.overlay = overlay;
    this.titleEl = overlay.querySelector('.game-modal__title');
    this.bodyEl = overlay.querySelector('.game-modal__body');
    this.closeBtn = overlay.querySelector('.game-modal__close');

    this.closeBtn.addEventListener('click', () => this.close());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });
    document.addEventListener('keydown', (e) => {
      if (!overlay.classList.contains('game-modal_open')) return;

      if (e.key === 'Escape') {
        this.close();
        return;
      }

      // Tab не должен «убегать» за окно на страницу под ним
      if (e.key === 'Tab') {
        const focusable = overlay.querySelectorAll('button:not([disabled]), input:not([disabled])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  },

  open(title, contentHtml) {
    this.init();
    // запоминаем, откуда открыли окно, только при первом открытии (не при перерисовке)
    if (!this.overlay.classList.contains('game-modal_open')) {
      this.lastFocus = document.activeElement;
    }
    this.titleEl.textContent = title;
    this.bodyEl.innerHTML = contentHtml;
    this.overlay.classList.add('game-modal_open');
    document.body.style.overflow = 'hidden';
  },

  close() {
    if (!this.overlay || !this.overlay.classList.contains('game-modal_open')) return;
    this.token += 1;
    this.overlay.classList.remove('game-modal_open');
    document.body.style.overflow = '';
    this.bodyEl.innerHTML = '';
    if (this.lastFocus && typeof this.lastFocus.focus === 'function') {
      this.lastFocus.focus();
    }
  },

  setBody(html) {
    this.bodyEl.innerHTML = html;
  }
};

/* ---------- 1. Угадай число ---------- */
function guessNumber() {
  const secret = Math.floor(Math.random() * 100) + 1;
  let attempts = 0;

  gameModal.open('Угадай число', `
    <p class="game-ui__hint">Я загадал число от 1 до 100. Попробуй угадать!</p>
    <div class="game-ui__row">
      <input type="number" id="guess-input" class="game-ui__input" min="1" max="100" placeholder="Твой вариант" />
      <button type="button" id="guess-btn" class="game-ui__btn">Проверить</button>
    </div>
    <p id="guess-message" class="game-ui__message"></p>
    <p id="guess-attempts" class="game-ui__meta"></p>
  `);

  const input = document.getElementById('guess-input');
  const btn = document.getElementById('guess-btn');
  const message = document.getElementById('guess-message');
  const attemptsEl = document.getElementById('guess-attempts');

  function check() {
    const value = Number(input.value);
    if (!input.value || !Number.isInteger(value) || value < 1 || value > 100) {
      message.textContent = 'Введи число от 1 до 100';
      message.className = 'game-ui__message game-ui__message_error';
      return;
    }

    attempts += 1;
    attemptsEl.textContent = `Попыток: ${attempts}`;

    if (value === secret) {
      message.textContent = `Молодец! Число ${secret} угадано за ${attempts} ${plural(attempts, 'попытку', 'попытки', 'попыток')}.`;
      message.className = 'game-ui__message game-ui__message_success';
      btn.disabled = true;
      input.disabled = true;
      btn.insertAdjacentHTML('afterend', `
        <button type="button" class="game-ui__btn game-ui__btn_secondary" id="guess-restart">Играть снова</button>
      `);
      document.getElementById('guess-restart').addEventListener('click', guessNumber);
    } else if (value > secret) {
      message.textContent = 'Меньше';
      message.className = 'game-ui__message';
    } else {
      message.textContent = 'Больше';
      message.className = 'game-ui__message';
    }
    input.value = '';
    input.focus();
  }

  btn.addEventListener('click', check);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') check();
  });
  input.focus();
}

/* ---------- 2. Простая арифметика ---------- */
function simpleArithmetic() {
  const operations = ['+', '-', '*', '/'];

  function makeExpression() {
    const op = operations[Math.floor(Math.random() * operations.length)];
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;

    switch (op) {
      case '+': return { text: `${a} + ${b}`, answer: a + b };
      case '-': return { text: `${a} - ${b}`, answer: a - b };
      case '*': return { text: `${a} * ${b}`, answer: a * b };
      // делим произведение на b, чтобы ответ всегда был целым
      default:  return { text: `${a * b} / ${b}`, answer: a };
    }
  }

  let current = makeExpression();
  let correct = 0;
  let total = 0;

  function render() {
    gameModal.open('Простая арифметика', `
      <p class="game-ui__hint">Реши пример:</p>
      <p class="game-ui__expression">${current.text}</p>
      <div class="game-ui__row">
        <input type="number" id="arith-input" class="game-ui__input" placeholder="Ответ" />
        <button type="button" id="arith-btn" class="game-ui__btn">Проверить</button>
      </div>
      <p id="arith-message" class="game-ui__message"></p>
      <p class="game-ui__meta">Правильно: <span id="arith-score">${correct}</span> / <span id="arith-total">${total}</span></p>
      <button type="button" id="arith-next" class="game-ui__btn game-ui__btn_secondary" style="display:none;margin-top:12px;">Следующий пример</button>
    `);

    const input = document.getElementById('arith-input');
    const btn = document.getElementById('arith-btn');
    const message = document.getElementById('arith-message');
    const nextBtn = document.getElementById('arith-next');

    function check() {
      const value = Number(input.value);
      if (input.value === '' || isNaN(value)) {
        message.textContent = 'Введи число';
        message.className = 'game-ui__message game-ui__message_error';
        return;
      }
      total += 1;
      document.getElementById('arith-total').textContent = total;

      if (value === current.answer) {
        correct += 1;
        document.getElementById('arith-score').textContent = correct;
        message.textContent = 'Правильно!';
        message.className = 'game-ui__message game-ui__message_success';
      } else {
        message.textContent = `Неправильно. Верный ответ: ${current.answer}`;
        message.className = 'game-ui__message game-ui__message_error';
      }
      btn.disabled = true;
      input.disabled = true;
      nextBtn.style.display = 'inline-flex';
    }

    function next() {
      current = makeExpression();
      render();
    }

    btn.addEventListener('click', check);
    nextBtn.addEventListener('click', next);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') check();
    });
    input.focus();
  }

  render();
}

/* ---------- 3. Переверни текст ---------- */
function turnTheTextOver() {
  gameModal.open('Переверни текст', `
    <p class="game-ui__hint">Введи текст — я переверну его задом наперёд.</p>
    <div class="game-ui__row game-ui__row_column">
      <input type="text" id="reverse-input" class="game-ui__input game-ui__input_wide" placeholder="Введи текст" />
      <button type="button" id="reverse-btn" class="game-ui__btn">Перевернуть</button>
    </div>
    <p id="reverse-result" class="game-ui__result"></p>
  `);

  const input = document.getElementById('reverse-input');
  const btn = document.getElementById('reverse-btn');
  const result = document.getElementById('reverse-result');

  function run() {
    const text = input.value.trim();
    if (!text) {
      result.textContent = 'Сначала введи текст';
      result.className = 'game-ui__result game-ui__message_error';
      return;
    }
    if (!/^[а-яА-ЯёЁa-zA-Z\s]+$/.test(text)) {
      result.textContent = 'Можно использовать только буквы и пробелы';
      result.className = 'game-ui__result game-ui__message_error';
      return;
    }
    result.textContent = text.split('').reverse().join('');
    result.className = 'game-ui__result game-ui__message_success';
  }

  btn.addEventListener('click', run);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') run();
  });
  input.focus();
}

/* ---------- 4. Викторина ---------- */
function gameQuiz() {
  const quiz = [
    {
      question: 'Какой цвет у неба?',
      options: ['Красный', 'Синий', 'Зеленый'],
      correct: 1
    },
    {
      question: 'Сколько дней в неделе?',
      options: ['Шесть', 'Семь', 'Восемь'],
      correct: 1
    },
    {
      question: 'Сколько у человека пальцев на одной руке?',
      options: ['Четыре', 'Пять', 'Шесть'],
      correct: 1
    }
  ];

  let index = 0;
  let score = 0;
  const token = gameModal.token;

  function showQuestion() {
    if (index >= quiz.length) {
      gameModal.open('Викторина', `
        <p class="game-ui__message game-ui__message_success">Игра завершена!</p>
        <p class="game-ui__expression">Правильных ответов: ${score} из ${quiz.length}</p>
        <button type="button" id="quiz-restart" class="game-ui__btn">Пройти ещё раз</button>
      `);
      document.getElementById('quiz-restart').addEventListener('click', gameQuiz);
      return;
    }

    const q = quiz[index];
    const optionsHtml = q.options
      .map((opt, i) => `<button type="button" class="game-ui__option" data-index="${i}">${i + 1}. ${opt}</button>`)
      .join('');

    gameModal.open('Викторина', `
      <p class="game-ui__meta">Вопрос ${index + 1} из ${quiz.length}</p>
      <p class="game-ui__expression">${q.question}</p>
      <div class="game-ui__options">${optionsHtml}</div>
      <p id="quiz-message" class="game-ui__message"></p>
    `);

    document.querySelectorAll('.game-ui__option').forEach((btn) => {
      btn.addEventListener('click', () => {
        const chosen = Number(btn.dataset.index);
        const message = document.getElementById('quiz-message');
        document.querySelectorAll('.game-ui__option').forEach((b) => (b.disabled = true));

        if (chosen === q.correct) {
          score += 1;
          message.textContent = 'Правильно!';
          message.className = 'game-ui__message game-ui__message_success';
          btn.classList.add('game-ui__option_correct');
        } else {
          message.textContent = `Неправильно. Верный ответ: ${q.options[q.correct]}`;
          message.className = 'game-ui__message game-ui__message_error';
          btn.classList.add('game-ui__option_wrong');
          document.querySelector(`.game-ui__option[data-index="${q.correct}"]`).classList.add('game-ui__option_correct');
        }

        setTimeout(() => {
          // окно закрыли за время паузы — ничего не открываем заново
          if (token !== gameModal.token) return;
          index += 1;
          showQuestion();
        }, 900);
      });
    });
  }

  showQuestion();
}

/* ---------- 5. Камень, ножницы, бумага ---------- */
function rockPaperScissors() {
  const acts = ['камень', 'ножницы', 'бумага'];
  const rules = {
    камень: 'ножницы',
    ножницы: 'бумага',
    бумага: 'камень'
  };
  // Простые символы, которые стабильно отображаются
  const icons = {
    камень: '✊',
    ножницы: '✌️',
    бумага: '✋'
  };

  let userScore = 0;
  let pcScore = 0;

  function render(lastResult = '') {
    gameModal.open('Камень, ножницы, бумага', `
      <p class="game-ui__meta game-ui__score">
        Счёт: <span class="game-ui__score-you">Ты ${userScore}</span>
        <span class="game-ui__score-sep">:</span>
        <span class="game-ui__score-pc">${pcScore} Комп</span>
      </p>
      <p class="game-ui__hint">Выбери свой ход:</p>
      <div class="game-ui__rps">
        ${acts.map((a) => `
          <button type="button" class="game-ui__rps-btn" data-act="${a}">
            <span class="game-ui__rps-icon">${icons[a]}</span>
            <span class="game-ui__rps-label">${a}</span>
          </button>
        `).join('')}
      </div>
      <p id="rps-result" class="game-ui__message">${lastResult}</p>
    `);

    document.querySelectorAll('.game-ui__rps-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const user = btn.dataset.act;
        const pc = acts[Math.floor(Math.random() * acts.length)];
        let text = '';

        if (user === pc) {
          text = `Ничья! Ты: ${icons[user]} · Комп: ${icons[pc]}`;
        } else if (rules[user] === pc) {
          userScore += 1;
          text = `Ты выиграл! Ты: ${icons[user]} · Комп: ${icons[pc]}`;
        } else {
          pcScore += 1;
          text = `Компьютер выиграл. Ты: ${icons[user]} · Комп: ${icons[pc]}`;
        }
        render(text);
      });
    });
  }

  render();
}

/* Цветовой генератор уже работает через hw-9.js — не трогаем */
