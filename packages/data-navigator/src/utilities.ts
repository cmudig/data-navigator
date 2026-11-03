import { GenericNavigationRuleCommands, KeyLabels } from './consts';
import { CommandObject, DatumObject, DescriptionOptions, NavId, NavigationRules } from './data-navigator';

export const describeNode = (d: DatumObject, descriptionOptions?: DescriptionOptions) => {
    const keys = Object.keys(d);
    let description = '';
    keys.forEach(key => {
        description += `${descriptionOptions && descriptionOptions.omitKeyNames ? '' : key + ': '}${d[key]}. `;
    });
    description += (descriptionOptions && descriptionOptions.semanticLabel) || 'Data point.';
    return description;
};

export const createValidId = (s: string): string => {
    // We start the string with an underscore, then replace all invalid characters with underscores
    return '_' + s.replace(/[^a-zA-Z0-9_-]+/g, '_');
};

// A short, readable name for a KeyboardEvent.code, e.g. 'ArrowLeft' -> '←', 'KeyW' -> 'W'.
export const keyLabel = (code?: string): string => {
    if (!code) return '';
    return KeyLabels[code] || code.replace(/^Key/, '').replace(/^Digit/, '');
};

// 'drill-out_species' -> 'Drill out species'
const humanizeRule = (navId: NavId): string => {
    const text = navId.replace(/[-_]+/g, ' ').trim();
    return text.charAt(0).toUpperCase() + text.slice(1);
};

/*
    Builds one command per navigation rule, in the order the rules are listed.
    - label: the rule's actual key, so remapped keys show correctly
    - description: from descriptions[navId], then the built-in description, then the rule name
    - command: the rule name, which is also what people type in text chat
    Rules without a built-in description (like 'to-year') are included too.
*/
export function getGenericCommandsFromNavRules(
    navigationRules?: NavigationRules,
    descriptions?: Record<NavId, string>
): CommandObject[] {
    if (!navigationRules) {
        return [];
    }
    return Object.keys(navigationRules).map(navId => {
        const rule = navigationRules[navId];
        const generic = GenericNavigationRuleCommands[navId];
        return {
            label: rule?.key ? keyLabel(rule.key) : generic?.label || '',
            description: descriptions?.[navId] || generic?.description || humanizeRule(navId),
            command: navId
        };
    });
}
