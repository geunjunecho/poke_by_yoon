/**
 * 포켓몬 미니게임 P3(몬스터볼 캐치) & P4(시소 대결) 단위 테스트
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

/**
 * 가벼운 DOM 엘리먼트 및 스테이지 모킹 헬퍼
 */
function createMockElement(tagName = 'div', attrs = {}) {
  const listeners = new Map();
  return {
    tagName: tagName.toUpperCase(),
    className: attrs.className || '',
    textContent: '',
    src: '',
    alt: '',
    style: { transform: '', borderColor: '', boxShadow: '' },
    attributes: { ...attrs },
    getAttribute(name) {
      return this.attributes[name] ?? null;
    },
    setAttribute(name, val) {
      this.attributes[name] = String(val);
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      if (listeners.has(type)) listeners.get(type).delete(fn);
    },
    click() {
      const set = listeners.get('click');
      if (set) {
        for (const fn of set) fn({ preventDefault() {} });
      }
    }
  };
}

function createMockStage() {
  const roleMap = new Map();
  const ballSlots = [1, 2, 3, 4, 5].map((r) =>
    createMockElement('div', { 'data-ball-slot': String(r), className: 'catch-ball-slot' })
  );

  let htmlContent = '';
  return {
    get innerHTML() {
      return htmlContent;
    },
    set innerHTML(val) {
      htmlContent = String(val || '');
      roleMap.clear();
    },
    querySelector(selector) {
      const m = selector && selector.match(/\[data-role="([^"]+)"\]/);
      if (m) {
        const role = m[1];
        if (!roleMap.has(role)) {
          roleMap.set(role, createMockElement('div', { 'data-role': role }));
        }
        return roleMap.get(role);
      }
      return createMockElement('div');
    },
    querySelectorAll(selector) {
      if (selector === '[data-ball-slot]') {
        return ballSlots;
      }
      return [];
    }
  };
}

function createMockCharCtx(overrides = {}) {
  return {
    id: 25,
    nameKr: '피카츄',
    nameEn: 'pikachu',
    artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
    runnerSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
    isAnimatedGif: false,
    primaryType: 'electric',
    typeNameKr: '전기',
    typeColor: '#FFCA28',
    typeEmoji: '⚡',
    height: 4,
    weight: 60,
    cryUrl: '',
    evolutionChain: [],
    ...overrides
  };
}

function createMockHelpers() {
  const highScores = {};
  const calls = {
    sfx: [],
    cries: 0,
    rewards: 0,
    overlays: []
  };

  return {
    calls,
    highScores,
    playSfx(type, noteIdx) {
      calls.sfx.push({ type, noteIdx });
    },
    playCry() {
      calls.cries += 1;
    },
    computeRunTransform(state, tick) {
      return `translateY(${-(tick % 5)}px)`;
    },
    getHighScore(gameId) {
      return highScores[gameId] || 0;
    },
    saveHighScore(gameId, score) {
      highScores[gameId] = Math.max(highScores[gameId] || 0, score);
    },
    rewardCharacter() {
      calls.rewards += 1;
    },
    showResultOverlay(stageEl, opts) {
      calls.overlays.push(opts);
    }
  };
}

// 글로벌 브라우저/코어 허브 환경 모킹 및 스크립트 로드
const registeredGames = new Map();
globalThis.window = globalThis;
globalThis.addEventListener = globalThis.addEventListener || function () {};
globalThis.removeEventListener = globalThis.removeEventListener || function () {};
globalThis.PokeMiniGames = {
  register(id, gameDef) {
    registeredGames.set(id, gameDef);
  }
};

const catchCode = fs.readFileSync(path.join(ROOT_DIR, 'js', 'games', 'poke-catch.js'), 'utf8');
const seesawCode = fs.readFileSync(path.join(ROOT_DIR, 'js', 'games', 'poke-seesaw.js'), 'utf8');

vm.runInThisContext(catchCode, { filename: 'poke-catch.js' });
vm.runInThisContext(seesawCode, { filename: 'poke-seesaw.js' });

test('1. poke-catch.js와 poke-seesaw.js가 PokeMiniGames.register에 정상 등록된다', () => {
  assert.equal(registeredGames.has('catch'), true, 'catch 게임이 등록되어야 함');
  assert.equal(registeredGames.has('seesaw'), true, 'seesaw 게임이 등록되어야 함');

  const catchDef = registeredGames.get('catch');
  assert.equal(catchDef.id, 'catch');
  assert.equal(catchDef.title, '흔들흔들! 몬스터볼 캐치');
  assert.equal(catchDef.icon, '🔴');
  assert.equal(catchDef.badgeColor, '#FFCA28');
  assert.equal(typeof catchDef.mount, 'function');
  assert.equal(globalThis.PokeGameCatch, catchDef);

  const seesawDef = registeredGames.get('seesaw');
  assert.equal(seesawDef.id, 'seesaw');
  assert.equal(seesawDef.title, '누가누가 더 클까? 시소 대결');
  assert.equal(seesawDef.icon, '⚖️');
  assert.equal(seesawDef.badgeColor, '#29B6F6');
  assert.equal(typeof seesawDef.mount, 'function');
  assert.equal(Array.isArray(seesawDef.OPPONENT_POOL), true);
  assert.equal(seesawDef.OPPONENT_POOL.length, 20, '비교 포켓몬 풀은 20종이어야 함');
  assert.equal(globalThis.PokeGameSeesaw, seesawDef);
});

test('2. catch 게임에서 throwBallAtScale(0.9)(황금 구간) 호출 시 점수가 100점 증가하고 라운드가 진행되며 cleanup()이 동작한다', () => {
  const stageEl = createMockStage();
  const charCtx = createMockCharCtx();
  const helpers = createMockHelpers();

  const cleanup = globalThis.PokeGameCatch.mount(stageEl, charCtx, helpers);
  assert.equal(typeof cleanup, 'function', 'mount는 cleanup 함수를 반환해야 함');
  assert.ok(stageEl._catchGame, 'stageEl._catchGame 테스트 훅이 노출되어야 함');

  const initialState = stageEl._catchGame.getState();
  assert.equal(initialState.round, 1);
  assert.equal(initialState.score, 0);
  assert.equal(initialState.currentBall.name, '몬스터볼');

  // 1R: 황금 구간(0.9) 투척 -> +100점, 볼이 열리며 포획 성공(captured), 라운드 2(슈퍼볼)로 진행
  const res1 = stageEl._catchGame.throwBallAtScale(0.9);
  assert.equal(res1.tier, 'excellent');
  assert.equal(res1.points, 100);
  assert.equal(res1.caught, true, '황금 구간 투척 시 볼이 열리며 포획 성공(caught=true)이어야 함');
  assert.equal(res1.action, 'captured');
  assert.ok(res1.message.includes('엑설런트 캐치'));
  assert.ok(
    stageEl.querySelector('[data-role="flying-ball"]').className.includes('is-catch-success') &&
      stageEl.querySelector('[data-role="flying-ball"]').className.includes('is-opening'),
    '포획 성공 시 몬스터볼에 열림/포획 애니메이션 클래스가 부여되어야 함'
  );
  assert.ok(
    stageEl.querySelector('[data-role="pokemon-sprite"]').className.includes('is-captured'),
    '포획 성공 시 포켓몬이 볼 안으로 빨려 들어가는 클래스가 부여되어야 함'
  );

  const stateAfter1 = stageEl._catchGame.getState();
  assert.equal(stateAfter1.score, 100, '황금 구간 투척 후 점수가 100점이어야 함');
  assert.equal(stateAfter1.round, 2, '1라운드 후 라운드가 2로 진행되어야 함');
  assert.equal(stateAfter1.completedRounds, 1);
  assert.equal(stateAfter1.currentBall.name, '슈퍼볼', '2라운드는 슈퍼볼이어야 함');

  // 2R: 초록 구간(0.6) 투척 -> +70점, 포획 성공(captured), 라운드 3(하이퍼볼)
  const res2 = stageEl._catchGame.throwBallAtScale(0.6);
  assert.equal(res2.caught, true);
  assert.equal(res2.action, 'captured');
  assert.equal(stageEl._catchGame.getState().score, 170);
  assert.equal(stageEl._catchGame.getState().round, 3);
  assert.equal(stageEl._catchGame.getState().currentBall.name, '하이퍼볼');

  // 3R: 노란 구간(1.6) 투척 -> +30점, 포켓몬에 틱 부딪히고 땅에 떨어짐(deflected), 라운드 4(러브볼)
  const res3 = stageEl._catchGame.throwBallAtScale(1.6);
  assert.equal(res3.caught, false, '노란 구간(빗맞음) 투척 시 포획 실패(caught=false)여야 함');
  assert.equal(res3.action, 'deflected', '실패 시 포켓몬에 부딪혀 튕겨 떨어지는 deflected 액션이어야 함');
  assert.ok(res3.message.includes('부딪혀 볼이 땅에 떨어졌어요'));
  assert.ok(
    stageEl.querySelector('[data-role="flying-ball"]').className.includes('is-catch-fail') &&
      stageEl.querySelector('[data-role="flying-ball"]').className.includes('is-deflected'),
    '포획 실패 시 몬스터볼에 튕겨 떨어지는 애니메이션 클래스가 부여되어야 함'
  );
  assert.ok(
    stageEl.querySelector('[data-role="pokemon-sprite"]').className.includes('is-deflecting'),
    '포획 실패 시 포켓몬이 볼을 틱 쳐내는 클래스가 부여되어야 함'
  );
  assert.equal(stageEl._catchGame.getState().score, 200);
  assert.equal(stageEl._catchGame.getState().round, 4);
  assert.equal(stageEl._catchGame.getState().currentBall.name, '러브볼');

  // 4R & 5R(마스터볼) 완료 검증
  stageEl._catchGame.throwBallAtScale(0.9);
  assert.equal(stageEl._catchGame.getState().currentBall.name, '마스터볼');
  stageEl._catchGame.throwBallAtScale(0.9);

  const finalState = stageEl._catchGame.getState();
  assert.equal(finalState.finished, true);
  assert.equal(finalState.score, 400);
  assert.equal(helpers.highScores.catch, 400);
  assert.equal(helpers.calls.rewards, 1);
  assert.equal(helpers.calls.cries, 1);
  assert.equal(helpers.calls.overlays.length, 1);

  cleanup();
  assert.equal(stageEl._catchGame, null, 'cleanup 호출 후 _catchGame 훅이 해제되어야 함');
});

test('2-1. catch 게임은 라운드 시작 시 battle 페이즈(HP 100)로 시작하며, 배틀 공격으로 HP를 0으로 만들어야 catch 페이즈로 전환되고 조준 판정과 링 속도가 라운드별로 강화된다', () => {
  const stageEl = createMockStage();
  const charCtx = createMockCharCtx();
  const helpers = createMockHelpers();

  const cleanup = globalThis.PokeGameCatch.mount(stageEl, charCtx, helpers);
  const st0 = stageEl._catchGame.getState();

  assert.equal(st0.phase, 'battle', '라운드 시작 시 battle 페이즈여야 함');
  assert.equal(st0.hp, 100, '야생 포켓몬 초기 체력은 100이어야 함');
  assert.equal(st0.maxHp, 100);

  // 기존에 너무 쉽게 잡히던 큰 링(1.20)은 이제 빗맞음(caught=false)이어야 함
  const earlyEval = globalThis.PokeGameCatch.evaluateRingScale(1.20, 1);
  assert.equal(earlyEval.caught, false, '링이 아직 큰 상태(1.20)에서 던지면 포획 실패여야 함');
  assert.equal(earlyEval.action, 'deflected');

  // 라운드별 링 수축 속도가 1R보다 5R에서 더 빨라야 함
  assert.equal(typeof globalThis.PokeGameCatch.getRingSpeedForRound, 'function');
  assert.ok(
    globalThis.PokeGameCatch.getRingSpeedForRound(5) > globalThis.PokeGameCatch.getRingSpeedForRound(1),
    '5라운드 링 수축 속도가 1라운드보다 빨라야 함'
  );

  // battle 페이즈에서 메인 버튼 클릭 시 볼 투척이 아니라 배틀 공격이 수행되어야 함
  const throwBtn = stageEl.querySelector('[data-role="throw-btn"]');
  throwBtn.click();
  const stAfterClick = stageEl._catchGame.getState();
  assert.equal(stAfterClick.round, 1, '배틀 페이즈에서 첫 공격 클릭 시 바로 다음 라운드로 넘어가면 안 됨');
  assert.ok(stAfterClick.hp < 100, '배틀 공격 후 야생 포켓몬 체력이 감소해야 함');

  // 크리티컬 커서(0.5) 공격으로 체력을 완전히 깎으면 catch 페이즈로 전환되어야 함
  while (stageEl._catchGame.getState().phase === 'battle') {
    stageEl._catchGame.attackAtCursor(0.5);
  }
  const stCatch = stageEl._catchGame.getState();
  assert.equal(stCatch.hp, 0, '배틀 제압 완료 시 체력이 0이어야 함');
  assert.equal(stCatch.phase, 'catch', '체력이 0이 되면 catch 페이즈로 전환되어야 함');

  cleanup();
});

test('3. seesaw 게임에서 현재 문제(mode: weight | height)의 정답 쪽을 선택했을 때 정답 판정 및 점수 증가가 정상 동작하고 cleanup()이 동작한다', () => {
  const stageEl = createMockStage();
  const charCtx = createMockCharCtx({ id: 25, nameKr: '피카츄', weight: 60, height: 4 });
  const helpers = createMockHelpers();

  const cleanup = globalThis.PokeGameSeesaw.mount(stageEl, charCtx, helpers);
  assert.equal(typeof cleanup, 'function', 'mount는 cleanup 함수를 반환해야 함');
  assert.ok(stageEl._seesawGame, 'stageEl._seesawGame 테스트 훅이 노출되어야 함');

  const st1 = stageEl._seesawGame.getState();
  assert.equal(st1.round, 1);
  assert.equal(st1.score, 0);
  assert.ok(st1.mode === 'weight' || st1.mode === 'height');
  assert.notEqual(st1.leftValue, st1.rightValue, '내 포켓몬과 상대 포켓몬의 비교 수치는 달라야 함');

  // 현재 문제의 정답 쪽 계산 후 선택
  const expectedSide1 = st1.leftValue > st1.rightValue ? 'left' : 'right';
  assert.equal(st1.correctSide, expectedSide1);

  const res1 = stageEl._seesawGame.answerSide(expectedSide1);
  assert.equal(res1.isCorrect, true, '정답 쪽 선택 시 isCorrect가 true여야 함');
  assert.equal(res1.points, 100, '첫 정답 시 100점이 부여되어야 함');
  assert.equal(
    res1.plankTransform,
    expectedSide1 === 'left' ? 'rotate(-18deg)' : 'rotate(+18deg)',
    '시소가 더 무겁거나 큰 쪽으로 18도 기울어져야 함'
  );

  const stAfter1 = stageEl._seesawGame.getState();
  assert.equal(stAfter1.score, 100, '점수가 100점 증가해야 함');
  assert.equal(stAfter1.round, 2, '다음 라운드로 진행되어야 함');

  // 2R: 연속 정답 선택 시 +100점 + 연속 보너스 20점 = +120점 확인
  const expectedSide2 = stAfter1.leftValue > stAfter1.rightValue ? 'left' : 'right';
  const res2 = stageEl._seesawGame.answerSide(expectedSide2);
  assert.equal(res2.isCorrect, true);
  assert.equal(res2.points, 120, '연속 정답 시 보너스 포함 120점이 증가해야 함');
  assert.equal(stageEl._seesawGame.getState().score, 220);

  // 3R: 다중 포켓몬 합산 대결(Lv.3) 검증 및 오답 선택 시 격려 점수 +30점 확인
  const st3 = stageEl._seesawGame.getState();
  assert.equal(st3.difficultyLevel, 3, '3라운드는 Lv.3 합산 대결이어야 함');
  assert.ok(st3.leftCount > 1 || st3.rightCount > 1, '3라운드부터는 다중 포켓몬(×2마리 이상) 합산 대결이 등장해야 함');
  assert.equal(st3.leftValue, st3.leftUnitValue * st3.leftCount, '왼쪽 총합이 1마리 수치 × 마릿수와 일치해야 함');
  assert.equal(st3.rightValue, st3.rightUnitValue * st3.rightCount, '오른쪽 총합이 1마리 수치 × 마릿수와 일치해야 함');
  const wrongSide3 = st3.leftValue > st3.rightValue ? 'right' : 'left';
  const res3 = stageEl._seesawGame.answerSide(wrongSide3);
  assert.equal(res3.isCorrect, false);
  assert.equal(res3.points, 30, '틀려도 격려 점수 30점이 부여되어야 함');
  assert.equal(stageEl._seesawGame.getState().score, 250);

  // 4R & 5R(챔피언 결정전 Lv.5) 완료 확인
  const st4 = stageEl._seesawGame.getState();
  assert.equal(st4.difficultyLevel, 4);
  assert.ok(st4.leftCount > 1 || st4.rightCount > 1);
  stageEl._seesawGame.answerSide(st4.correctSide);
  const st5 = stageEl._seesawGame.getState();
  assert.equal(st5.difficultyLevel, 5);
  assert.ok(st5.leftCount > 1 || st5.rightCount > 1);
  stageEl._seesawGame.answerSide(st5.correctSide);

  const finalState = stageEl._seesawGame.getState();
  assert.equal(finalState.finished, true);
  assert.equal(finalState.score, 470);
  assert.equal(helpers.highScores.seesaw, 470);
  assert.equal(helpers.calls.rewards, 1);
  assert.equal(helpers.calls.overlays.length, 1);

  cleanup();
  assert.equal(stageEl._seesawGame, null, 'cleanup 호출 후 _seesawGame 훅이 해제되어야 함');
});
