(() => {
  const state = CalculatorEngine.createState();

  const screenEl = document.getElementById('screen');
  const indM = document.getElementById('ind-m');
  const indSto = document.getElementById('ind-sto');
  const indE = document.getElementById('ind-e');

  let stoFlashTimer = null;

  function render() {
    screenEl.textContent = state.display;
    indM.classList.toggle('active', state.memory !== 0);
    indE.classList.toggle('active', state.error);
  }

  function flashSto() {
    indSto.classList.add('flash');
    clearTimeout(stoFlashTimer);
    stoFlashTimer = setTimeout(() => indSto.classList.remove('flash'), 500);
  }

  function pressVisual(el) {
    if (!el) return;
    el.classList.add('pressed');
    setTimeout(() => el.classList.remove('pressed'), 90);
  }

  // Central dispatcher: every valid key action funnels through here so the
  // click sound and re-render always stay in sync with a state mutation.
  function dispatch(action, el) {
    switch (action.type) {
      case 'digit': CalculatorEngine.inputDigit(state, action.value); break;
      case 'decimal': CalculatorEngine.inputDecimal(state); break;
      case 'op': CalculatorEngine.inputOperator(state, action.value); break;
      case 'equals': CalculatorEngine.inputEquals(state); break;
      case 'percent': CalculatorEngine.inputPercent(state); break;
      case 'sqrt': CalculatorEngine.inputSqrt(state); break;
      case 'sign': CalculatorEngine.toggleSign(state); break;
      case 'backspace': CalculatorEngine.backspace(state); break;
      case 'ac': CalculatorEngine.allClear(state); break;
      case 'clear': CalculatorEngine.clearOrAllClear(state); break;
      case 'mc': CalculatorEngine.memoryClear(state); break;
      case 'mr': CalculatorEngine.memoryRecall(state); break;
      case 'm+': CalculatorEngine.memoryAdd(state); flashSto(); break;
      case 'm-': CalculatorEngine.memorySubtract(state); flashSto(); break;
      default: return;
    }
    ClickSound.play();
    pressVisual(el);
    render();
  }

  // --- Mouse / touch wiring ---
  document.querySelectorAll('.key').forEach((btn) => {
    btn.addEventListener('click', () => {
      const { digit, action, op } = btn.dataset;
      if (digit !== undefined) return dispatch({ type: 'digit', value: digit }, btn);
      if (op !== undefined) return dispatch({ type: 'op', value: op }, btn);
      if (action !== undefined) return dispatch({ type: action }, btn);
    });
  });

  // --- Keyboard wiring ---
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return; // no key-repeat, matches a physical button press

    if (e.key >= '0' && e.key <= '9') {
      return dispatch({ type: 'digit', value: e.key }, document.querySelector(`[data-digit="${e.key}"]`));
    }
    if (e.key === '.') return dispatch({ type: 'decimal' }, document.querySelector('[data-action="decimal"]'));
    if (e.key === '+') return dispatch({ type: 'op', value: '+' }, document.querySelector('[data-op="+"]'));
    if (e.key === '-') return dispatch({ type: 'op', value: '-' }, document.querySelector('[data-op="-"]'));
    if (e.key === '*') return dispatch({ type: 'op', value: '×' }, document.querySelector('[data-op="×"]'));
    if (e.key === '/') { e.preventDefault(); return dispatch({ type: 'op', value: '÷' }, document.querySelector('[data-op="÷"]')); }
    if (e.key === '%') return dispatch({ type: 'percent' }, document.querySelector('[data-action="percent"]'));
    if (e.key === 'Enter' || e.key === '=') return dispatch({ type: 'equals' }, document.querySelector('[data-action="equals"]'));
    if (e.key === 'Escape') return dispatch({ type: 'ac' }, document.querySelector('[data-action="clear"]'));
    if (e.key === 'Backspace') return dispatch({ type: 'backspace' }, document.querySelector('[data-action="backspace"]'));
  });

  render();
})();
