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
  };
  console.log('yo');
  const t = (t => {
    let o = {},
      n = null,
      d = null,
      a = e,
      i = null,
      s = {
        down: { axis: 'upDown', keyCode: '', direction: 1 },
        left: { axis: 'leftRight', keyCode: '', direction: -1 },
        right: { axis: 'leftRight', keyCode: '', direction: 1 },
        up: { axis: 'upDown', keyCode: '', direction: -1 },
        backward: { axis: 'backwardForward', keyCode: '', direction: -1 },
        child: { axis: 'parentChild', keyCode: '', direction: 1 },
        parent: { axis: 'parentChild', keyCode: '', direction: -1 },
        forward: { axis: 'backwardForward', keyCode: '', direction: 1 }
      };
    const r = e => {
        const t = a[e.code];
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
            o.addEventListener('keydown', r),
            o.addEventListener('focus', c);
          const n = document.createElement('div');
          n.setAttribute('role', 'img'),
            n.classList.add('dn-node-text'),
            t.showText && (n.innerText = t.data[e].description),
            n.setAttribute('aria-label', t.data[e].description),
            o.appendChild(n),
            i.appendChild(o);
        })(e),
          (e => {
            const t = document.getElementById(e);
            t && ((n = e), console.log('focusing', e, t), t.focus());
          })(e),
          (e => {
            const t = document.getElementById(e);
            t && (t.removeEventListener('keydown', r), t.removeEventListener('focus', c), t.remove());
          })(o);
      };
    return (
      (o.getCurrentFocus = () => n),
      (o.setNavigationKeyBindings = e => {
        Object.keys(a).forEach(e => {
          s[a[e]].keyCode = e;
        }),
          e &&
            Object.keys(e).forEach(t => {
              const o = e[t];
              o.rebindKeycodes &&
                Object.keys(o.rebindKeycodes).forEach(e => {
                  s[e].keyCode = o.rebindKeycodes[e];
                });
            }),
          (a = {}),
          Object.keys(s).forEach(e => {
            a[s[e].keyCode] = e;
          });
      }),
      (o.build = () => {
        if (t.data) {
          if (((d = t.firstNode ? t.firstNode : Object.keys(t.data)[0]), t.id)) {
            console.log('building navigator!', t),
              (i = document.createElement('div')),
              (i.id = 'dn-root-' + t.id),
              i.classList.add('dn-root'),
              (i.style.width = t.width || '100%'),
              (i.style.height = t.height);
            const e = document.createElement('button');
            return (
              (e.id = 'dn-entry-button-' + t.id),
              e.classList.add('dn-entry-button'),
              (e.innerText = 'Enter navigation area'),
              e.addEventListener('click', o.enter),
              i.appendChild(e),
              o.setNavigationKeyBindings(t.navigation),
              i
            );
          }
          console.error('No id found: options.id must be specified for dataNavigator.build');
        } else
          console.error(
            'No data found, cannot enter: options.data must contain a valid hash object of data for dn.build'
          );
      }),
      (o.move = e => {
        if (n) {
          const o = t.data[n];
          if (o.edges) {
            let d = null,
              a = 0;
            const i = s[e],
              r = i.axis,
              c = t.navigation[r];
            if (c) {
              const e = c.key;
              for (a = 0; a < o.edges.length; a++) {
                const t = o.edges[a];
                if (e === t.dimension && t.direction === i.direction) {
                  d = t.id;
                  break;
                }
              }
              d && l(d, n);
            }
          }
        }
      }),
      (o.moveTo = e => {
        const t = document.getElementById(e);
        t ? ((n = e), t.focus()) : l(e, n);
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
    data: {},
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
  document.getElementById('root').appendChild(t.build()), (window.dn = t);
  const o = new Hammer(document.body, {});
  o.get('pinch').set({ enable: !1 }),
    o.get('rotate').set({ enable: !1 }),
    o.get('pan').set({ enable: !1 }),
    o.get('swipe').set({ direction: Hammer.DIRECTION_ALL, velocity: 0.2 }),
    o.on('press', e => {}),
    o.on('pressup', e => {
      t.enter();
    }),
    o.on('swipe', e => {
      const o = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? 'X' : 'Y',
        n = (Math.abs(e['delta' + o]) + 1e-9) / (Math.abs(e['delta' + ('X' === o ? 'Y' : 'X')]) + 1e-9),
        d = e.deltaX < 0,
        a = e.deltaX > 0,
        i = e.deltaY < 0,
        s = e.deltaY > 0,
        r =
          n > 0.99 && n <= 2
            ? a && i
              ? 'forward'
              : a && s
              ? 'child'
              : d && s
              ? 'backward'
              : d && i
              ? 'parent'
              : null
            : a && 'X' === o
            ? 'right'
            : s && 'Y' === o
            ? 'down'
            : d && 'X' === o
            ? 'left'
            : i && 'Y' === o
            ? 'up'
            : null;
      t.getCurrentFocus() && r && t.move(r);
    });
})();
