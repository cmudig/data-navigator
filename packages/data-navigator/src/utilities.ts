import { DatumObject, DescriptionOptions } from './data-navigator';

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
