const assert = require('assert');
const Engine = require('../js/calculator-engine.js');

function run(ops) {
  const state = Engine.createState();
  for (const op of ops) op(state);
  return state;
}

const digit = (d) => (s) => Engine.inputDigit(s, d);
const op = (o) => (s) => Engine.inputOperator(s, o);
const eq = () => (s) => Engine.inputEquals(s);
const pct = () => (s) => Engine.inputPercent(s);
const sqrt = () => (s) => Engine.inputSqrt(s);
const sign = () => (s) => Engine.toggleSign(s);
const dot = () => (s) => Engine.inputDecimal(s);
const back = () => (s) => Engine.backspace(s);
const ac = () => (s) => Engine.allClear(s);
const c = () => (s) => Engine.clearEntry(s);
const clearKey = () => (s) => Engine.clearOrAllClear(s);
const mplus = () => (s) => Engine.memoryAdd(s);
const mminus = () => (s) => Engine.memorySubtract(s);
const mr = () => (s) => Engine.memoryRecall(s);
const mc = () => (s) => Engine.memoryClear(s);

let passed = 0;
function check(name, actual, expected) {
  assert.strictEqual(actual, expected, `${name}: expected ${expected}, got ${actual}`);
  passed++;
}

// Basic arithmetic
check('2+3=', run([digit('2'), op('+'), digit('3'), eq()]).display, '5');
check('9-4=', run([digit('9'), op('-'), digit('4'), eq()]).display, '5');
check('6x7=', run([digit('6'), op('×'), digit('7'), eq()]).display, '42');
check('20/4=', run([digit('2'), digit('0'), op('÷'), digit('4'), eq()]).display, '5');
check('div by zero -> E', run([digit('5'), op('÷'), digit('0'), eq()]).display, 'E');
check('1/3 uses full 12-digit budget', run([digit('1'), op('÷'), digit('3'), eq()]).display, '0.33333333333');
check('0.1+0.2 has no float noise', run([digit('0'), dot(), digit('1'), op('+'), digit('0'), dot(), digit('2'), eq()]).display, '0.3');

// Chain calculation
check('2+3+4=', run([digit('2'), op('+'), digit('3'), op('+'), digit('4'), eq()]).display, '9');

// Percent semantics (Casio-specific)
check('100+10%=', run([digit('1'), digit('0'), digit('0'), op('+'), digit('1'), digit('0'), pct()]).display, '110');
check('200-10%=', run([digit('2'), digit('0'), digit('0'), op('-'), digit('1'), digit('0'), pct()]).display, '180');
check('50x20%=', run([digit('5'), digit('0'), op('×'), digit('2'), digit('0'), pct()]).display, '10');
check('50/25%=', run([digit('5'), digit('0'), op('÷'), digit('2'), digit('5'), pct()]).display, '200');
check('50% alone', run([digit('5'), digit('0'), pct()]).display, '0.5');

// 00 key
check('00 does not exceed digits', run([digit('1'), digit('00'), digit('00')]).display, '10000');
check('00 on leading zero stays 0', run([digit('00')]).display, '0');
check('0 then 00 stays 0 (no "000")', run([digit('0'), digit('00')]).display, '0');
check('0 then 00 then 5 replaces leading zero', run([digit('0'), digit('00'), digit('5')]).display, '5');

// sqrt
check('sqrt(9)', run([digit('9'), sqrt()]).display, '3');
check('sqrt(-1) -> E', run([digit('9'), sign(), sqrt()]).display, 'E');

// sign toggle
check('toggle sign', run([digit('5'), sign()]).display, '-5');
check('toggle sign twice', run([digit('5'), sign(), sign()]).display, '5');

// decimal
check('decimal input', run([digit('1'), dot(), digit('5')]).display, '1.5');
check('double decimal ignored', run([digit('1'), dot(), digit('5'), dot(), digit('2')]).display, '1.52');

// backspace
check('backspace removes last digit', run([digit('1'), digit('2'), digit('3'), back()]).display, '12');
check('backspace to empty resets to 0', run([digit('5'), back()]).display, '0');

// clear entry vs all clear
{
  const s = run([digit('7'), op('+'), digit('3'), c()]);
  check('C clears entry, keeps operator', s.display, '0');
  Engine.inputDigit(s, '2');
  Engine.inputEquals(s);
  check('C: 7+ then C then 2 =', s.display, '9');
}
check('AC full reset', run([digit('7'), op('+'), digit('3'), ac(), digit('2')]).display, '2');

// combined C/AC key: first press clears entry only, second (at 0) does full reset
{
  const s = run([digit('7'), op('+'), digit('3'), clearKey()]);
  check('C/AC first press clears entry, keeps pending op', s.display, '0');
  Engine.inputDigit(s, '2');
  Engine.inputEquals(s);
  check('C/AC: 7+ then clear then 2 =', s.display, '9');
}
check('C/AC second press (at 0) fully resets', run([
  digit('7'), op('+'), digit('3'), clearKey(), clearKey(), digit('2')
]).display, '2');
check('C/AC clears error state', run([digit('5'), op('÷'), digit('0'), eq(), clearKey()]).display, '0');

// memory
{
  const s = run([digit('5'), mplus(), digit('3'), mminus(), mr()]);
  check('M+ then M- then MR', s.display, '2');
  Engine.memoryClear(s);
  Engine.memoryRecall(s);
  check('MC clears memory', s.display, '0');
}
{
  // Memory itself isn't digit-capped, so it can hold an unrepresentable
  // value; recalling it must show E, not silently fall back to 0.
  const s = Engine.createState();
  s.memory = 5e12;
  Engine.memoryRecall(s);
  check('MR overflow shows E, not 0', s.display, 'E');
}

// 12-digit overflow
check('overflow -> E', run([digit('9'), digit('9'), digit('9'), digit('9'), digit('9'), digit('9'),
  digit('9'), digit('9'), digit('9'), digit('9'), digit('9'), op('×'), digit('9'), digit('9'), eq()]).display, 'E');

// digit cap enforced on entry
check('12-digit cap on entry', run([
  digit('1'), digit('2'), digit('3'), digit('4'), digit('5'), digit('6'),
  digit('7'), digit('8'), digit('9'), digit('0'), digit('1'), digit('2'), digit('3')
]).display, '123456789012');

console.log(`${passed} assertions passed.`);
