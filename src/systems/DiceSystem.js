export function rollDice(count) {
  const dice = [];
  for (let i = 0; i < count; i++) {
    dice.push(Math.floor(Math.random() * 6) + 1);
  }
  return dice;
}

export function sum(dice) {
  return dice.reduce((a, b) => a + b, 0);
}
