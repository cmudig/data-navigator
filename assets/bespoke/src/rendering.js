import dataNavigator from 'data-navigator';

export function createRenderer(structure, onEnter) {
    const renderer = dataNavigator.rendering({
        elementData: structure.nodes,
        defaults: { cssClass: 'dn-bespoke-node' },
        suffixId: 'bespoke',
        root: {
            id: 'bespoke-wrapper',
            description:
                'Stratigraphic chart of glacial till units in Wisconsin. Three columns by sediment source direction, arranged by geological age.',
            width: '100%',
            height: 0
        },
        entryButton: { include: true, callbacks: { click: onEnter } },
        exitElement: { include: true }
    });
    renderer.initialize();
    return renderer;
}
