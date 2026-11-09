import assert from 'node:assert/strict';

// Minimal browser DOM & Canvas mock for full end-to-end integration test
function createEl(tag = 'div') {
  const children = [];
  const attrs = new Map();
  const listeners = new Map();
  const classSet = new Set();

  const el = {
    tagName: String(tag).toUpperCase(),
    id: '',
    type: '',
    src: '',
    alt: '',
    title: '',
    value: '',
    textContent: '',
    _innerHTML: '',
    style: {
      setProperty(k, v) { this[k] = v; }
    },
    dataset: {},
    children,
    parentNode: null,
    classList: {
      add(...cls) { cls.forEach(c => c && classSet.add(c)); },
      remove(...cls) { cls.forEach(c => classSet.delete(c)); },
      toggle(c, force) {
        if (force === undefined) {
          if (classSet.has(c)) { classSet.delete(c); return false; }
          classSet.add(c); return true;
        }
        if (force) classSet.add(c); else classSet.delete(c);
        return Boolean(force);
      },
      contains(c) { return classSet.has(c); }
    },
    set className(v) {
      classSet.clear();
      String(v || '').split(/\s+/).filter(Boolean).forEach(c => classSet.add(c));
    },
    get className() {
      return [...classSet].join(' ');
    },
    set innerHTML(html) {
      this._innerHTML = String(html || '');
      children.length = 0;
      if (this._innerHTML.includes('id="mg-stage-container"')) {
        const stage = createEl('div');
        stage.id = 'mg-stage-container';
        stage.className = 'mg-stage-container';
        this.appendChild(stage);
      }
    },
    get innerHTML() {
      return this._innerHTML;
    },
    appendChild(child) {
      if (!child) return child;
      child.parentNode = this;
      children.push(child);
      return child;
    },
    removeChild(child) {
      const idx = children.indexOf(child);
      if (idx !== -1) children.splice(idx, 1);
      if (child) child.parentNode = null;
      return child;
    },
    remove() {
      if (this.parentNode && typeof this.parentNode.removeChild === 'function') {
        this.parentNode.removeChild(this);
      }
    },
    setAttribute(k, v) {
      attrs.set(k, String(v));
      if (k === 'id') this.id = String(v);
      if (k === 'class') this.className = String(v);
    },
    getAttribute(k) {
      if (k === 'id') return this.id || attrs.get('id') || null;
      return attrs.has(k) ? attrs.get(k) : null;
    },
    addEventListener(ev, fn) {
      if (!listeners.has(ev)) listeners.set(ev, []);
      listeners.get(ev).push(fn);
    },
    removeEventListener(ev, fn) {
      if (!listeners.has(ev)) return;
      const arr = listeners.get(ev);
      const idx = arr.indexOf(fn);
      if (idx !== -1) arr.splice(idx, 1);
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 720, height: 420 };
    },
    getContext() {
      return {
        clearRect() {}, fillRect() {}, strokeRect() {}, beginPath() {},
        arc() {}, fill() {}, stroke() {}, moveTo() {}, lineTo() {},
        closePath() {}, save() {}, restore() {}, translate() {}, scale() {},
        rotate() {}, fillText() {}, strokeText() {}, drawImage() {},
         ellipse() {}, quadraticCurveTo() {},
        createLinearGradient() { return { addColorStop() {} }; },
        createRadialGradient() { return { addColorStop() {} }; }
      };
    },
    querySelector(sel) {
      const all = this.querySelectorAll(sel);
      return all.length > 0 ? all[0] : null;
    },
    querySelectorAll(sel) {
      const results = [];
      const visit = (node) => {
        for (const ch of (node.children || [])) {
          let match = false;
          if (sel.startsWith('#') && ch.id === sel.slice(1)) match = true;
          else if (sel.startsWith('.') && ch.classList && ch.classList.contains(sel.slice(1))) match = true;
          else if (sel.startsWith('[data-role="')) {
            const role = sel.slice(12, -2);
            if (ch.getAttribute('data-role') === role) match = true;
          } else if (ch.tagName && ch.tagName.toLowerCase() === sel.toLowerCase()) match = true;
          if (match) results.push(ch);
          visit(ch);
        }
      };
      visit(this);
      return results;
    }
  };
  return el;
}

const body = createEl('body');
globalThis.window = globalThis;
globalThis.document = {
  body,
  createElement: (tag) => createEl(tag),
  getElementById: (id) => body.querySelector('#' + id),
  querySelector: (sel) => body.querySelector(sel),
  querySelectorAll: (sel) => body.querySelectorAll(sel),
  addEventListener() {},
  removeEventListener() {}
};
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

await import('../js/minigames-core.js');
await import('../js/games/poke-runner.js');
await import('../js/games/poke-berry.js');
await import('../js/games/poke-catch.js');
await import('../js/games/poke-seesaw.js');
await import('../js/games/poke-memory.js');
await import('../js/games/poke-flipbattle.js');

const mg = globalThis.PokeMiniGames;
assert.ok(mg, 'PokeMiniGames should be defined');
assert.equal(mg.games.size, 6, 'All 6 Pokédex games should be registered');

mg.openHub();
assert.equal(mg.isOpen, true, 'Hub should be open');

for (const id of ['runner', 'berry', 'catch', 'seesaw', 'memory', 'flipbattle']) {
  mg.launchGame(id);
  assert.equal(mg.activeGameId, id, `Active game should be ${id}`);
}

mg.closeHub();
assert.equal(mg.isOpen, false, 'Hub should be closed');
console.log('✅ Pokédex 6-game full E2E integration test passed!');
