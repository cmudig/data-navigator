import { NodeElementDefaults } from './consts';

export default (options: RenderingOptions) => {
    let renderer = {} as any;
    let initialized = false;
    let defaults = {
        cssClass: NodeElementDefaults.cssClass,
        dimensions: { ...NodeElementDefaults.dimensions },
        semantics: { ...NodeElementDefaults.semantics },
        parentSemantics: { ...NodeElementDefaults.parentSemantics },
        existingElement: { ...NodeElementDefaults.existingElement }
    };
    if (options.defaults) {
        defaults.cssClass = options.defaults.cssClass || defaults.cssClass;
        defaults.dimensions = options.defaults.dimensions
            ? { ...defaults.dimensions, ...options.defaults.dimensions }
            : defaults.dimensions;
        defaults.semantics = options.defaults.semantics
            ? { ...defaults.semantics, ...options.defaults.semantics }
            : defaults.semantics;
        defaults.parentSemantics = options.defaults.parentSemantics
            ? { ...defaults.parentSemantics, ...options.defaults.parentSemantics }
            : defaults.parentSemantics;
        defaults.existingElement = options.defaults.existingElement
            ? { ...defaults.existingElement, ...options.defaults.existingElement }
            : defaults.existingElement;
    }
    renderer.initialize = () => {
        if (initialized) {
            console.error(
                `The renderer wrapper has already been initialized successfully, RenderingOptions.suffixId is: ${options.suffixId}. No further action was taken.`
            );
            return;
        }
        if (options.root && document.getElementById(options.root.id)) {
            renderer.root = document.getElementById(options.root.id);
        } else {
            console.error(
                'No root element found, cannot build: RenderingOptions.root.id must reference an existing DOM element in order to render children.'
            );
            return;
        }
        renderer.root.style.position = 'relative';
        renderer.root.classList.add('dn-root');
        if (!options.suffixId) {
            console.error('No suffix id found: options.suffixId must be specified.');
            return;
        }
        // build renderer.wrapper
        renderer.wrapper = document.createElement('div');
        renderer.wrapper.id = 'dn-wrapper-' + options.suffixId;
        renderer.wrapper.classList.add('dn-wrapper');
        renderer.wrapper.style.width = options.root && options.root.width ? options.root.width : '100%';
        if (options.root && options.root.height) {
            renderer.wrapper.style.height = options.root.height;
        }

        // TO-DO: build interaction instructions/menu

        // build entry button
        if (options.entryButton && options.entryButton.include) {
            renderer.entryButton = document.createElement('button');
            renderer.entryButton.id = 'dn-entry-button-' + options.suffixId;
            renderer.entryButton.classList.add('dn-entry-button');
            renderer.entryButton.innerText = `Enter navigation area`;
            if (options.entryButton.callbacks && options.entryButton.callbacks.click) {
                renderer.entryButton.addEventListener('click', options.entryButton.callbacks.click);
            }
            if (options.entryButton.callbacks && options.entryButton.callbacks.focus) {
                renderer.entryButton.addEventListener('focus', options.entryButton.callbacks.focus);
            }
            renderer.wrapper.appendChild(renderer.entryButton);
        }

        renderer.root.appendChild(renderer.wrapper);

        if (options.exitElement?.include) {
            renderer.exitElement = document.createElement('div');
            renderer.exitElement.id = 'dn-exit-' + options.suffixId;
            renderer.exitElement.classList.add('dn-exit-position');
            renderer.exitElement.innerText = `End of data structure.`;
            renderer.exitElement.setAttribute('aria-label', `End of data structure.`);
            renderer.exitElement.setAttribute('role', 'note');
            renderer.exitElement.setAttribute('tabindex', '-1');
            renderer.exitElement.style.display = 'none';
            renderer.exitElement.addEventListener('focus', e => {
                // console.log("focused!",renderer.exitElement)
                renderer.exitElement.style.display = 'block';
                renderer.clearStructure();
                if (options.exitElement?.callbacks?.focus) {
                    options.exitElement.callbacks.focus(e);
                }
            });
            renderer.exitElement.addEventListener('blur', e => {
                renderer.exitElement.style.display = 'none';
                if (options.exitElement?.callbacks?.blur) {
                    options.exitElement.callbacks.blur(e);
                }
            });

            renderer.root.appendChild(renderer.exitElement);
        }
        initialized = true;
        return renderer.root;
    };
    renderer.render = (nodeData: NodeObject) => {
        const id = nodeData.renderId + '';
        let d = options.elementData[id];
        if (!d) {
            console.warn(`Render data not found with renderId: ${id}. Failed to render.`);
            return;
        }

        if (!initialized) {
            console.error('render() was called before initialize(), renderer must be initialized first.');
            return;
        }
        let useExisting = false;
        let existingDimensions = {};
        const resolveProp = (prop, subprop?, checkExisting?) => {
            const p1 = d[prop] || defaults[prop];
            const s1 = !(checkExisting && useExisting) ? p1[subprop] : existingDimensions[subprop];
            const s2 = defaults[prop][subprop];
            return typeof p1 === 'function'
                ? p1(d, nodeData.datum)
                : typeof s1 === 'function'
                ? s1(d, nodeData.datum)
                : s1 || s2 || (!subprop ? p1 : undefined);
        };
        useExisting = resolveProp('existingElement', 'useForDimensions');
        existingDimensions = resolveProp('existingElement', 'dimensions');
        const width = parseFloat(resolveProp('dimensions', 'width', true) || 0);
        const height = parseFloat(resolveProp('dimensions', 'height', true) || 0);
        const x = parseFloat(resolveProp('dimensions', 'x', true) || 0);
        const y = parseFloat(resolveProp('dimensions', 'y', true) || 0);
        const node = document.createElement(resolveProp('parentSemantics', 'elementType'));
        const wrapperAttrs = resolveProp('parentSemantics', 'attributes');
        if (typeof wrapperAttrs === 'object') {
            Object.keys(wrapperAttrs).forEach(wrapperAttr => {
                node.setAttribute(wrapperAttr, wrapperAttrs[wrapperAttr]);
            });
        }
        node.setAttribute('role', resolveProp('parentSemantics', 'role'));
        node.id = id;
        node.classList.add('dn-node');
        node.classList.add(resolveProp('cssClass'));
        node.style.width = width + 'px';
        node.style.height = height + 'px';
        node.style.left = x + 'px';
        node.style.top = y + 'px';
        node.setAttribute('tabindex', '-1');

        const nodeText = document.createElement(resolveProp('semantics', 'elementType'));
        const attributes = resolveProp('semantics', 'attributes');
        if (typeof attributes === 'object') {
            Object.keys(attributes).forEach(attribute => {
                node.setAttribute(attribute, attributes[attribute]);
            });
        }
        nodeText.setAttribute('role', resolveProp('semantics', 'role'));
        nodeText.classList.add('dn-node-text');
        if (d.showText) {
            nodeText.innerText = d.semantics.label;
        }
        const label = resolveProp('semantics', 'label');
        if (!label) {
            console.error(
                'Accessibility error: a label must be supplied to every rendered element using semantics.label.'
            );
        }
        nodeText.setAttribute('aria-label', label);

        node.appendChild(nodeText);
        const hasPath = resolveProp('dimensions', 'path');
        if (hasPath) {
            const totalWidth = width + x + 10;
            const totalHeight = height + y + 10;
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', totalWidth + '');
            svg.setAttribute('height', totalHeight + '');
            svg.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);
            svg.style.left = -x + 'px';
            svg.style.top = -y + 'px';
            svg.classList.add('dn-node-svg');
            svg.setAttribute('role', 'presentation');
            svg.setAttribute('focusable', 'false');

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', hasPath);
            path.classList.add('dn-node-path');
            svg.appendChild(path);
            node.appendChild(svg);
        }
        renderer.wrapper.appendChild(node);
        return node;
    };
    renderer.remove = renderId => {
        const node = document.getElementById(renderId);
        if (node) {
            node.remove();
        }
    };
    renderer.clearStructure = () => {
        [...renderer.wrapper.children].forEach(child => {
            if (!(renderer.entryButton && renderer.entryButton === child)) {
                renderer.remove(child.id);
            }
        });
    };
    return renderer;
};
