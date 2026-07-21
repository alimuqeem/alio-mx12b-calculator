// Casio MX-12B-style calculator engine.
// Pure state machine, no DOM dependency, so it can be unit-tested standalone.

const MAX_DIGITS = 12;
const ERROR_DISPLAY = 'E';

function createState() {
  return {
    display: '0',
    previousValue: null,
    operator: null,
    overwrite: true,
    memory: 0,
    error: false
  };
}

// Formats a number to fit the 12-digit display, or returns null on overflow.
function formatNumber(num) {
  if (!isFinite(num)) return null;
  if (Math.abs(num) >= 1e12) return null;

  // Neutralise floating point artifacts (e.g. 0.1 + 0.2) before counting digits.
  num = Math.round(num * 1e9) / 1e9;

  let str;
  if (Number.isInteger(num)) {
    str = num.toString();
  } else {
    const intDigits = Math.max(1, Math.trunc(Math.abs(num)).toString().length);
    const decimals = Math.max(0, MAX_DIGITS - intDigits);
    str = num.toFixed(decimals);
    if (str.includes('.')) {
      str = str.replace(/0+$/, '').replace(/\.$/, '');
    }
  }

  const digitCount = str.replace('-', '').replace('.', '').length;
  if (digitCount > MAX_DIGITS) return null;
  return str;
}

function compute(a, b, operator) {
  switch (operator) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return b === 0 ? null : a / b;
    default: return b;
  }
}

function setError(state) {
  state.error = true;
  state.display = ERROR_DISPLAY;
  state.previousValue = null;
  state.operator = null;
  state.overwrite = true;
}

function inputDigit(state, digit) {
  if (state.error) return;

  if (state.overwrite) {
    state.display = digit === '00' ? '0' : digit;
    state.overwrite = false;
    return;
  }

  if (state.display === '0' && digit !== '00') {
    state.display = digit;
    return;
  }

  const combined = state.display + digit;
  const digitCount = combined.replace('-', '').replace('.', '').length;
  if (digitCount > MAX_DIGITS) return;
  state.display = combined;
}

function inputDecimal(state) {
  if (state.error) return;
  if (state.overwrite) {
    state.display = '0.';
    state.overwrite = false;
    return;
  }
  if (!state.display.includes('.')) state.display += '.';
}

function inputOperator(state, operator) {
  if (state.error) return;
  const inputValue = parseFloat(state.display);

  if (state.operator && !state.overwrite) {
    const result = compute(state.previousValue, inputValue, state.operator);
    if (result === null) return setError(state);
    const formatted = formatNumber(result);
    if (formatted === null) return setError(state);
    state.display = formatted;
    state.previousValue = result;
  } else {
    state.previousValue = inputValue;
  }

  state.operator = operator;
  state.overwrite = true;
}

function inputEquals(state) {
  if (state.error) return;
  if (state.operator === null) return;

  const inputValue = parseFloat(state.display);
  const result = compute(state.previousValue, inputValue, state.operator);
  if (result === null) return setError(state);

  const formatted = formatNumber(result);
  if (formatted === null) return setError(state);

  state.display = formatted;
  state.previousValue = null;
  state.operator = null;
  state.overwrite = true;
}

// Casio percent semantics:
//   A + B % => A + (A * B / 100)
//   A - B % => A - (A * B / 100)
//   A x B % => (A * B) / 100
//   A / B % => A / (B / 100)
//   B % (no pending operator) => B / 100
function inputPercent(state) {
  if (state.error) return;
  const b = parseFloat(state.display);
  let result;

  if (state.operator && state.previousValue !== null) {
    const a = state.previousValue;
    switch (state.operator) {
      case '+': result = a + (a * b) / 100; break;
      case '-': result = a - (a * b) / 100; break;
      case '×': result = (a * b) / 100; break;
      case '÷':
        if (b === 0) return setError(state);
        result = a / (b / 100);
        break;
      default: result = b / 100;
    }
    state.operator = null;
    state.previousValue = null;
  } else {
    result = b / 100;
  }

  const formatted = formatNumber(result);
  if (formatted === null) return setError(state);
  state.display = formatted;
  state.overwrite = true;
}

function inputSqrt(state) {
  if (state.error) return;
  const value = parseFloat(state.display);
  if (value < 0) return setError(state);

  const formatted = formatNumber(Math.sqrt(value));
  if (formatted === null) return setError(state);
  state.display = formatted;
  state.overwrite = true;
}

function toggleSign(state) {
  if (state.error) return;
  if (parseFloat(state.display) === 0) return;
  state.display = state.display.startsWith('-')
    ? state.display.slice(1)
    : '-' + state.display;
}

function backspace(state) {
  if (state.error || state.overwrite) return;
  const bare = state.display.startsWith('-') ? state.display.slice(1) : state.display;
  if (bare.length <= 1) {
    state.display = '0';
    state.overwrite = true;
    return;
  }
  state.display = state.display.slice(0, -1);
  if (state.display === '-' || state.display === '') {
    state.display = '0';
    state.overwrite = true;
  }
}

function allClear(state) {
  state.display = '0';
  state.previousValue = null;
  state.operator = null;
  state.overwrite = true;
  state.error = false;
}

function clearEntry(state) {
  state.display = '0';
  state.overwrite = true;
  state.error = false;
}

// The real MX-12B has a single combined C/AC key: pressing it clears the
// current entry (like C) unless the display is already at 0 or in an
// error state, in which case it performs a full reset (like AC).
function clearOrAllClear(state) {
  if (state.error || state.display === '0') {
    allClear(state);
  } else {
    clearEntry(state);
  }
}

function memoryAdd(state) {
  if (state.error) return;
  state.memory += parseFloat(state.display);
  state.overwrite = true;
}

function memorySubtract(state) {
  if (state.error) return;
  state.memory -= parseFloat(state.display);
  state.overwrite = true;
}

function memoryRecall(state) {
  if (state.error) return;
  state.display = formatNumber(state.memory) || '0';
  state.overwrite = true;
}

function memoryClear(state) {
  state.memory = 0;
}

const CalculatorEngine = {
  MAX_DIGITS,
  createState,
  formatNumber,
  inputDigit,
  inputDecimal,
  inputOperator,
  inputEquals,
  inputPercent,
  inputSqrt,
  toggleSign,
  backspace,
  allClear,
  clearEntry,
  clearOrAllClear,
  memoryAdd,
  memorySubtract,
  memoryRecall,
  memoryClear
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CalculatorEngine;
} else {
  window.CalculatorEngine = CalculatorEngine;
}
