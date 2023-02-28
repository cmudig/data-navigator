export const keyCodes = {
  parent: 27, // ESCAPE
  child: 13, // ENTER
  select: 32, // SPACEBAR
  nextSibling: 39, // RIGHT ARROW
  previousSibling: 37, // LEFT ARROW
  nextCousin: 40, // DOWN ARROW
  previousCousin: 38, // UP ARROW
  nextCousinAlternate: 190, // PERIOD
  previousCousinAlternate: 188, // COMMA
  shift: 16, // SHIFT
  tab: 9 // TAB
};

export const defaultKeyBindings = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  Period: 'forward',
  Comma: 'backward',
  Escape: 'parent',
  Enter: 'child'
};
