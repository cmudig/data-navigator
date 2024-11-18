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
