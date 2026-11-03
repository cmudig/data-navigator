import { keyLabel } from 'data-navigator';

export const commands = [
    {
        rule: 'left',
        key: 'ArrowLeft',
        direction: 'source',
        action: 'Previous year, same browser',
        say: ['previous', 'previous year', 'backward', 'earlier'],
        hand: 'Point left',
        head: 'Turn left',
        touch: 'Swipe left'
    },
    {
        rule: 'right',
        key: 'ArrowRight',
        direction: 'target',
        action: 'Next year, same browser',
        say: ['next', 'next year', 'forward', 'later'],
        hand: 'Point right',
        head: 'Turn right',
        touch: 'Swipe right'
    },
    {
        rule: 'up',
        key: 'ArrowUp',
        direction: 'source',
        action: 'Browser above, same year',
        say: ['above', 'higher', 'browser above'],
        hand: 'Point up',
        head: 'Chin up',
        touch: 'Swipe up'
    },
    {
        rule: 'down',
        key: 'ArrowDown',
        direction: 'target',
        action: 'Browser below, same year',
        say: ['below', 'lower', 'browser below'],
        hand: 'Point down',
        head: 'Chin down',
        touch: 'Swipe down'
    },
    {
        rule: 'drill-in',
        key: 'Enter',
        direction: 'target',
        label: 'drill in',
        action: 'Drill in',
        say: ['in', 'child', 'go in', 'open', 'deeper', 'zoom in'],
        hand: 'Open palm',
        head: 'Open mouth',
        touch: 'Double tap'
    },
    {
        rule: 'drill-out',
        key: 'Backspace',
        direction: 'source',
        label: 'drill out',
        action: 'Up one level (to the year from a data point)',
        alsoOn: ['to-year', 'to-browser'],
        say: ['out', 'parent', 'back', 'go out', 'go back', 'zoom out', 'up a level'],
        hand: 'Thumb up',
        head: 'Close eyes for 1 second',
        touch: 'Long press'
    },
    {
        rule: 'to-year',
        key: 'KeyW',
        direction: 'source',
        label: 'up to the year',
        action: 'Up to the year',
        say: [
            'year',
            'column',
            'up to year',
            'drill out to year',
            'drill out to the year',
            'out to year',
            'out to the year',
            'back to year',
            'back to the year',
            'go to year',
            'go to the year'
        ],
        hand: 'Fist',
        head: 'Tilt left',
        touch: 'Not available'
    },
    {
        rule: 'to-browser',
        key: 'KeyJ',
        direction: 'source',
        label: 'up to the browser',
        action: 'Up to the browser',
        say: [
            'browser',
            'series',
            'row',
            'up to browser',
            'drill out to browser',
            'drill out to the browser',
            'out to browser',
            'out to the browser',
            'back to browser',
            'back to the browser',
            'go to browser',
            'go to the browser'
        ],
        hand: 'Victory (two fingers)',
        head: 'Tilt right',
        touch: 'Two-finger tap'
    },
    {
        rule: 'exit',
        key: 'Escape',
        direction: 'target',
        action: 'Exit the chart',
        say: [],
        hand: 'Thumb down',
        head: 'Frown',
        touch: 'Not available'
    }
];

const aliasName = phrase => phrase.replace(/\s+/g, '-');

export const navigationRules = {};
export const commandLabels = {};
export const aliases = {};

commands.forEach(c => {
    navigationRules[c.rule] = { key: c.key, direction: c.direction };
    if (c.label) commandLabels[c.rule] = c.label;
    aliases[c.rule] = c.say.map(aliasName).filter(name => name !== c.rule);
    c.say.forEach(phrase => {
        const name = aliasName(phrase);
        navigationRules[name] = { direction: c.direction };
        if (name !== phrase) commandLabels[name] = phrase;
    });
});

// #region aliases
export const addAliases = structure => {
    Object.values(structure.edges).forEach(edge => {
        const rules = new Set(edge.navigationRules);
        commands.forEach(c => {
            if (c.alsoOn?.some(r => rules.has(r))) rules.add(c.rule);
        });
        [...rules].forEach(r => (aliases[r] || []).forEach(a => rules.add(a)));
        edge.navigationRules = [...rules];
    });
    return structure;
};
// #endregion aliases

export const ruleFor = (field, value) => commands.find(c => c[field] === value)?.rule;

export const tableRows = commands.map(c => ({
    description: c.action,
    label: keyLabel(c.key),
    command: [c.label || c.rule, ...c.say].join(', '),
    hand: c.hand,
    head: c.head,
    touch: c.touch
}));

export const tableColumns = [
    { label: 'Action', id: 'description' },
    { label: 'Key', id: 'label' },
    { label: 'Say or type', id: 'command' },
    { label: 'Hand', id: 'hand' },
    { label: 'Head', id: 'head' },
    { label: 'Touch', id: 'touch' }
];
