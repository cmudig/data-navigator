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
    t = (e, t) => {
      const o = Object.keys(e);
      let i = '';
      return (
        o.forEach(o => {
          i += `${t.omitKeyNames ? '' : o + ': '}${e[o]}. `;
        }),
        (i += t.semanticLabel || 'Data point.'),
        i
      );
    },
    o = { category: 'abc', group: 'xyz', series: 'ijk', level: '012' };
  let i = {};
  const d = { omitKeyNames: !1 },
    n = document.querySelectorAll('rect'),
    s = e => {
      if (e) {
        const t = e.id.substring(4);
        return {
          x: t,
          d: {
            category: t.substring(0, 1),
            group: t.substring(1, 2),
            series: t.substring(2, 3),
            level: t.substring(3, 4),
            id: e.id
          }
        };
      }
    };
  n.forEach(e => {
    if (e.id.includes('ref-')) {
      const n = s(e),
        r = n.x,
        a = n.d,
        c = e => document.getElementById(`ref-${e}`),
        l = (e, t) => {
          const i = o[e].indexOf(a[e]);
          let d = '';
          if (i + t > -1 && i + t < 3) {
            const n = o[e].substring(i + t, i + t + 1);
            d = r.replace(a[e], n);
          }
          return c(d) ? d : '';
        },
        u = l('series', -1),
        g = l('series', 1),
        y = l('category', -1),
        h = l('category', 1),
        p = l('group', -1),
        b = l('group', 1),
        f = 'byj1' === r || 'byj2' === r ? l('level', -1) : '',
        m = 'byj1' === r || 'byj0' === r ? l('level', 1) : '',
        k = [];
      u && k.push({ direction: -1, dimension: 'series', id: u, d: { ...s(c(u)).d } }),
        g && k.push({ direction: 1, dimension: 'series', id: g, d: { ...s(c(g)).d } }),
        y && k.push({ direction: -1, dimension: 'category', id: y, d: { ...s(c(y)).d } }),
        h && k.push({ direction: 1, dimension: 'category', id: h, d: { ...s(c(h)).d } }),
        p && k.push({ direction: 1, dimension: 'group', id: p, d: { ...s(c(p)).d } }),
        b && k.push({ direction: -1, dimension: 'group', id: b, d: { ...s(c(b)).d } }),
        f && k.push({ direction: -1, dimension: 'level', id: f, d: { ...s(c(f)).d } }),
        m && k.push({ direction: 1, dimension: 'level', id: m, d: { ...s(c(m)).d } }),
        (i[r] = {
          d: a,
          x: +e.getAttribute('x') - 2,
          y: +e.getAttribute('y') - 2,
          width: +e.getAttribute('width'),
          height: +e.getAttribute('height'),
          ref: 'ref-' + r,
          id: r,
          cssClass: 'dn-test-class',
          edges: k,
          description: t(a, d)
        });
    }
  });
  const r = (t => {
    let o = {},
      i = null,
      d = null,
      n = e,
      s = null,
      r = {
        down: { axis: 'upDown', keyCode: '', direction: 1 },
        left: { axis: 'leftRight', keyCode: '', direction: -1 },
        right: { axis: 'leftRight', keyCode: '', direction: 1 },
        up: { axis: 'upDown', keyCode: '', direction: -1 },
        backward: { axis: 'backwardForward', keyCode: '', direction: -1 },
        child: { axis: 'parentChild', keyCode: '', direction: 1 },
        parent: { axis: 'parentChild', keyCode: '', direction: -1 },
        forward: { axis: 'backwardForward', keyCode: '', direction: 1 }
      };
    const a = e => {
        const t = n[e.code];
        t && (e.preventDefault(), o.move(t));
      },
      c = e => {
        console.log('focus', e);
      },
      l = (e, o) => {
        (e => {
          const o = document.createElement('figure');
          o.setAttribute('role', 'figure'),
            (o.id = e),
            o.classList.add('dn-node'),
            t.data[e].cssClass && o.classList.add(t.data[e].cssClass),
            (o.style.width = parseFloat(t.data[e].width || '0') + 'px'),
            (o.style.height = parseFloat(t.data[e].height || '0') + 'px'),
            (o.style.left = parseFloat(t.data[e].x || '0') + 'px'),
            (o.style.top = parseFloat(t.data[e].y || '0') + 'px'),
            o.setAttribute('tabindex', '-1'),
            o.addEventListener('keydown', a),
            o.addEventListener('focus', c);
          const i = document.createElement('div');
          i.setAttribute('role', 'img'),
            i.classList.add('dn-node-text'),
            t.showText && (i.innerText = t.data[e].description),
            i.setAttribute('aria-label', t.data[e].description),
            o.appendChild(i),
            s.appendChild(o);
        })(e),
          (e => {
            const t = document.getElementById(e);
            t && ((i = e), console.log('focusing', e, t), t.focus());
          })(e),
          (e => {
            const t = document.getElementById(e);
            t && (t.removeEventListener('keydown', a), t.removeEventListener('focus', c), t.remove());
          })(o);
      };
    return (
      (o.getCurrentFocus = () => i),
      (o.setNavigationKeyBindings = e => {
        Object.keys(n).forEach(e => {
          r[n[e]].keyCode = e;
        }),
          e &&
            Object.keys(e).forEach(t => {
              const o = e[t];
              o.rebindKeycodes &&
                Object.keys(o.rebindKeycodes).forEach(e => {
                  r[e].keyCode = o.rebindKeycodes[e];
                });
            }),
          (n = {}),
          Object.keys(r).forEach(e => {
            n[r[e].keyCode] = e;
          });
      }),
      (o.build = () => {
        if (t.data) {
          if (((d = t.firstNode ? t.firstNode : Object.keys(t.data)[0]), t.id)) {
            console.log('building navigator!', t),
              (s = document.createElement('div')),
              (s.id = 'dn-root-' + t.id),
              s.classList.add('dn-root'),
              (s.style.width = t.width || '100%'),
              (s.style.height = t.height);
            const e = document.createElement('button');
            return (
              (e.id = 'dn-entry-button-' + t.id),
              e.classList.add('dn-entry-button'),
              (e.innerText = 'Enter navigation area'),
              e.addEventListener('click', o.enter),
              s.appendChild(e),
              o.setNavigationKeyBindings(t.navigation),
              s
            );
          }
          console.error('No id found: options.id must be specified for dataNavigator.build');
        } else
          console.error(
            'No data found, cannot enter: options.data must contain a valid hash object of data for dn.build'
          );
      }),
      (o.move = e => {
        if (i) {
          const o = t.data[i];
          if (o.edges) {
            let d = null,
              n = 0;
            const s = r[e],
              a = s.axis,
              c = t.navigation[a];
            if (c) {
              const e = c.key;
              for (n = 0; n < o.edges.length; n++) {
                const t = o.edges[n];
                if (e === t.dimension && t.direction === s.direction) {
                  d = t.id;
                  break;
                }
              }
              d && l(d, i);
            }
          }
        }
      }),
      (o.moveTo = e => {
        const t = document.getElementById(e);
        t ? ((i = e), t.focus()) : l(e, i);
      }),
      (o.enter = () => {
        o.moveTo(d);
      }),
      (o.hooks = {}),
      (o.hooks.navigation = () => {}),
      (o.hooks.focus = () => {}),
      (o.hooks.selection = () => {}),
      (o.hooks.keydown = () => {}),
      (o.hooks.pointerClick = () => {}),
      o
    );
  })({
    data: i,
    id: 'data-navigator-schema',
    firstNode: 'byj1',
    rendering: 'on-demand',
    manualEventHandling: !1,
    root: { cssClass: '', width: '100%', height: 0 },
    navigation: {
      leftRight: { key: 'series', rebindKeycodes: { left: 'KeyA', right: 'KeyD' } },
      upDown: { key: 'category', rebindKeycodes: { up: 'KeyW', down: 'KeyS' } },
      backwardForward: { key: 'group', rebindKeycodes: { forward: 'KeyE', backward: 'KeyQ' } },
      parentChild: { key: 'level' }
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
  document.getElementById('root').appendChild(r.build()), (window.dn = r);
  const a = new Hammer(document.body, {});
  a.get('pinch').set({ enable: !1 }),
    a.get('rotate').set({ enable: !1 }),
    a.get('pan').set({ enable: !1 }),
    a.get('swipe').set({ direction: Hammer.DIRECTION_ALL, velocity: 0.2 }),
    a.on('press', e => {}),
    a.on('pressup', e => {
      r.enter();
    }),
    a.on('swipe', e => {
      const t = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? 'X' : 'Y',
        o = (Math.abs(e['delta' + t]) + 1e-9) / (Math.abs(e['delta' + ('X' === t ? 'Y' : 'X')]) + 1e-9),
        i = e.deltaX < 0,
        d = e.deltaX > 0,
        n = e.deltaY < 0,
        s = e.deltaY > 0,
        a =
          o > 0.99 && o <= 2
            ? d && n
              ? 'forward'
              : d && s
              ? 'child'
              : i && s
              ? 'backward'
              : i && n
              ? 'parent'
              : null
            : d && 'X' === t
            ? 'right'
            : s && 'Y' === t
            ? 'down'
            : i && 'X' === t
            ? 'left'
            : n && 'Y' === t
            ? 'up'
            : null;
      r.getCurrentFocus() && a && r.move(a);
    });
})();
