export const describeNode = (d: DatumObject, descriptionOptions?: DescriptionOptions) => {
    const keys = Object.keys(d);
    let description = '';
    keys.forEach(key => {
        description += `${descriptionOptions.omitKeyNames ? '' : key + ': '}${d[key]}. `;
    });
    description += descriptionOptions.semanticLabel || 'Data point.';
    return description;
};
