// Label building with end-user settings. Labels are functions, so a change applies
// the next time a node is announced, in both keyboard and text chat.

const STORAGE_KEY = 'dn-pattern-label-settings';
export const defaultSettings = {
    keys: 'auto', // 'auto' (author's choice per chart), 'never', 'groups' (only group names), or 'always'
    order: 'value-first', // 'value-first' or 'value-last'
    groups: 'short' // 'short' or 'detailed'
};

const load = () => {
    try {
        return { ...defaultSettings, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
    } catch {
        return { ...defaultSettings };
    }
};
let settings = load();

export const getSettings = () => settings;
export const setSettings = next => {
    settings = { ...settings, ...next };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // storage can be blocked; settings still apply for this visit
    }
};

/*
    values:      the numbers, e.g. [{ key: 'Count', value: 5 }]
    categories:  the groups, e.g. [{ key: 'Fruit', value: 'Apple' }, { key: 'Store', value: 'B', bare: 'Store B' }]
    keysByDefault: whether this chart needs key names when keys is 'auto' (true for scatterplots)

    'bare' is how a category reads with no key name. "B" alone is unclear, so it reads "Store B".
*/
export const pointLabel = ({ values = [], categories = [], keysByDefault = false }, s = settings) => {
    const auto = s.keys === 'auto' && keysByDefault;
    const valueKeys = s.keys === 'always' || auto;
    const groupKeys = valueKeys || s.keys === 'groups';
    const show = (part, keyed) => (keyed ? `${part.key}: ${part.value}` : (part.bare ?? part.value));
    const nums = values.map(v => show(v, valueKeys));
    const cats = categories.map(c => show(c, groupKeys));
    return (s.order === 'value-first' ? [...nums, ...cats] : [...cats, ...nums]).join(', ');
};

// A group names itself, then gives a short or detailed summary.
export const groupLabel = ({ name, short, detail }, s = settings) =>
    `${name}. ${s.groups === 'detailed' && detail ? `${short} ${detail}` : short}`;
