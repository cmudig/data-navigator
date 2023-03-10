(() => {
    'use strict';
    const e = {
            ArrowLeft: 'left',
            ArrowRight: 'right',
            ArrowUp: 'up',
            ArrowDown: 'down',
            Period: 'forward',
            Comma: 'backward',
            Escape: 'parent',
            Enter: 'child'
        },
        t = {
            down: { keyCode: 'ArrowDown', direction: 1 },
            left: { keyCode: 'ArrowLeft', direction: -1 },
            right: { keyCode: 'ArrowRight', direction: 1 },
            up: { keyCode: 'ArrowUp', direction: -1 },
            backward: { keyCode: 'Comma', direction: -1 },
            child: { keyCode: 'Enter', direction: 1 },
            parent: { keyCode: 'Backspace', direction: -1 },
            forward: { keyCode: 'Period', direction: 1 },
            exit: { keyCode: 'Escape', direction: 1 }
        },
        s = (e, t) => {
            const s = Object.keys(e);
            let a = '';
            return (
                s.forEach(s => {
                    a += `${t.omitKeyNames ? '' : s + ': '}${e[s]}. `;
                }),
                (a += t.semanticLabel || 'Data point.'),
                a
            );
        };
    console.log('bundled!');
    const a = (s => {
        let a = {},
            n = null,
            l = null,
            o = null,
            i = null,
            r = e,
            c = t,
            d = null;
        const p = e => {
                const t = r[e.code];
                t &&
                    (console.log('direction', t),
                    console.log('keycode', e.code),
                    console.log('keyBindings', r),
                    e.preventDefault(),
                    a.move(t));
            },
            h = e => {
                console.log('focus', e);
            },
            y = e => {
                const t = document.getElementById(e);
                t && (t.removeEventListener('keydown', p), t.removeEventListener('focus', h), t.remove());
            },
            g = (e, t) => {
                (e => {
                    const t = document.createElement('figure');
                    t.setAttribute('role', 'figure'), (t.id = e), t.classList.add('dn-node');
                    const a = s.data.nodes[e];
                    a.cssClass && t.classList.add(a.cssClass),
                        (t.style.width = parseFloat(a.width || '0') + 'px'),
                        (t.style.height = parseFloat(a.height || '0') + 'px'),
                        (t.style.left = parseFloat(a.x || '0') + 'px'),
                        (t.style.top = parseFloat(a.y || '0') + 'px'),
                        t.setAttribute('tabindex', '-1'),
                        t.addEventListener('keydown', p),
                        t.addEventListener('focus', h);
                    const n = document.createElement('div');
                    n.setAttribute('role', 'img'),
                        n.classList.add('dn-node-text'),
                        s.showText && (n.innerText = a.description),
                        n.setAttribute('aria-label', a.description),
                        t.appendChild(n),
                        d.appendChild(t);
                })(e),
                    (e => {
                        const t = document.getElementById(e);
                        t && ((l = n), (n = e), console.log('focusing', e, t), t.focus());
                    })(e),
                    y(t);
            };
        return (
            (a.getCurrentFocus = () => n),
            (a.getPreviousFocus = () => l),
            (a.setNavigationKeyBindings = s => {
                console.log('setting key bindings', s),
                    s
                        ? ((r = {}),
                          (c = s),
                          Object.keys(s).forEach(e => {
                              const t = s[e];
                              r[t.key] = e;
                          }))
                        : ((r = e), (c = t));
            }),
            (a.build = () => {
                if ((console.log('building', s), s.data)) {
                    if (((o = s.entryPoint ? s.entryPoint : Object.keys(s.data.nodes)[0]), s.id)) {
                        console.log('building navigator!', s),
                            (d = document.createElement('div')),
                            (d.id = 'dn-root-' + s.id),
                            d.classList.add('dn-root'),
                            (d.style.width = s.width || '100%'),
                            (d.style.height = s.height);
                        const e = document.createElement('button');
                        return (
                            (e.id = 'dn-entry-button-' + s.id),
                            e.classList.add('dn-entry-button'),
                            (e.innerText = 'Enter navigation area'),
                            e.addEventListener('click', a.enter),
                            d.appendChild(e),
                            (i = document.createElement('p')),
                            (i.id = 'dn-exit-' + s.id),
                            i.classList.add('dn-exit-position'),
                            (i.innerText = 'End of data structure.'),
                            (i.style.position = 'absolute'),
                            (i.style.bottom = '-20px'),
                            (i.style.display = 'none'),
                            i.addEventListener('focus', () => {
                                console.log('deleting all things!'),
                                    (i.style.display = 'block'),
                                    (l = n),
                                    (n = null),
                                    y(n);
                            }),
                            i.addEventListener('blur', () => {
                                i.style.display = 'none';
                            }),
                            d.appendChild(i),
                            a.setNavigationKeyBindings(s.navigation),
                            d
                        );
                    }
                    console.error('No id found: options.id must be specified for dataNavigator.build');
                } else
                    console.error(
                        'No data found, cannot enter: options.data must contain a valid hash object of data for dn.build'
                    );
            }),
            (a.move = e => {
                if (n) {
                    const t = s.data.nodes[n];
                    if (t.edges) {
                        let a = null,
                            o = 0;
                        const i = c[e],
                            r = i.types || e,
                            d = (e, s) => {
                                const a = 'string' == typeof s.target ? s.target : s.target(t, n, l),
                                    o = 'string' == typeof s.source ? s.source : s.source(t, n, l),
                                    r = o === n ? 1 : a === n ? -1 : 0,
                                    c = 1 === r ? a : -1 === r ? o : null;
                                return c && e === s.type && r === i.direction ? c : null;
                            };
                        for (o = 0; o < t.edges.length; o++) {
                            const e = s.data.edges[t.edges[o]];
                            if (
                                (Array.isArray(r)
                                    ? r.forEach(t => {
                                          a || (a = d(t, e));
                                      })
                                    : (a = d(r, e)),
                                a)
                            )
                                break;
                        }
                        a && (console.log('we found a target?'), g(a, n));
                    }
                }
            }),
            (a.moveTo = e => {
                const t = document.getElementById(e);
                t ? ((l = n), (n = e), t.focus()) : g(e, n);
            }),
            (a.enter = () => {
                a.moveTo(o);
            }),
            (a.exit = () => {
                console.log('exit has been called'), i.focus();
            }),
            (a.hooks = {}),
            (a.hooks.navigation = () => {}),
            (a.hooks.focus = () => {}),
            (a.hooks.selection = () => {}),
            (a.hooks.keydown = () => {}),
            (a.hooks.pointerClick = () => {}),
            a
        );
    })({
        data: {
            nodes: {
                title: {
                    d: { title: 'Major Trophies for some English teams' },
                    x: 12,
                    y: 9,
                    width: 686,
                    height: 56,
                    id: 'title',
                    cssClass: 'dn-test-class',
                    edges: ['any-return', 'any-exit', 'title-legend'],
                    description: 'Major Trophies for some English teams'
                },
                legend: {
                    d: { legend: 'Contests Included: BPL, FA Cup, CL' },
                    x: 160,
                    y: 162,
                    width: 398,
                    height: 49,
                    id: 'legend',
                    cssClass: 'dn-test-class',
                    edges: ['any-return', 'any-exit', 'title-legend', 'legend-y_axis', 'legend-bpl'],
                    description: 'Legend. Contests Included: BPL, FA Cup, CL. Press Enter to explore these contests.'
                },
                y_axis: {
                    d: { 'Y Axis': 'Label: Count trophies. Values range from 0 to 30 on a numerical scale.' },
                    x: 21,
                    y: 311,
                    width: 39,
                    height: 194,
                    id: 'y_axis',
                    cssClass: 'dn-test-class',
                    edges: ['any-return', 'any-exit', 'legend-y_axis', 'y_axis-x_axis'],
                    description: 'Y Axis. Label: Count trophies. Values range from 0 to 30 on a numerical scale.'
                },
                x_axis: {
                    d: { 'X Axis': 'Teams included: Arsenal, Chelsea, Liverpool, Manchester United.' },
                    x: 191,
                    y: 736,
                    width: 969,
                    height: 44,
                    id: 'x_axis',
                    cssClass: 'dn-test-class',
                    edges: ['any-return', 'any-exit', 'y_axis-x_axis', 'x_axis-arsenal'],
                    description: 'Teams included: Arsenal, Chelsea, Liverpool, Manchester United.'
                },
                arsenal: {
                    d: { team: 'Arsenal', 'total trophies': 17 },
                    x: 194,
                    y: 370,
                    width: 122,
                    height: 357,
                    id: 'arsenal',
                    cssClass: 'dn-test-class',
                    edges: [
                        'any-return',
                        'any-exit',
                        'x_axis-arsenal',
                        'any-x_axis',
                        'arsenal-bpl1',
                        'arsenal-chelsea',
                        'manchester-arsenal',
                        'any-legend'
                    ],
                    description: s({ team: 'Arsenal', 'total trophies': 17, contains: '3 contests' }, {})
                },
                chelsea: {
                    d: { team: 'Chelsea', 'total trophies': 15 },
                    x: 458,
                    y: 414,
                    width: 122,
                    height: 312,
                    id: 'chelsea',
                    cssClass: 'dn-test-class',
                    edges: [
                        'any-return',
                        'any-exit',
                        'any-x_axis',
                        'arsenal-chelsea',
                        'chelsea-bpl2',
                        'chelsea-liverpool',
                        'any-legend'
                    ],
                    description: s({ team: 'Chelsea', 'total trophies': 15, contains: '3 contests' }, {})
                },
                liverpool: {
                    d: { team: 'Liverpool', 'total trophies': 15 },
                    x: 722,
                    y: 414,
                    width: 122,
                    height: 312,
                    id: 'liverpool',
                    cssClass: 'dn-test-class',
                    edges: [
                        'any-return',
                        'any-exit',
                        'any-x_axis',
                        'chelsea-liverpool',
                        'liverpool-bpl3',
                        'liverpool-manchester',
                        'any-legend'
                    ],
                    description: s({ team: 'Liverpool', 'total trophies': 15, contains: '3 contests' }, {})
                },
                manchester: {
                    d: { team: 'Manchester United', 'total trophies': 28 },
                    x: 986,
                    y: 138,
                    width: 122,
                    height: 589,
                    id: 'manchester',
                    cssClass: 'dn-test-class',
                    edges: [
                        'any-return',
                        'any-exit',
                        'any-x_axis',
                        'liverpool-manchester',
                        'manchester-bpl4',
                        'manchester-arsenal',
                        'any-legend'
                    ],
                    description: s({ team: 'Manchester', 'total trophies': 28, contains: '3 contests' }, {})
                },
                bpl: {
                    d: { contest: 'BPL', 'total trophies': 22 },
                    x: 194,
                    y: 138,
                    width: 918,
                    height: 378,
                    id: 'bpl',
                    cssClass: 'dn-test-class',
                    edges: ['any-return', 'any-exit', 'legend-bpl', 'any-legend', 'bpl-bpl1', 'bpl-fa', 'cl-bpl'],
                    description: s({ contest: 'BPL', 'total trophies': 22, contains: '4 teams' }, {})
                },
                fa: {
                    d: { contest: 'FA Cup', 'total trophies': 42 },
                    x: 194,
                    y: 414,
                    width: 918,
                    height: 311,
                    id: 'fa',
                    cssClass: 'dn-test-class',
                    edges: ['any-return', 'any-exit', 'any-legend', 'bpl-fa', 'fa-fa1', 'fa-cl'],
                    description: s({ contest: 'FA Cup', 'total trophies': 42, contains: '4 teams' }, {})
                },
                cl: {
                    d: { contest: 'CL', 'total trophies': 11 },
                    x: 194,
                    y: 609,
                    width: 918,
                    height: 116,
                    id: 'cl',
                    cssClass: 'dn-test-class',
                    edges: ['any-return', 'any-exit', 'any-legend', 'fa-cl', 'cl-cl1', 'cl-bpl'],
                    description: s({ contest: 'CL', 'total trophies': 11, contains: '4 teams' }, {})
                },
                bpl1: {
                    d: { contest: 'BPL', team: 'Arsenal', trophies: 3 },
                    x: 194,
                    y: 370,
                    width: 122,
                    height: 62,
                    id: 'bpl1',
                    cssClass: 'dn-test-class',
                    edges: [
                        'any-return',
                        'any-exit',
                        'any-legend',
                        'arsenal-bpl1',
                        'bpl-bpl1',
                        'bpl1-fa1',
                        'cl1-bpl1',
                        'bpl1-bpl2',
                        'bpl4-bpl1'
                    ],
                    description: s({ contest: 'BPL', team: 'Arsenal', trophies: 3 }, {})
                },
                fa1: {
                    d: { contest: 'FA Cup', team: 'Arsenal', trophies: 14 },
                    x: 194,
                    y: 436,
                    width: 122,
                    height: 291,
                    id: 'fa1',
                    cssClass: 'dn-test-class',
                    edges: [
                        'any-return',
                        'any-exit',
                        'any-legend',
                        'fa-fa1',
                        'bpl1-fa1',
                        'fa1-cl1',
                        'fa1-fa2',
                        'fa4-fa1'
                    ],
                    description: s({ contest: 'FA Cup', team: 'Arsenal', trophies: 14 }, {})
                },
                cl1: {
                    d: { contest: 'CL', team: 'Arsenal', trophies: 0 },
                    x: 194,
                    y: 727,
                    width: 122,
                    height: 0,
                    id: 'cl1',
                    cssClass: 'dn-test-class',
                    edges: [
                        'any-return',
                        'any-exit',
                        'any-legend',
                        'cl-cl1',
                        'fa1-cl1',
                        'cl1-bpl1',
                        'cl1-cl2',
                        'cl4-cl1'
                    ],
                    description: s({ contest: 'CL', team: 'Arsenal', trophies: 0 }, {})
                },
                bpl2: {
                    d: { contest: 'BPL', team: 'Chelsea', trophies: 5 },
                    x: 458,
                    y: 414,
                    width: 122,
                    height: 103,
                    id: 'bpl2',
                    cssClass: 'dn-test-class',
                    edges: [
                        'any-return',
                        'any-exit',
                        'any-legend',
                        'chelsea-bpl2',
                        'bpl2-fa2',
                        'cl2-bpl2',
                        'bpl1-bpl2',
                        'bpl2-bpl3'
                    ],
                    description: s({ contest: 'BPL', team: 'Chelsea', trophies: 5 }, {})
                },
                fa2: {
                    d: { contest: 'FA Cup', team: 'Chelsea', trophies: 8 },
                    x: 458,
                    y: 521,
                    width: 122,
                    height: 165,
                    id: 'fa2',
                    cssClass: 'dn-test-class',
                    edges: ['any-return', 'any-exit', 'any-legend', 'bpl2-fa2', 'fa2-cl2', 'fa1-fa2', 'fa2-fa3'],
                    description: s({ contest: 'FA Cup', team: 'Chelsea', trophies: 8 }, {})
                },
                cl2: {
                    d: { contest: 'CL', team: 'Chelsea', trophies: 2 },
                    x: 458,
                    y: 691,
                    width: 122,
                    height: 35,
                    id: 'cl2',
                    cssClass: 'dn-test-class',
                    edges: ['any-return', 'any-exit', 'any-legend', 'fa2-cl2', 'cl2-bpl2', 'cl1-cl2', 'cl2-cl3'],
                    description: s({ contest: 'CL', team: 'Chelsea', trophies: 2 }, {})
                },
                bpl3: {
                    d: { contest: 'BPL', team: 'Liverpool', trophies: 1 },
                    x: 722,
                    y: 414,
                    width: 122,
                    height: 18,
                    id: 'bpl3',
                    cssClass: 'dn-test-class',
                    edges: [
                        'any-return',
                        'any-exit',
                        'any-legend',
                        'liverpool-bpl3',
                        'bpl3-fa3',
                        'cl3-bpl3',
                        'bpl2-bpl3',
                        'bpl3-bpl4'
                    ],
                    description: s({ contest: 'BPL', team: 'Liverpool', trophies: 1 }, {})
                },
                fa3: {
                    d: { contest: 'FA Cup', team: 'Liverpool', trophies: 8 },
                    x: 722,
                    y: 437,
                    width: 122,
                    height: 165,
                    id: 'fa3',
                    cssClass: 'dn-test-class',
                    edges: ['any-return', 'any-exit', 'any-legend', 'bpl3-fa3', 'fa3-cl3', 'fa2-fa3', 'fa3-fa4'],
                    description: s({ contest: 'FA Cup', team: 'Liverpool', trophies: 8 }, {})
                },
                cl3: {
                    d: { contest: 'CL', team: 'Liverpool', trophies: 6 },
                    x: 722,
                    y: 607,
                    width: 122,
                    height: 119,
                    id: 'cl3',
                    cssClass: 'dn-test-class',
                    edges: ['any-return', 'any-exit', 'any-legend', 'fa3-cl3', 'cl3-bpl3', 'cl2-cl3', 'cl3-cl4'],
                    description: s({ contest: 'CL', team: 'Liverpool', trophies: 6 }, {})
                },
                bpl4: {
                    d: { contest: 'BPL', team: 'Manchester United', trophies: 13 },
                    x: 986,
                    y: 138,
                    width: 122,
                    height: 273,
                    id: 'bpl4',
                    cssClass: 'dn-test-class',
                    edges: [
                        'any-return',
                        'any-exit',
                        'any-legend',
                        'manchester-bpl4',
                        'bpl4-fa4',
                        'cl4-bpl4',
                        'bpl3-bpl4',
                        'bpl4-bpl1'
                    ],
                    description: s({ contest: 'BPL', team: 'Manchester United', trophies: 13 }, {})
                },
                fa4: {
                    d: { contest: 'FA Cup', team: 'Manchester United', trophies: 12 },
                    x: 986,
                    y: 414,
                    width: 122,
                    height: 250,
                    id: 'fa4',
                    cssClass: 'dn-test-class',
                    edges: ['any-return', 'any-exit', 'any-legend', 'bpl4-fa4', 'fa4-cl4', 'fa3-fa4', 'fa4-fa1'],
                    description: s({ contest: 'FA Cup', team: 'Manchester United', trophies: 12 }, {})
                },
                cl4: {
                    d: { contest: 'CL', team: 'Manchester United', trophies: 3 },
                    x: 986,
                    y: 667,
                    width: 122,
                    height: 58,
                    id: 'cl4',
                    cssClass: 'dn-test-class',
                    edges: ['any-return', 'any-exit', 'any-legend', 'fa4-cl4', 'cl4-bpl4', 'cl3-cl4', 'cl4-cl1'],
                    description: s({ contest: 'CL', team: 'Manchester United', trophies: 3 }, {})
                }
            },
            edges: {
                'any-legend': {
                    source: (e, t, s) => t,
                    target: (e, t, s) => {
                        const a = !!+t.substring(t.length - 1);
                        return (
                            console.log(
                                'hasParent ? current.substring(0,current.length-1) : "legend"',
                                a ? t.substring(0, t.length - 1) : 'legend'
                            ),
                            a ? t.substring(0, t.length - 1) : 'legend'
                        );
                    },
                    type: 'legend'
                },
                'any-return': { source: (e, t, s) => t, target: (e, t, s) => s, type: 'returnTo' },
                'any-x_axis': { source: (e, t, s) => t, target: 'x_axis', type: 'parent' },
                'any-exit': { source: (e, t, s) => t, target: () => (a.exit(), ''), type: 'exit' },
                'x_axis-exit': { source: 'x_axis', target: () => (a.exit(), ''), type: 'exit' },
                'x_axis-arsenal': { source: 'x_axis', target: 'arsenal', type: 'child' },
                'arsenal-bpl1': { source: 'arsenal', target: 'bpl1', type: 'child' },
                'arsenal-chelsea': { source: 'arsenal', target: 'chelsea', type: 'team' },
                'manchester-arsenal': { source: 'manchester', target: 'arsenal', type: 'team' },
                'title-legend': { source: 'title', target: 'legend', type: 'chart' },
                'legend-y_axis': { source: 'legend', target: 'y_axis', type: 'chart' },
                'legend-bpl': { source: 'legend', target: 'bpl', type: 'child' },
                'y_axis-x_axis': { source: 'y_axis', target: 'x_axis', type: 'chart' },
                'chelsea-bpl2': { source: 'chelsea', target: 'bpl2', type: 'child' },
                'chelsea-liverpool': { source: 'chelsea', target: 'liverpool', type: 'team' },
                'liverpool-bpl3': { source: 'liverpool', target: 'bpl3', type: 'child' },
                'liverpool-manchester': { source: 'liverpool', target: 'manchester', type: 'team' },
                'manchester-bpl4': { source: 'manchester', target: 'bpl4', type: 'child' },
                'bpl-bpl1': { source: 'bpl', target: 'bpl1', type: 'child' },
                'bpl-fa': { source: 'bpl', target: 'fa', type: 'contest' },
                'cl-bpl': { source: 'cl', target: 'bpl', type: 'contest' },
                'fa-fa1': { source: 'fa', target: 'fa1', type: 'child' },
                'fa-cl': { source: 'fa', target: 'cl', type: 'contest' },
                'cl-cl1': { source: 'cl', target: 'cl1', type: 'child' },
                'bpl1-fa1': { source: 'bpl1', target: 'fa1', type: 'contest' },
                'cl1-bpl1': { source: 'cl1', target: 'bpl1', type: 'contest' },
                'bpl1-bpl2': { source: 'bpl1', target: 'bpl2', type: 'team' },
                'bpl4-bpl1': { source: 'bpl4', target: 'bpl1', type: 'team' },
                'fa1-cl1': { source: 'fa1', target: 'cl1', type: 'contest' },
                'fa1-fa2': { source: 'fa1', target: 'fa2', type: 'team' },
                'fa4-fa1': { source: 'fa4', target: 'fa1', type: 'team' },
                'cl1-cl2': { source: 'cl1', target: 'cl2', type: 'team' },
                'cl4-cl1': { source: 'cl4', target: 'cl1', type: 'team' },
                'bpl2-fa2': { source: 'bpl2', target: 'fa2', type: 'contest' },
                'cl2-bpl2': { source: 'cl2', target: 'bpl2', type: 'contest' },
                'bpl2-bpl3': { source: 'bpl2', target: 'bpl3', type: 'team' },
                'fa2-cl2': { source: 'fa2', target: 'cl2', type: 'contest' },
                'fa2-fa3': { source: 'fa2', target: 'fa3', type: 'team' },
                'cl2-cl3': { source: 'cl2', target: 'cl3', type: 'team' },
                'bpl3-fa3': { source: 'bpl3', target: 'fa3', type: 'contest' },
                'cl3-bpl3': { source: 'cl3', target: 'bpl3', type: 'contest' },
                'bpl3-bpl4': { source: 'bpl3', target: 'bpl4', type: 'team' },
                'fa3-cl3': { source: 'fa3', target: 'cl3', type: 'contest' },
                'fa3-fa4': { source: 'fa3', target: 'fa4', type: 'team' },
                'cl3-cl4': { source: 'cl3', target: 'cl4', type: 'team' },
                'bpl4-fa4': { source: 'bpl4', target: 'fa4', type: 'contest' },
                'cl4-bpl4': { source: 'cl4', target: 'bpl4', type: 'contest' },
                'fa4-cl4': { source: 'fa4', target: 'cl4', type: 'contest' }
            }
        },
        id: 'data-navigator-schema',
        entryPoint: 'title',
        rendering: 'on-demand',
        manualEventHandling: !1,
        root: { cssClass: '', width: '100%', height: 0 },
        navigation: {
            right: { types: ['team'], key: 'ArrowRight', direction: 1 },
            left: { types: ['team'], key: 'ArrowLeft', direction: -1 },
            down: { types: ['contest', 'chart', 'x_axis-exit'], key: 'ArrowDown', direction: 1 },
            up: { types: ['contest', 'chart'], key: 'ArrowUp', direction: -1 },
            child: { types: ['child'], key: 'Enter', direction: 1 },
            parent: { types: ['child'], key: 'Backspace', direction: -1 },
            exit: { types: ['exit'], key: 'Escape', direction: 1 },
            'previous position': { types: ['returnTo'], key: 'Period', direction: 1 },
            legend: { types: ['legend'], key: 'KeyL', direction: 1 }
        },
        hooks: {
            navigation: e => {
                console.log('navigating', e);
            },
            focus: e => {
                console.log('focus', e);
            },
            selection: e => {
                console.log('selection', e);
            },
            keydown: e => {
                console.log('keydown', e);
            },
            pointerClick: e => {
                console.log('clicked', e);
            }
        }
    });
    document.getElementById('root').appendChild(a.build()), (window.dn = a);
    const n = new Hammer(document.body, {});
    n.get('pinch').set({ enable: !1 }),
        n.get('rotate').set({ enable: !1 }),
        n.get('pan').set({ enable: !1 }),
        n.get('swipe').set({ direction: Hammer.DIRECTION_ALL, velocity: 0.2 }),
        n.on('press', e => {}),
        n.on('pressup', e => {
            a.enter();
        }),
        n.on('swipe', e => {
            const t = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? 'X' : 'Y',
                s = (Math.abs(e['delta' + t]) + 1e-9) / (Math.abs(e['delta' + ('X' === t ? 'Y' : 'X')]) + 1e-9),
                n = e.deltaX < 0,
                l = e.deltaX > 0,
                o = e.deltaY < 0,
                i = e.deltaY > 0,
                r =
                    s > 0.99 && s <= 2
                        ? l && o
                            ? 'forward'
                            : l && i
                            ? 'child'
                            : n && i
                            ? 'backward'
                            : n && o
                            ? 'parent'
                            : null
                        : l && 'X' === t
                        ? 'right'
                        : i && 'Y' === t
                        ? 'down'
                        : n && 'X' === t
                        ? 'left'
                        : o && 'Y' === t
                        ? 'up'
                        : null;
            a.getCurrentFocus() && r && a.move(r);
        });
})();