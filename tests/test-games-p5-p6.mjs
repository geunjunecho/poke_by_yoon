/**
 * 포켓몬 미니게임 P5(포켓몬 카드 짝맞추기) & P6(후다닥! 판 뒤집기 대결) 단위 테스트
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

function createMockElement(tagName = 'div', attrs = {}) {
  const listeners = new Map();
  return {
    tagName: tagName.toUpperCase(),
    className: attrs.className || '',
    textContent: '',
    src: '',
    alt: '',
    style: { transform: '', width: '', background: '' },
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
    querySelectorAll() {
      return [];
    }
  };
}

function createMockCharCtx(overrides = {}) {
  return {
    id: 25,
    nameKr: '피카츄',
    nameEn: 'Pikachu',
    artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
    runnerSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
    isAnimatedGif: false,
    primaryType: 'electric',
    typeNameKr: '전기',
    typeColor: '#F7D02C',
    typeEmoji: '⚡',
    height: 4,
    weight: 60,
    cryUrl: '',
    evolutionChain: [
      { id: 172, nameKr: '피츄' },
      { id: 25, nameKr: '피카츄' },
      { id: 26, nameKr: '라이츄' }
    ],
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

const registeredGames = new Map();
globalThis.window = globalThis;
globalThis.addEventListener = globalThis.addEventListener || function () {};
globalThis.removeEventListener = globalThis.removeEventListener || function () {};
globalThis.PokeMiniGames = {
  register(id, gameDef) {
    registeredGames.set(id, gameDef);
  }
};

const memoryCode = fs.readFileSync(path.join(ROOT_DIR, 'js', 'games', 'poke-memory.js'), 'utf8');
const flipBattleCode = fs.readFileSync(path.join(ROOT_DIR, 'js', 'games', 'poke-flipbattle.js'), 'utf8');

vm.runInThisContext(memoryCode, { filename: 'poke-memory.js' });
vm.runInThisContext(flipBattleCode, { filename: 'poke-flipbattle.js' });

test('1. poke-memory.js와 poke-flipbattle.js가 PokeMiniGames.register에 정상 등록된다', () => {
  assert.equal(registeredGames.has('memory'), true, 'memory 게임이 등록되어야 함');
  assert.equal(registeredGames.has('flipbattle'), true, 'flipbattle 게임이 등록되어야 함');

  const memoryDef = registeredGames.get('memory');
  assert.equal(memoryDef.id, 'memory');
  assert.equal(memoryDef.title, '포켓몬 카드 짝맞추기!');
  assert.equal(memoryDef.icon, '🃏');
  assert.equal(memoryDef.badgeColor, '#AB47BC');
  assert.equal(memoryDef.themeColor, '#AB47BC');
  assert.equal(typeof memoryDef.mount, 'function');
  assert.equal(globalThis.PokeGameMemory, memoryDef);

  const flipDef = registeredGames.get('flipbattle');
  assert.equal(flipDef.id, 'flipbattle');
  assert.equal(flipDef.title, '후다닥! 판 뒤집기 대결!');
  assert.equal(flipDef.icon, '⚡');
  assert.equal(flipDef.badgeColor, '#FF7043');
  assert.equal(flipDef.themeColor, '#FF7043');
  assert.equal(typeof flipDef.mount, 'function');
  assert.equal(globalThis.PokeGameFlipBattle, flipDef);
});

test('2. memory 게임에서 skipPreview(), useHint(), flipCard() 짝맞추기 및 2스테이지 전환·완주가 정상 동작하고 cleanup()이 동작한다', () => {
  const stageEl = createMockStage();
  const charCtx = createMockCharCtx();
  const helpers = createMockHelpers();

  const cleanup = globalThis.PokeGameMemory.mount(stageEl, charCtx, helpers);
  assert.equal(typeof cleanup, 'function', 'mount는 cleanup 함수를 반환해야 함');
  assert.ok(stageEl._memoryGame, 'stageEl._memoryGame 테스트 훅이 노출되어야 함');

  const init = stageEl._memoryGame.getState();
  assert.equal(init.stage, 1, '1스테이지로 시작해야 함');
  assert.equal(init.totalPairs, 4, '1스테이지는 4쌍이어야 함');
  assert.equal(init.cards.length, 8, '1스테이지는 총 8장이어야 함');
  assert.equal(init.isPreviewing, true, '시작 직후 2.5초 앞면 미리보기 상태여야 함');

  // skipPreview() 동작 확인
  const skipped = stageEl._memoryGame.skipPreview();
  assert.equal(skipped, true);
  assert.equal(stageEl._memoryGame.getState().isPreviewing, false, 'skipPreview 후 미리보기가 종료되어야 함');

  // useHint() 동작 확인 (주인공 포켓몬 우선 힌트)
  const hintRes = stageEl._memoryGame.useHint();
  assert.ok(hintRes, 'useHint 결과가 반환되어야 함');
  assert.equal(hintRes.pokemonId, 25, '주인공 포켓몬(#25)이 최우선 힌트 대상이어야 함');
  assert.equal(hintRes.isHero, true);
  assert.equal(hintRes.indices.length, 2, '힌트 인덱스는 2장이어야 함');
  assert.equal(stageEl._memoryGame.getState().hintsUsed, 1);

  // 주인공 포켓몬 카드 짝 맞추기 (+50점 기본 + 100점 주인공 보너스 = 150점)
  const [heroIdx1, heroIdx2] = hintRes.indices;
  const flip1 = stageEl._memoryGame.flipCard(heroIdx1);
  assert.equal(flip1.action, 'flip');
  assert.equal(flip1.matched, false);

  const flip2 = stageEl._memoryGame.flipCard(heroIdx2);
  assert.equal(flip2.action, 'match');
  assert.equal(flip2.matched, true);
  assert.equal(flip2.isHeroMatch, true);
  assert.equal(flip2.pointsEarned, 150, '내 파트너 짝을 맞추면 50 + 100 = 150점이어야 함');
  assert.equal(stageEl._memoryGame.getState().score, 150);
  assert.equal(helpers.calls.cries, 1, '내 파트너 짝을 맞추면 울음소리가 재생되어야 함');

  // 오답(서로 다른 카드) 뒤집을 때 감점 제로 확인
  const cardsAfterHero = stageEl._memoryGame.getState().cards;
  const unmatched = cardsAfterHero.filter((c) => !c.isMatched);
  const firstUnmatched = unmatched[0];
  const diffUnmatched = unmatched.find((c) => c.pokemonId !== firstUnmatched.pokemonId);
  stageEl._memoryGame.flipCard(firstUnmatched.index);
  const mismatchRes = stageEl._memoryGame.flipCard(diffUnmatched.index);
  assert.equal(mismatchRes.action, 'mismatch');
  assert.equal(mismatchRes.pointsEarned, 0);
  assert.equal(stageEl._memoryGame.getState().score, 150, '틀려도 감점이 없어야 함');

  // 남은 1스테이지 3쌍 모두 맞추기
  const pairGroups = new Map();
  for (const c of stageEl._memoryGame.getState().cards) {
    if (!c.isMatched) {
      if (!pairGroups.has(c.pokemonId)) pairGroups.set(c.pokemonId, []);
      pairGroups.get(c.pokemonId).push(c.index);
    }
  }
  for (const indices of pairGroups.values()) {
    stageEl._memoryGame.flipCard(indices[0]);
    stageEl._memoryGame.flipCard(indices[1]);
  }

  assert.equal(stageEl._memoryGame.getState().stageCleared, true, '1스테이지 4쌍 완료 시 stageCleared가 true여야 함');

  // 2스테이지(6쌍, 12장) 전환 확인
  stageEl._memoryGame.nextStage();
  const st2 = stageEl._memoryGame.getState();
  assert.equal(st2.stage, 2);
  assert.equal(st2.totalPairs, 6);
  assert.equal(st2.cards.length, 12, '2스테이지는 6쌍(12장)이어야 함');

  // finishGame() 호출 및 보상/결과 오버레이 확인
  stageEl._memoryGame.finishGame();
  const finalState = stageEl._memoryGame.getState();
  assert.equal(finalState.finished, true);
  assert.ok(helpers.highScores.memory >= 300);
  assert.equal(helpers.calls.rewards, 1);
  assert.equal(helpers.calls.overlays.length, 1);

  cleanup();
  assert.equal(stageEl._memoryGame, null, 'cleanup 호출 후 _memoryGame 훅이 해제되어야 함');
});

test('3. flipbattle 게임에서 flipTile(), triggerRainbowBurst() 십자 뒤집기, finishGame() 승리 판정 및 cleanup()이 정상 동작한다', () => {
  const stageEl = createMockStage();
  const charCtx = createMockCharCtx();
  const helpers = createMockHelpers();

  const cleanup = globalThis.PokeGameFlipBattle.mount(stageEl, charCtx, helpers);
  assert.equal(typeof cleanup, 'function', 'mount는 cleanup 함수를 반환해야 함');
  assert.ok(stageEl._flipBattleGame, 'stageEl._flipBattleGame 테스트 훅이 노출되어야 함');

  const init = stageEl._flipBattleGame.getState();
  assert.equal(init.tiles.length, 16, '4x4 총 16장 타일 보드여야 함');
  assert.equal(init.playerCount, 8, '초기 내 포켓몬 타일은 8장이어야 함');
  assert.equal(init.rivalCount, 8, '초기 로켓단 타일은 8장이어야 함');
  assert.equal(init.timeLeft, 25, '제한 시간은 25초여야 함');
  assert.equal(init.score, 0);

  // 0번 타일(초기 로켓단 타일) 뒤집기 -> +15점, 내 포켓몬 9장 vs 로켓단 7장
  const flipRes = stageEl._flipBattleGame.flipTile(0);
  assert.equal(flipRes.flipped, true);
  assert.equal(flipRes.pointsEarned, 15, '타일 1장 뒤집기 시 15점이 증가해야 함');
  assert.equal(stageEl._flipBattleGame.getState().score, 15);
  assert.equal(stageEl._flipBattleGame.getState().playerCount, 9);
  assert.equal(stageEl._flipBattleGame.getState().rivalCount, 7);

  // 로켓단 나옹 방해꾼 뒤집기(rivalFlip) 확인
  const rivalRes = stageEl._flipBattleGame.rivalFlip(0);
  assert.equal(rivalRes.index, 0);
  assert.equal(stageEl._flipBattleGame.getState().playerCount, 8);
  assert.equal(stageEl._flipBattleGame.getState().rivalCount, 8);

  // 무지개 몬스터볼 필살기(triggerRainbowBurst) 십자(+) 뒤집기 및 +80점 보너스 확인
  // 인덱스 5 (row 1, col 1) -> 같은 행(4,5,6,7) + 같은 열(1,5,9,13) = 총 7장 내 카드로 변신
  const burstRes = stageEl._flipBattleGame.triggerRainbowBurst(5);
  assert.equal(burstRes.bonusPoints, 80, '무지개 몬스터볼 필살기는 +80점 보너스여야 함');
  assert.deepEqual(burstRes.affectedIndices, [1, 4, 5, 6, 7, 9, 13], '십자(+) 방향 7개 타일이 모두 포함되어야 함');
  assert.equal(stageEl._flipBattleGame.getState().score, 95);
  assert.ok(helpers.calls.cries >= 1, '무지개 몬스터볼 발동 시 포켓몬 울음소리가 호출되어야 함');

  const tilesAfterBurst = stageEl._flipBattleGame.getState().tiles;
  for (const idx of [1, 4, 5, 6, 7, 9, 13]) {
    assert.equal(tilesAfterBurst[idx].owner, 'player', `십자 범위 타일(${idx})이 모두 player 소유로 뒤집혀야 함`);
  }
  assert.ok(
    stageEl._flipBattleGame.getState().playerCount > stageEl._flipBattleGame.getState().rivalCount,
    '십자 필살기 후 내 포켓몬 타일이 로켓단보다 많아야 함'
  );

  // stepSecond() 동작 확인
  const remaining = stageEl._flipBattleGame.stepSecond();
  assert.equal(remaining, 24);

  // finishGame() 호출 시 내 타일이 더 많으므로 대승리(+100점 승리 보너스) 판정 확인
  const finishRes = stageEl._flipBattleGame.finishGame();
  assert.equal(finishRes.finished, true);
  assert.equal(finishRes.isVictory, true);
  assert.equal(finishRes.bonusPoints, 100);
  assert.ok(finishRes.message.includes('대승리'), '승리 메시지가 포함되어야 함');
  assert.equal(finishRes.score, 195);
  assert.equal(helpers.highScores.flipbattle, 195);
  assert.equal(helpers.calls.rewards, 1);
  assert.equal(helpers.calls.overlays.length, 1);

  cleanup();
  assert.equal(stageEl._flipBattleGame, null, 'cleanup 호출 후 _flipBattleGame 훅이 해제되어야 함');
});
