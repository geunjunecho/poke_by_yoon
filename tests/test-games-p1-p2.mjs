/**
 * P1(달려라! 포켓몬 점프런) & P2(가랏! 속성 열매 받아먹기) 단위 테스트
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function createMockClassList() {
  const set = new Set();
  return {
    add(...tokens) {
      tokens.forEach((t) => set.add(t));
    },
    remove(...tokens) {
      tokens.forEach((t) => set.delete(t));
    },
    contains(token) {
      return set.has(token);
    },
    toggle(token, force) {
      if (force === undefined) {
        if (set.has(token)) {
          set.delete(token);
          return false;
        }
        set.add(token);
        return true;
      }
      if (force) set.add(token);
      else set.delete(token);
      return Boolean(force);
    }
  };
}

function createMockCanvasContext() {
  return {
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    closePath() {},
    arc() {},
    rect() {},
    roundRect() {},
    fill() {},
    stroke() {},
    fillText() {},
    save() {},
    restore() {},
    translate() {},
    scale() {},
    rotate() {},
    createLinearGradient() {
      return { addColorStop() {} };
    }
  };
}

function createMockElement(tagName = 'div') {
  const listeners = new Map();
  const attrs = new Map();
  const children = [];
  let innerHTMLValue = '';

  const el = {
    tagName: String(tagName).toUpperCase(),
    id: '',
    className: '',
    textContent: '',
    src: '',
    alt: '',
    type: '',
    width: 560,
    height: 260,
    style: {},
    classList: createMockClassList(),
    children,
    get innerHTML() {
      return innerHTMLValue;
    },
    set innerHTML(val) {
      innerHTMLValue = String(val);
      if (innerHTMLValue === '') {
        children.length = 0;
      }
    },
    appendChild(child) {
      children.push(child);
      return child;
    },
    removeChild(child) {
      const idx = children.indexOf(child);
      if (idx >= 0) children.splice(idx, 1);
      return child;
    },
    setAttribute(name, value) {
      attrs.set(name, String(value));
    },
    getAttribute(name) {
      return attrs.get(name) ?? null;
    },
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(handler);
    },
    removeEventListener(type, handler) {
      if (listeners.has(type)) listeners.get(type).delete(handler);
    },
    getListenerCount(type) {
      return listeners.has(type) ? listeners.get(type).size : 0;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: el.width || 520, height: el.height || 260 };
    },
    querySelector(selector) {
      const match = (node) => {
        if (!node) return null;
        if (selector.startsWith('.')) {
          const cls = selector.slice(1);
          const classes = String(node.className || '').split(/\s+/);
          if (classes.includes(cls) || node.classList?.contains(cls)) return node;
        } else if (selector.startsWith('#')) {
          if (node.id === selector.slice(1)) return node;
        } else if (node.tagName === selector.toUpperCase()) {
          return node;
        }
        for (const ch of node.children || []) {
          const found = match(ch);
          if (found) return found;
        }
        return null;
      };
      return match(el);
    }
  };

  if (el.tagName === 'CANVAS') {
    const ctx2d = createMockCanvasContext();
    el.getContext = () => ctx2d;
  }

  return el;
}

function setupMockDomEnvironment() {
  const registeredGames = new Map();
  const winListeners = new Map();
  const headEl = createMockElement('head');
  const bodyEl = createMockElement('body');

  const doc = {
    head: headEl,
    body: bodyEl,
    createElement(tag) {
      return createMockElement(tag);
    },
    getElementById(id) {
      for (const ch of headEl.children) {
        if (ch.id === id) return ch;
      }
      for (const ch of bodyEl.children) {
        if (ch.id === id) return ch;
      }
      return null;
    }
  };

  let nextRafId = 1;
  const activeRafs = new Set();

  globalThis.document = doc;
  globalThis.window = globalThis;
  globalThis.addEventListener = (type, fn) => {
    if (!winListeners.has(type)) winListeners.set(type, new Set());
    winListeners.get(type).add(fn);
  };
  globalThis.removeEventListener = (type, fn) => {
    if (winListeners.has(type)) winListeners.get(type).delete(fn);
  };
  globalThis.requestAnimationFrame = () => {
    const id = nextRafId++;
    activeRafs.add(id);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    activeRafs.delete(id);
  };

  globalThis.PokeMiniGames = {
    registeredGames,
    register(id, gameDef) {
      registeredGames.set(id, gameDef);
    }
  };

  return {
    registeredGames,
    winListeners,
    activeRafs
  };
}

const env = setupMockDomEnvironment();

const runnerScriptPath = path.join(ROOT_DIR, 'js', 'games', 'poke-runner.js');
const berryScriptPath = path.join(ROOT_DIR, 'js', 'games', 'poke-berry.js');

vm.runInThisContext(fs.readFileSync(runnerScriptPath, 'utf8'), { filename: runnerScriptPath });
vm.runInThisContext(fs.readFileSync(berryScriptPath, 'utf8'), { filename: berryScriptPath });

test('1. poke-runner 및 poke-berry 게임이 PokeMiniGames.register에 정상 등록된다', () => {
  assert.ok(env.registeredGames.has('runner'), 'runner 게임이 등록되어야 합니다');
  assert.ok(env.registeredGames.has('berry'), 'berry 게임이 등록되어야 합니다');

  const runnerDef = env.registeredGames.get('runner');
  const berryDef = env.registeredGames.get('berry');

  assert.equal(runnerDef, globalThis.PokeGameRunner);
  assert.equal(berryDef, globalThis.PokeGameBerry);

  assert.equal(runnerDef.id, 'runner');
  assert.equal(runnerDef.title, '달려라! 포켓몬 점프런');
  assert.equal(runnerDef.icon, '🏃‍♂️');
  assert.equal(runnerDef.badgeColor, '#FF5252');
  assert.equal(typeof runnerDef.mount, 'function');

  assert.equal(berryDef.id, 'berry');
  assert.equal(berryDef.title, '가랏! 속성 열매 받아먹기');
  assert.equal(berryDef.icon, '🍎');
  assert.equal(berryDef.badgeColor, '#4CAF50');
  assert.equal(typeof berryDef.mount, 'function');
});

test('2. runner 게임 마운트 후 jump(), duck(true), stepFrame() 및 cleanup()이 정상 동작한다', () => {
  const stageEl = createMockElement('div');
  const sfxCalls = [];
  let transformCalls = 0;

  const charCtx = {
    id: 25,
    nameKr: '피카츄',
    nameEn: 'pikachu',
    runnerSpriteUrl: 'https://example.com/pikachu-showdown.gif',
    isAnimatedGif: true,
    primaryType: 'electric',
    typeNameKr: '전기',
    typeColor: '#FFD54F',
    typeEmoji: '⚡'
  };

  const helpers = {
    playSfx(type, noteIdx) {
      sfxCalls.push({ type, noteIdx });
    },
    playCry() {},
    computeRunTransform(state, tick) {
      transformCalls += 1;
      return {
        transform: `translateY(${state.yOffset}px) scaleX(${state.flipX ? -1 : 1})`,
        filter: state.isHit ? 'brightness(1.5)' : 'none'
      };
    },
    getHighScore() {
      return 120;
    },
    saveHighScore() {},
    rewardCharacter() {},
    showResultOverlay() {}
  };

  const cleanup = globalThis.PokeGameRunner.mount(stageEl, charCtx, helpers);
  assert.equal(typeof cleanup, 'function', 'mount는 cleanup 함수를 반환해야 합니다');
  assert.ok(stageEl._runnerGame, 'stageEl._runnerGame 테스트 훅이 노출되어야 합니다');

  // 초기 상태 확인 (하트 3개)
  const initState = stageEl._runnerGame.getState();
  assert.equal(initState.lives, 3);
  assert.equal(initState.isJumping, false);
  assert.equal(initState.isDucking, false);

  // 주인공 DOM 요소(.poke-runner-hero) 렌더링 확인
  const heroEl = stageEl.querySelector('.poke-runner-hero');
  assert.ok(heroEl, '.poke-runner-hero DOM 요소가 존재해야 합니다');

  // jump() 호출 시 isJumping === true 및 y < 0 확인
  stageEl._runnerGame.jump();
  const afterJump = stageEl._runnerGame.getState();
  assert.equal(afterJump.isJumping, true, 'jump() 호출 후 isJumping === true 여야 합니다');
  assert.ok(afterJump.y < 0, `jump() 호출 후 y < 0 이어야 합니다 (현재 y=${afterJump.y})`);

  // 한 프레임 진행 후에도 점프 상태 및 computeRunTransform 호출 확인
  stageEl._runnerGame.stepFrame();
  assert.ok(transformCalls > 0, 'computeRunTransform이 호출되어야 합니다');

  // duck(true) 호출 시 isDucking === true 확인
  stageEl._runnerGame.duck(true);
  const afterDuck = stageEl._runnerGame.getState();
  assert.equal(afterDuck.isDucking, true, 'duck(true) 호출 후 isDucking === true 여야 합니다');

  // cleanup() 호출 후 리소스 해제 확인
  const keydownCountBefore = env.winListeners.get('keydown')?.size || 0;
  assert.ok(keydownCountBefore >= 1, '마운트 중에는 keydown 리스너가 등록되어 있어야 합니다');

  cleanup();
  const keydownCountAfter = env.winListeners.get('keydown')?.size || 0;
  assert.equal(keydownCountAfter, keydownCountBefore - 1, 'cleanup() 후 keydown 리스너가 해제되어야 합니다');
  assert.equal(stageEl._runnerGame, null, 'cleanup() 후 _runnerGame 참조가 정리되어야 합니다');
});

test('3. berry 게임 마운트 후 열매 수집 시 점수 증가 및 진화 게이지 10 도달 시 다음 진화 단계(evolutionChain[1])로 변신 후 cleanup()이 동작한다', () => {
  const stageEl = createMockElement('div');
  let cryCalls = 0;
  let rewardCalls = 0;

  const evolutionChain = [
    {
      id: 1,
      name: 'bulbasaur',
      nameKr: '이상해씨',
      spriteUrl: 'https://example.com/bulbasaur.png'
    },
    {
      id: 2,
      name: 'ivysaur',
      nameKr: '이상해풀',
      spriteUrl: 'https://example.com/ivysaur.png'
    },
    {
      id: 3,
      name: 'venusaur',
      nameKr: '이상해꽃',
      spriteUrl: 'https://example.com/venusaur.png'
    }
  ];

  const charCtx = {
    id: 1,
    nameKr: '이상해씨',
    nameEn: 'bulbasaur',
    spriteUrl: 'https://example.com/bulbasaur.png',
    runnerSpriteUrl: 'https://example.com/bulbasaur.gif',
    primaryType: 'grass',
    typeNameKr: '풀',
    typeColor: '#66BB6A',
    typeEmoji: '🌿',
    evolutionChain
  };

  const helpers = {
    playSfx() {},
    playCry() {
      cryCalls += 1;
    },
    getHighScore() {
      return 50;
    },
    saveHighScore() {},
    rewardCharacter() {
      rewardCalls += 1;
    },
    showResultOverlay() {}
  };

  const cleanup = globalThis.PokeGameBerry.mount(stageEl, charCtx, helpers);
  assert.equal(typeof cleanup, 'function');
  assert.ok(stageEl._berryGame, 'stageEl._berryGame 테스트 훅이 노출되어야 합니다');

  // 좌우 이동 확인
  const initialX = stageEl._berryGame.getState().playerX;
  stageEl._berryGame.moveLeft();
  assert.ok(stageEl._berryGame.getState().playerX < initialX, 'moveLeft() 호출 시 왼쪽으로 이동해야 합니다');
  stageEl._berryGame.moveRight();
  stageEl._berryGame.moveRight();
  assert.ok(stageEl._berryGame.getState().playerX > initialX, 'moveRight() 호출 시 오른쪽으로 이동해야 합니다');

  // 일반 열매(+10점, 게이지 +1) 수집 확인
  stageEl._berryGame.collectItem('berry');
  let state = stageEl._berryGame.getState();
  assert.equal(state.score, 10, '일반 열매 수집 시 +10점 증가해야 합니다');
  assert.equal(state.evoGauge, 1, '일반 열매 수집 시 진화 게이지가 1 증가해야 합니다');
  assert.equal(state.nameKr, '이상해씨');

  // 내 속성 스페셜 구슬(+30점, 게이지 +2, 울음소리 재생) 3회 수집 -> 총 게이지 1 + 6 = 7
  stageEl._berryGame.collectItem('special');
  stageEl._berryGame.collectItem('special');
  stageEl._berryGame.collectItem('special');
  state = stageEl._berryGame.getState();
  assert.equal(state.score, 100, '스페셜 구슬 3개 추가 수집 후 점수는 100점이어야 합니다');
  assert.equal(state.evoGauge, 7, '진화 게이지는 7이어야 합니다');
  assert.ok(cryCalls >= 3, '스페셜 구슬 수집 시 포켓몬 울음소리가 재생되어야 합니다');

  // 무지개 사탕(+50점, 게이지 +3) 수집 -> 게이지 10 도달 -> evolutionChain[1]('이상해풀')로 즉시 진화!
  stageEl._berryGame.collectItem('candy');
  state = stageEl._berryGame.getState();
  assert.equal(state.score, 150, '무지개 사탕 수집 후 점수는 150점이어야 합니다');
  assert.equal(state.evoGauge, 0, '게이지 10 도달 후 진화하여 게이지가 0으로 초기화되어야 합니다');
  assert.equal(state.stageIndex, 1, '진화 단계 인덱스가 1(evolutionChain[1])이어야 합니다');
  assert.equal(state.currentStage.nameKr, '이상해풀', '다음 진화 단계인 이상해풀로 변신해야 합니다');
  assert.equal(state.nameKr, '이상해풀');
  assert.equal(state.pokemonId, 2);
  assert.ok(
    state.evolutionBannerText.includes('이상해씨') && state.evolutionBannerText.includes('이상해풀'),
    '진화 축하 배너 문구가 올바르게 생성되어야 합니다'
  );
  assert.ok(rewardCalls >= 1, '진화 달성 시 helpers.rewardCharacter()가 호출되어야 합니다');

  // cleanup() 동작 확인
  cleanup();
  assert.equal(stageEl._berryGame, null, 'cleanup() 호출 후 _berryGame 훅이 해제되어야 합니다');
});
