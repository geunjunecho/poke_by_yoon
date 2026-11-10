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
    dispatchEvent(type, ev = {}) {
      if (!listeners.has(type)) return;
      for (const fn of listeners.get(type)) {
        fn(ev);
      }
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

  // duck(true) 호출 시 isDucking === true 확인 및 duck(false) 즉시 해제 확인
  stageEl._runnerGame.duck(true);
  const afterDuck = stageEl._runnerGame.getState();
  assert.equal(afterDuck.isDucking, true, 'duck(true) 호출 후 isDucking === true 여야 합니다');
  stageEl._runnerGame.duck(false);
  assert.equal(stageEl._runnerGame.getState().isDucking, false, 'duck(false) 호출 즉시 숙이기가 해제되어야 합니다');

  // 충돌 시 뒤로 팅팅 튕기는 넉백 바운스(knockbackTimer, knockbackX, knockbackBounceY) 동작 확인
  stageEl._runnerGame.triggerObstacleHit();
  stageEl._runnerGame.stepFrame();
  const hitState = stageEl._runnerGame.getState();
  assert.equal(hitState.lives, 2, '장애물 충돌 후 하트가 1 감소해야 합니다');
  assert.ok(hitState.knockbackTimer > 0, '충돌 직후 knockbackTimer가 활성화되어야 합니다');
  assert.ok(hitState.knockbackX < 0, `충돌 직후 뒤로 밀려나는 knockbackX < 0 이어야 합니다 (현재=${hitState.knockbackX})`);
  assert.ok(hitState.knockbackBounceY < 0, `충돌 직후 위로 튀어오르는 knockbackBounceY < 0 이어야 합니다 (현재=${hitState.knockbackBounceY})`);

  // 공중(air) 장애물 판정 검증: 숙이지 않고 점프로 뛰어넘으려 하면 반드시 충돌해야 하고, 납작 숙이기(duck(true))로만 통과 가능해야 함
  stageEl._runnerGame.reset();
  stageEl._runnerGame.spawnObstacle('air');
  const airObsJump = stageEl._runnerGame.getState().obstacles[0];
  assert.equal(airObsJump.category, 'air', '공중 장애물이 생성되어야 합니다');

  // 2단 점프로 높이 뛰어오른 상태(y <= -70)에서 공중 장애물과 겹치게 이동
  stageEl._runnerGame.jump();
  stageEl._runnerGame.stepFrame();
  stageEl._runnerGame.jump();
  for (let i = 0; i < 8; i++) {
    stageEl._runnerGame.stepFrame();
  }
  const highJumpState = stageEl._runnerGame.getState();
  assert.ok(highJumpState.y <= -70, `점프 높이가 충분히 높아야 합니다 (현재 y=${highJumpState.y})`);
  airObsJump.x = highJumpState.player.x;
  stageEl._runnerGame.stepFrame();
  assert.equal(
    stageEl._runnerGame.getState().lives,
    2,
    '공중(숙이기) 장애물은 점프로 뛰어넘을 수 없으며 점프 시 충돌하여 하트가 감소해야 합니다'
  );

  // 반대로 납작 숙이기(duck(true)) 상태에서는 공중 장애물을 안전하게 통과해야 함
  stageEl._runnerGame.reset();
  stageEl._runnerGame.spawnObstacle('air');
  const airObsDuck = stageEl._runnerGame.getState().obstacles[0];
  stageEl._runnerGame.duck(true);
  airObsDuck.x = stageEl._runnerGame.getState().player.x;
  stageEl._runnerGame.stepFrame();
  assert.equal(
    stageEl._runnerGame.getState().lives,
    3,
    '납작 숙이기(duck(true)) 상태에서는 공중 장애물을 충돌 없이 통과해야 합니다'
  );
  stageEl._runnerGame.duck(false);

  // 장애물 근처(145px 이내)에서는 일반 spawnItem()이 겹쳐서 생성되지 않아야 함
  stageEl._runnerGame.reset();
  stageEl._runnerGame.spawnObstacle('ground');
  stageEl._runnerGame.spawnItem();
  assert.equal(
    stageEl._runnerGame.getState().items.length,
    0,
    '방금 생성된 장애물 근처(145px 이내)에는 아이템이 겹쳐서 생성되지 않아야 합니다'
  );

  // cleanup() 호출 후 리소스 해제 확인
  const keydownCountBefore = env.winListeners.get('keydown')?.size || 0;
  assert.ok(keydownCountBefore >= 1, '마운트 중에는 keydown 리스너가 등록되어 있어야 합니다');

  cleanup();
  const keydownCountAfter = env.winListeners.get('keydown')?.size || 0;
  assert.equal(keydownCountAfter, keydownCountBefore - 1, 'cleanup() 후 keydown 리스너가 해제되어야 합니다');
  assert.equal(stageEl._runnerGame, null, 'cleanup() 후 _runnerGame 참조가 정리되어야 합니다');
});

test('3. berry 게임 마운트 후 열매 수집 시 점수 증가, 여유로운 진화 게이지(20칸) 도달 시 진화 및 단계별 균일한 캐릭터 크기 증가 후 cleanup()이 동작한다', () => {
  const stageEl = createMockElement('div');
  let cryCalls = 0;
  let rewardCalls = 0;

  const evolutionChain = [
    {
      id: 1,
      name: 'bulbasaur',
      nameKr: '이상해씨',
      spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png'
    },
    {
      id: 2,
      name: 'ivysaur',
      nameKr: '이상해풀',
      spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/2.png'
    },
    {
      id: 3,
      name: 'venusaur',
      nameKr: '이상해꽃',
      spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/3.png'
    }
  ];

  const charCtx = {
    id: 1,
    nameKr: '이상해씨',
    nameEn: 'bulbasaur',
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
    runnerSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/1.gif',
    primaryType: 'grass',
    typeNameKr: '풀',
    typeColor: '#66BB6A',
    typeEmoji: '🌿',
    evolutionChain
  };

  const helpers = {
    sfxCalls: [],
    playSfx(type, noteIdx) {
      this.sfxCalls.push({ type, noteIdx });
    },
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

  // 초기 하트 5개 세팅, 진화 목표 게이지(20) 및 기본 단계 크기/공식 일러스트 통일 확인
  const initBerryState = stageEl._berryGame.getState();
  assert.equal(initBerryState.lives, 5, '열매 받아먹기 기본 하트는 5개여야 합니다');
  assert.equal(initBerryState.maxLives, 5, '열매 받아먹기 최대 하트는 5개여야 합니다');
  assert.equal(initBerryState.evolutionTarget, 20, '진화 목표 게이지는 20이어야 합니다');
  assert.equal(initBerryState.heroScale, 0.88, '기본 단계(진화 전) 캐릭터 스케일은 0.88이어야 합니다');
  assert.ok(
    initBerryState.spriteUrl.includes('official-artwork/1.png'),
    '진화 단계 간 크기 편차를 없애기 위해 정규화된 공식 일러스트(official-artwork)를 사용해야 합니다'
  );
  const stage0SizePx = initBerryState.heroSizePx;

  // 좌우 이동 확인
  const initialX = stageEl._berryGame.getState().playerX;
  stageEl._berryGame.moveLeft();
  assert.ok(stageEl._berryGame.getState().playerX < initialX, 'moveLeft() 호출 시 왼쪽으로 이동해야 합니다');
  stageEl._berryGame.moveRight();
  stageEl._berryGame.moveRight();
  assert.ok(stageEl._berryGame.getState().playerX > initialX, 'moveRight() 호출 시 오른쪽으로 이동해야 합니다');

  // 일반 열매(+10점, 게이지 +1) 2회 수집 확인 -> 게이지 2
  stageEl._berryGame.collectItem('berry');
  stageEl._berryGame.collectItem('berry');
  let state = stageEl._berryGame.getState();
  assert.equal(state.score, 20, '일반 열매 2개 수집 시 +20점 증가해야 합니다');
  assert.equal(state.evoGauge, 2, '일반 열매 2개 수집 시 진화 게이지가 2 증가해야 합니다');
  assert.equal(state.nameKr, '이상해씨');

  // 내 속성 스페셜 열쇠(+30점, 게이지 +2) 4회 수집 -> 총 게이지 2 + 8 = 10 (열쇠 획득 시에는 울음소리 대신 효과음만 재생되어야 함!)
  const sfxCountBeforeSpecial = helpers.sfxCalls.length;
  for (let i = 0; i < 4; i++) {
    stageEl._berryGame.collectItem('special');
  }
  state = stageEl._berryGame.getState();
  assert.equal(state.evoGauge, 10, '게이지 10에서는 아직 진화하지 않고 게이지가 유지되어야 합니다');
  assert.equal(state.stageIndex, 0, '게이지 10에서는 아직 1단계(이상해씨)여야 합니다');
  assert.equal(cryCalls, 0, '열쇠(special) 획득 시에는 포켓몬 울음소리가 나지 않아야 합니다');
  assert.ok(helpers.sfxCalls.length >= sfxCountBeforeSpecial + 4, '열쇠 획득 시 다른 효과음이 재생되어야 합니다');

  // 무지개 사탕(+50점, 게이지 +2) 5회 추가 수집 -> 게이지 10 + 10 = 20 도달 -> evolutionChain[1]('이상해풀')로 진화하며 이때만 울음소리 재생!
  for (let i = 0; i < 5; i++) {
    stageEl._berryGame.collectItem('candy');
  }
  state = stageEl._berryGame.getState();
  assert.equal(state.evoGauge, 0, '게이지 20 도달 후 진화하여 게이지가 0으로 초기화되어야 합니다');
  assert.equal(state.stageIndex, 1, '진화 단계 인덱스가 1(evolutionChain[1])이어야 합니다');
  assert.equal(state.currentStage.nameKr, '이상해풀', '다음 진화 단계인 이상해풀로 변신해야 합니다');
  assert.equal(state.nameKr, '이상해풀');
  assert.equal(state.pokemonId, 2);
  assert.equal(cryCalls, 1, '진화할 때만 포켓몬 울음소리가 재생되어야 합니다');
  assert.ok(
    state.spriteUrl.includes('official-artwork/2.png'),
    '1차 진화 후에도 동일한 공식 일러스트 규격(official-artwork/2.png)을 사용해야 합니다'
  );
  assert.equal(state.heroScale, 1.0, '1차 진화 후 캐릭터 스케일은 1.0으로 커져야 합니다');
  assert.ok(
    state.heroSizePx > stage0SizePx,
    `1차 진화 후 캐릭터 크기(${state.heroSizePx}px)는 진화 전(${stage0SizePx}px)보다 일정하게 커져야 합니다`
  );
  assert.ok(
    state.evolutionBannerText.includes('이상해씨') && state.evolutionBannerText.includes('이상해풀'),
    '진화 축하 배너 문구가 올바르게 생성되어야 합니다'
  );
  assert.ok(rewardCalls >= 1, '진화 달성 시 helpers.rewardCharacter()가 호출되어야 합니다');

  // 열매를 받아먹지 못하고 바닥으로 놓쳤을 때 하트 1개 감소 (5 -> 4), 폭탄은 놓쳐도 하트 유지 확인
  stageEl._berryGame.spawnFallingItem('berry');
  const fallingBerry = stageEl._berryGame.getState().items[0];
  fallingBerry.x = 52; // 주인공(중앙)과 멀리 떨어진 위치
  fallingBerry.y = 290; // 바닥 아래로 떨어지기 직전
  stageEl._berryGame.stepFrame();
  assert.equal(
    stageEl._berryGame.getState().lives,
    4,
    '열매를 받지 못하고 놓쳤을 때 하트가 1개 감소해야 합니다 (5 -> 4)'
  );

  stageEl._berryGame.spawnFallingItem('bomb');
  const fallingBomb = stageEl._berryGame.getState().items[stageEl._berryGame.getState().items.length - 1];
  fallingBomb.x = 52;
  fallingBomb.y = 290;
  stageEl._berryGame.stepFrame();
  assert.equal(
    stageEl._berryGame.getState().lives,
    4,
    '폭탄은 피해야 하는 장애물이므로 바닥에 떨어져도 하트가 감소하지 않아야 합니다'
  );

  // cleanup() 동작 확인
  cleanup();
  assert.equal(stageEl._berryGame, null, 'cleanup() 호출 후 _berryGame 훅이 해제되어야 합니다');
});

test('4. P1/P2 퍼센트 좌표 동기화, 그림자, 우측 방향 플립 및 점프 버튼 중복 클릭 방지가 동작한다', () => {
  const stageEl = createMockElement('div');
  const cleanupRunner = globalThis.PokeGameRunner.mount(stageEl, { id: 1, nameKr: '이상해씨' }, {});

  const runnerHero = stageEl.querySelector('.poke-runner-hero');
  const runnerShadow = stageEl.querySelector('.poke-runner-shadow');
  const runnerImg = stageEl.querySelector('.poke-runner-hero-img');
  const jumpBtn = stageEl.querySelector('.poke-runner-btn-jump');

  assert.ok(runnerHero.style.left.endsWith('%'), 'runner 주인공 left는 퍼센트 좌표여야 합니다');
  assert.ok(runnerHero.style.bottom.endsWith('%'), 'runner 주인공 bottom은 잔디 라인 퍼센트 좌표여야 합니다');
  assert.ok(runnerShadow, 'runner 바닥 그림자(.poke-runner-shadow)가 존재해야 합니다');
  assert.ok(runnerImg.style.transform.includes('scale(-'), 'runner 주인공 스프라이트는 오른쪽(음수 scaleX)을 바라봐야 합니다');

  // pointerdown 직후 click 이벤트가 발생해도 1단 점프만 수행되어야 함
  jumpBtn.dispatchEvent('pointerdown', { preventDefault() {} });
  jumpBtn.dispatchEvent('click', { preventDefault() {} });
  assert.equal(
    stageEl._runnerGame.getState().jumpCount,
    1,
    'pointerdown 직후 이어지는 click 이벤트로 인해 2단 점프가 오발동하면 안 됩니다'
  );

  // 숙이기 버튼: pointerdown 동안만 숙이고 pointerup 시 즉시 해제되어야 함
  const duckBtn = stageEl.querySelector('.poke-runner-btn-duck');
  duckBtn.dispatchEvent('pointerdown', { preventDefault() {} });
  assert.equal(stageEl._runnerGame.getState().isDucking, true, '숙이기 버튼을 누르고 있을 때는 isDucking === true 여야 합니다');
  duckBtn.dispatchEvent('pointerup', { preventDefault() {} });
  duckBtn.dispatchEvent('click', { preventDefault() {} });
  assert.equal(stageEl._runnerGame.getState().isDucking, false, '숙이기 버튼에서 손을 떼면 즉시 isDucking === false 가 되어야 합니다');

  // 빠른 연속 2단 점프 시 1단 점프보다 확실히 더 높이 올라가야 함
  stageEl._runnerGame.reset();
  stageEl._runnerGame.jump();
  stageEl._runnerGame.stepFrame();
  stageEl._runnerGame.jump();
  let minDoubleJumpY = 0;
  for (let i = 0; i < 35; i++) {
    const st = stageEl._runnerGame.stepFrame();
    if (st.y < minDoubleJumpY) minDoubleJumpY = st.y;
  }
  assert.ok(
    minDoubleJumpY <= -155,
    `빠른 2단 점프 정점 높이(minY=${minDoubleJumpY})는 1단 점프(-120)보다 훨씬 높아야 합니다 (<= -155)`
  );

  // 전체화면 스테이지 스케일(예: 960x640)에서 점프 변위(yOffset)가 화면 스케일에 맞춰 증폭되어야 함
  const stageArea = stageEl.querySelector('.poke-runner-stage-area');
  stageArea.clientWidth = 960;
  stageArea.clientHeight = 640;
  stageEl._runnerGame.reset();
  stageEl._runnerGame.jump();
  for (let i = 0; i < 12; i++) {
    stageEl._runnerGame.stepFrame();
  }
  const scaledState = stageEl._runnerGame.getState();
  assert.ok(
    scaledState.renderScaleY > 1.1,
    `전체화면(960x640)에서 renderScaleY(${scaledState.renderScaleY})가 1.1보다 커야 합니다`
  );
  const translateMatch = runnerImg.style.transform.match(/translateY\((-?\d+(?:\.\d+)?)px\)/);
  assert.ok(translateMatch, 'runnerImg transform에 translateY(px)가 포함되어야 합니다');
  const renderedTranslateY = Number(translateMatch[1]);
  assert.ok(
    Math.abs(renderedTranslateY) > Math.abs(scaledState.y) * 1.1,
    `DOM 점프 높이(${renderedTranslateY}px)가 논리 좌표(${scaledState.y})에 화면 스케일(${scaledState.renderScaleY})을 곱한 값과 일치해야 합니다`
  );

  cleanupRunner();

  const berryStage = createMockElement('div');
  const cleanupBerry = globalThis.PokeGameBerry.mount(berryStage, { id: 1, nameKr: '이상해씨' }, {});
  const berryHero = berryStage.querySelector('.poke-berry-hero');
  const berryShadow = berryStage.querySelector('.poke-berry-shadow');
  const berryAura = berryStage.querySelector('.poke-berry-aura');

  assert.ok(berryHero.style.bottom.endsWith('%'), 'berry 주인공 bottom은 잔디 라인 퍼센트 좌표여야 합니다');
  assert.ok(berryShadow, 'berry 바닥 그림자(.poke-berry-shadow)가 존재해야 합니다');
  assert.ok(berryAura, 'berry 진화 오라(.poke-berry-aura)가 존재해야 합니다');

  cleanupBerry();
});

