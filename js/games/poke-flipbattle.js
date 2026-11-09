/**
 * 포켓몬 미니게임 P6: 후다닥! 판 뒤집기 대결! (poke-flipbattle.js)
 * 6~7세 맞춤 운동회 스타일 4x4 스피드 판 뒤집기 대결 (내 포켓몬 vs 😼 로켓단 나옹)
 */
(function (global) {
  'use strict';

  var GRID_COLS = 4;
  var GRID_ROWS = 4;
  var TOTAL_TILES = GRID_COLS * GRID_ROWS; // 16장
  var GAME_DURATION_SEC = 25;
  var RIVAL_INTERVAL_MS = 1100;
  var RAINBOW_SPAWN_MS = 5000;

  var RIVAL_META = {
    id: 52,
    nameKr: '로켓단 나옹',
    shortName: '로켓단',
    emoji: '😼',
    color: '#5E35B1',
    artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/52.png'
  };

  function artworkUrlById(id) {
    return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/' + id + '.png';
  }

  function createSafeHelpers(helpers) {
    var h = helpers || {};
    return {
      playSfx: function (type, noteIdx) {
        if (typeof h.playSfx === 'function') {
          try { h.playSfx(type, noteIdx); } catch (e) {}
        }
      },
      playCry: function () {
        if (typeof h.playCry === 'function') {
          try { h.playCry(); } catch (e) {}
        }
      },
      getHighScore: function (gameId) {
        if (typeof h.getHighScore === 'function') {
          try { return h.getHighScore(gameId) || 0; } catch (e) {}
        }
        return 0;
      },
      saveHighScore: function (gameId, score) {
        if (typeof h.saveHighScore === 'function') {
          try { return h.saveHighScore(gameId, score); } catch (e) {}
        }
        return false;
      },
      rewardCharacter: function () {
        if (typeof h.rewardCharacter === 'function') {
          try { return h.rewardCharacter(); } catch (e) {}
        }
      },
      showResultOverlay: function (stageEl, opts) {
        if (typeof h.showResultOverlay === 'function') {
          try { return h.showResultOverlay(stageEl, opts); } catch (e) {}
        }
      }
    };
  }

  function normalizeHeroPokemon(charCtx) {
    var c = charCtx || {};
    var id = Number(c.id) || 25;
    return {
      id: id,
      nameKr: c.nameKr || '피카츄',
      artworkUrl: c.artworkUrl || c.runnerSpriteUrl || c.spriteUrl || artworkUrlById(id),
      typeColor: c.typeColor || '#FF7043',
      typeEmoji: c.typeEmoji || '⚡'
    };
  }

  /**
   * 초기 4x4 보드 생성: 8장은 내 포켓몬('player'), 8장은 로켓단 나옹('rival')
   * 체크보드 배치를 기본으로 사용하여 0번 타일은 항상 'rival'로 시작
   */
  function createInitialTiles() {
    var tiles = [];
    for (var i = 0; i < TOTAL_TILES; i++) {
      var r = Math.floor(i / GRID_COLS);
      var c = i % GRID_COLS;
      var owner = (r + c) % 2 === 0 ? 'rival' : 'player';
      tiles.push({
        index: i,
        row: r,
        col: c,
        owner: owner,
        hasRainbow: false,
        burstFlash: false
      });
    }
    return tiles;
  }

  function getCrossIndices(centerIndex) {
    var idx = Number(centerIndex);
    if (isNaN(idx) || idx < 0 || idx >= TOTAL_TILES) return [];
    var targetRow = Math.floor(idx / GRID_COLS);
    var targetCol = idx % GRID_COLS;
    var affected = [];
    for (var i = 0; i < TOTAL_TILES; i++) {
      var r = Math.floor(i / GRID_COLS);
      var c = i % GRID_COLS;
      if (r === targetRow || c === targetCol) {
        affected.push(i);
      }
    }
    return affected;
  }

  function countOwners(tiles) {
    var playerCount = 0;
    var rivalCount = 0;
    for (var i = 0; i < tiles.length; i++) {
      if (tiles[i].owner === 'player') playerCount += 1;
      else rivalCount += 1;
    }
    return { playerCount: playerCount, rivalCount: rivalCount };
  }

  function buildFlipBattleMarkup(hero, state) {
    var counts = countOwners(state.tiles);
    var playerPct = Math.round((counts.playerCount / TOTAL_TILES) * 100);
    var rivalPct = 100 - playerPct;

    var tilesHtml = state.tiles.map(function (tile) {
      var isPlayer = tile.owner === 'player';
      var cls = 'poke-flipbattle-tile ' + (isPlayer ? 'is-player' : 'is-rival');
      if (tile.hasRainbow) cls += ' has-rainbow';
      if (tile.burstFlash) cls += ' is-bursting';

      return (
        '<button type="button" class="' + cls + '" data-role="flip-tile" data-tile-index="' + tile.index + '" ' +
          'style="--player-tile-color: ' + hero.typeColor + '; --rival-tile-color: ' + RIVAL_META.color + ';" ' +
          'aria-label="' + (isPlayer ? hero.nameKr + ' 카드' : '로켓단 나옹 카드') + '">' +
          '<div class="poke-flipbattle-tile-inner">' +
            (tile.hasRainbow
              ? '<span class="poke-flipbattle-rainbow-badge" data-role="rainbow-badge">🌟 무지개 몬스터볼</span>'
              : '') +
            (isPlayer
              ? '<img class="poke-flipbattle-tile-img" src="' + hero.artworkUrl + '" alt="' + hero.nameKr + '" />' +
                '<span class="poke-flipbattle-tile-label">' + hero.typeEmoji + ' ' + hero.nameKr + '</span>'
              : '<div class="poke-flipbattle-rival-icon">😼</div>' +
                '<span class="poke-flipbattle-tile-label">😼 로켓단</span>') +
          '</div>' +
        '</button>'
      );
    }).join('');

    return (
      '<div class="poke-flipbattle-root" style="--hero-color: ' + hero.typeColor + ';">' +
        '<div class="poke-flipbattle-hud">' +
          '<div class="poke-flipbattle-timer-pill" data-role="timer-pill">⏱️ 남은 시간 ' + state.timeLeft + '초</div>' +
          '<div class="poke-flipbattle-banner" data-role="banner-text">' + state.bannerText + '</div>' +
          '<div class="poke-flipbattle-score-pill" data-role="score-pill">점수 ' + state.score + '점</div>' +
        '</div>' +
        '<div class="poke-flipbattle-tug-wrap">' +
          '<div class="poke-flipbattle-tug-labels">' +
            '<span class="poke-flipbattle-tug-my" data-role="my-count-label">' + hero.typeEmoji + ' 내 포켓몬 ' + counts.playerCount + '장</span>' +
            '<span class="poke-flipbattle-tug-vs">⚡ 세력 줄다리기 ⚡</span>' +
            '<span class="poke-flipbattle-tug-rival" data-role="rival-count-label">😼 로켓단 ' + counts.rivalCount + '장</span>' +
          '</div>' +
          '<div class="poke-flipbattle-tug-bar">' +
            '<div class="poke-flipbattle-tug-fill-player" data-role="tug-fill-player" style="width: ' + playerPct + '%; background: ' + hero.typeColor + ';"></div>' +
            '<div class="poke-flipbattle-tug-fill-rival" data-role="tug-fill-rival" style="width: ' + rivalPct + '%;"></div>' +
          '</div>' +
        '</div>' +
        '<div class="poke-flipbattle-board" data-role="flip-board">' +
          tilesHtml +
        '</div>' +
      '</div>'
    );
  }

  function mountFlipBattleGame(stageEl, charCtx, helpers) {
    if (!stageEl) {
      return function noopCleanup() {};
    }

    var safeHelpers = createSafeHelpers(helpers);
    var hero = normalizeHeroPokemon(charCtx);

    var state = {
      gameId: 'flipbattle',
      timeLeft: GAME_DURATION_SEC,
      maxTime: GAME_DURATION_SEC,
      score: 0,
      combo: 0,
      rainbowIndex: -1,
      rainbowBursts: 0,
      tiles: createInitialTiles(),
      isPointerDown: false,
      lastSwipedIndex: -1,
      finished: false,
      cleanedUp: false,
      outcome: null,
      isVictory: false,
      bannerText: '🖐️ 로켓단 카드를 터치하거나 손가락으로 쓱~ 문질러 뒤집어요!'
    };

    var intervals = [];
    var timeouts = [];

    function addInterval(fn, ms) {
      var id = setInterval(function () {
        if (!state.cleanedUp && !state.finished) fn();
      }, ms);
      intervals.push(id);
      return id;
    }

    function addTimeout(fn, ms) {
      var id = setTimeout(function () {
        var idx = timeouts.indexOf(id);
        if (idx !== -1) timeouts.splice(idx, 1);
        if (!state.cleanedUp) fn();
      }, ms);
      timeouts.push(id);
      return id;
    }

    function clearAllTimers() {
      while (intervals.length > 0) {
        clearInterval(intervals.pop());
      }
      while (timeouts.length > 0) {
        clearTimeout(timeouts.pop());
      }
    }

    function queryRole(role) {
      if (typeof stageEl.querySelector === 'function') {
        return stageEl.querySelector('[data-role="' + role + '"]');
      }
      return null;
    }

    function bindBoardEvents() {
      var boardEl = queryRole('flip-board');
      if (boardEl && typeof boardEl.addEventListener === 'function') {
        boardEl.addEventListener('pointerdown', function () {
          state.isPointerDown = true;
        });
        boardEl.addEventListener('pointerup', function () {
          state.isPointerDown = false;
          state.lastSwipedIndex = -1;
        });
        boardEl.addEventListener('pointerleave', function () {
          state.isPointerDown = false;
          state.lastSwipedIndex = -1;
        });
        boardEl.addEventListener('pointermove', function (e) {
          if (!state.isPointerDown || state.finished || state.cleanedUp) return;
          if (typeof document !== 'undefined' && typeof document.elementFromPoint === 'function' && e && typeof e.clientX === 'number') {
            var hitEl = document.elementFromPoint(e.clientX, e.clientY);
            var tileBtn = hitEl && hitEl.closest ? hitEl.closest('[data-tile-index]') : hitEl;
            if (tileBtn && tileBtn.getAttribute) {
              var idxStr = tileBtn.getAttribute('data-tile-index');
              if (idxStr !== null) {
                var idx = Number(idxStr);
                if (idx !== state.lastSwipedIndex) {
                  state.lastSwipedIndex = idx;
                  flipTile(idx, { fromSwipe: true });
                }
              }
            }
          }
        });
      }

      if (typeof stageEl.querySelectorAll === 'function') {
        var tileEls = stageEl.querySelectorAll('.poke-flipbattle-tile');
        if (!tileEls || tileEls.length === 0) {
          tileEls = stageEl.querySelectorAll('[data-role="flip-tile"]');
        }
        for (var i = 0; i < (tileEls ? tileEls.length : 0); i++) {
          (function (tileEl, fallbackIdx) {
            if (!tileEl || typeof tileEl.addEventListener !== 'function') return;
            function getIdx() {
              var attr = tileEl.getAttribute ? tileEl.getAttribute('data-tile-index') : null;
              return attr !== null ? Number(attr) : fallbackIdx;
            }
            tileEl.addEventListener('click', function (e) {
              if (e && typeof e.preventDefault === 'function') e.preventDefault();
              flipTile(getIdx());
            });
            tileEl.addEventListener('pointerenter', function () {
              if (state.isPointerDown) {
                flipTile(getIdx(), { fromSwipe: true });
              }
            });
          })(tileEls[i], i);
        }
      }
    }

    function render() {
      if (state.cleanedUp) return;
      stageEl.innerHTML = buildFlipBattleMarkup(hero, state);
      bindBoardEvents();
    }

    /**
     * 🌟 무지개 몬스터볼 필살기 발동 (가로·세로 십자 방향 한꺼번에 내 카드로 변신 + 80점 보너스)
     */
    function triggerRainbowBurst(centerIndex) {
      if (state.cleanedUp || state.finished) {
        return { bonusPoints: 0, affectedIndices: [], totalScore: state.score };
      }

      var idx = Number(centerIndex);
      if (isNaN(idx) || idx < 0 || idx >= TOTAL_TILES) {
        idx = state.rainbowIndex >= 0 ? state.rainbowIndex : 0;
      }

      var affectedIndices = getCrossIndices(idx);
      var newlyFlippedCount = 0;

      for (var i = 0; i < state.tiles.length; i++) {
        state.tiles[i].hasRainbow = false;
        state.tiles[i].burstFlash = false;
      }
      state.rainbowIndex = -1;

      for (var j = 0; j < affectedIndices.length; j++) {
        var tIdx = affectedIndices[j];
        var tile = state.tiles[tIdx];
        if (tile) {
          if (tile.owner !== 'player') {
            newlyFlippedCount += 1;
          }
          tile.owner = 'player';
          tile.burstFlash = true;
        }
      }

      var bonusPoints = 80;
      state.score += bonusPoints;
      state.combo += 1;
      state.rainbowBursts += 1;
      state.bannerText = '🌟 무지개 몬스터볼 십자(+) 폭발! ' + hero.nameKr + ' 파워! (+80점 보너스!)';

      safeHelpers.playCry();
      safeHelpers.playSfx('win');
      render();

      addTimeout(function () {
        for (var k = 0; k < state.tiles.length; k++) {
          state.tiles[k].burstFlash = false;
        }
      }, 450);

      var counts = countOwners(state.tiles);
      return {
        centerIndex: idx,
        affectedIndices: affectedIndices,
        newlyFlippedCount: newlyFlippedCount,
        bonusPoints: bonusPoints,
        totalScore: state.score,
        playerCount: counts.playerCount,
        rivalCount: counts.rivalCount
      };
    }

    /**
     * 타일 1장 뒤집기 (로켓단 타일 -> 내 포켓몬 타일, 장당 +15점 + 연속 콤보 보너스)
     */
    function flipTile(tileIndex, options) {
      if (state.cleanedUp || state.finished) {
        return { flipped: false, pointsEarned: 0, totalScore: state.score };
      }

      var idx = Number(tileIndex);
      var tile = state.tiles[idx];
      if (!tile) {
        return { flipped: false, pointsEarned: 0, totalScore: state.score };
      }

      var opts = options || {};

      // 무지개 몬스터볼이 있는 타일이면 십자 필살기 발동!
      if (tile.hasRainbow) {
        var burstRes = triggerRainbowBurst(idx);
        return {
          flipped: true,
          rainbowBurst: true,
          affectedIndices: burstRes.affectedIndices,
          pointsEarned: burstRes.bonusPoints,
          totalScore: state.score,
          playerCount: burstRes.playerCount,
          rivalCount: burstRes.rivalCount
        };
      }

      // 스와이프 중 이미 내 타일인 경우는 중복 점수 없이 통과
      if (tile.owner === 'player' && opts.fromSwipe) {
        return {
          flipped: false,
          pointsEarned: 0,
          totalScore: state.score
        };
      }

      tile.owner = 'player';
      state.combo += 1;

      var basePoints = 15;
      var comboBonus = state.combo >= 3 ? 5 : 0;
      var earned = basePoints + comboBonus;
      state.score += earned;

      safeHelpers.playSfx('pop', state.combo);
      if (comboBonus > 0) {
        state.bannerText = '⚡ 후다닥 ' + state.combo + '연속 뒤집기! (+' + earned + '점!)';
      } else {
        state.bannerText = '✨ 얍! ' + hero.nameKr + ' 카드로 뒤집었어요! (+' + earned + '점!)';
      }

      render();
      var counts = countOwners(state.tiles);
      return {
        flipped: true,
        rainbowBurst: false,
        index: idx,
        pointsEarned: earned,
        totalScore: state.score,
        playerCount: counts.playerCount,
        rivalCount: counts.rivalCount
      };
    }

    /**
     * 😼 로켓단 나옹 방해꾼 AI: 1.1초마다 타일 1개를 로켓단 타일로 뒤집음
     */
    function rivalFlip(targetIndex) {
      if (state.cleanedUp || state.finished) return null;

      var chosenIdx = -1;
      if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < TOTAL_TILES) {
        chosenIdx = targetIndex;
      } else {
        var playerCandidates = [];
        for (var i = 0; i < state.tiles.length; i++) {
          if (state.tiles[i].owner === 'player' && !state.tiles[i].hasRainbow) {
            playerCandidates.push(i);
          }
        }
        if (playerCandidates.length > 0) {
          chosenIdx = playerCandidates[Math.floor(Math.random() * playerCandidates.length)];
        } else {
          chosenIdx = Math.floor(Math.random() * TOTAL_TILES);
        }
      }

      var tile = state.tiles[chosenIdx];
      if (!tile) return null;

      tile.owner = 'rival';
      state.combo = 0;
      state.bannerText = '😼 로켓단 나옹이 카드를 뒤집으려 해요! 얼른 다시 뒤집자!';
      render();

      var counts = countOwners(state.tiles);
      return {
        index: chosenIdx,
        playerCount: counts.playerCount,
        rivalCount: counts.rivalCount
      };
    }

    /**
     * 5초마다 타일 하나에 🌟 무지개 몬스터볼 생성
     */
    function spawnRainbowBall(forcedIndex) {
      if (state.cleanedUp || state.finished) return -1;

      for (var i = 0; i < state.tiles.length; i++) {
        state.tiles[i].hasRainbow = false;
      }

      var idx = typeof forcedIndex === 'number' && forcedIndex >= 0 && forcedIndex < TOTAL_TILES
        ? forcedIndex
        : Math.floor(Math.random() * TOTAL_TILES);

      state.tiles[idx].hasRainbow = true;
      state.rainbowIndex = idx;
      state.bannerText = '🌟 무지개 몬스터볼 등장! 터치하면 십자(+)로 한꺼번에 변신해요!';
      safeHelpers.playSfx('collect', 4);
      render();
      return idx;
    }

    /**
     * 1초 타이머 진행
     */
    function stepSecond() {
      if (state.cleanedUp || state.finished) return state.timeLeft;
      state.timeLeft = Math.max(0, state.timeLeft - 1);
      if (state.timeLeft <= 5 && state.timeLeft > 0) {
        safeHelpers.playSfx('tick');
      }
      render();
      if (state.timeLeft <= 0) {
        finishGame();
      }
      return state.timeLeft;
    }

    /**
     * 대결 종료 및 승리/격려 판정
     */
    function finishGame() {
      if (state.cleanedUp || state.finished) {
        return {
          finished: true,
          isVictory: state.isVictory,
          outcome: state.outcome,
          score: state.score
        };
      }

      clearAllTimers();
      state.finished = true;

      var counts = countOwners(state.tiles);
      var isVictory = counts.playerCount > counts.rivalCount;
      var endBonus = isVictory ? 100 : 50;
      state.score += endBonus;
      state.isVictory = isVictory;
      state.outcome = isVictory ? 'win' : 'encourage';

      var resultMessage = isVictory
        ? '🎉 대승리! 로켓단을 물리쳤어요! (승리 보너스 +100점)'
        : '😊 아깝다! 그래도 정말 빨랐어요! (+50점 격려 보너스)';

      state.bannerText = resultMessage;
      render();

      var prevBest = safeHelpers.getHighScore('flipbattle');
      safeHelpers.saveHighScore('flipbattle', state.score);
      safeHelpers.rewardCharacter();
      safeHelpers.playCry();

      safeHelpers.showResultOverlay(stageEl, {
        gameId: 'flipbattle',
        title: isVictory ? '⚡ 판 뒤집기 대승리!' : '⚡ 판 뒤집기 대결 완료!',
        score: state.score,
        highScore: Math.max(prevBest, state.score),
        stars: isVictory ? 3 : 2,
        message: resultMessage,
        summary: resultMessage + ' (내 포켓몬 ' + counts.playerCount + '장 vs 로켓단 ' + counts.rivalCount + '장)'
      });

      return {
        finished: true,
        isVictory: isVictory,
        outcome: state.outcome,
        bonusPoints: endBonus,
        score: state.score,
        playerCount: counts.playerCount,
        rivalCount: counts.rivalCount,
        message: resultMessage
      };
    }

    // 초기 렌더링 및 주기 타이머 가동
    render();
    addInterval(stepSecond, 1000);
    addInterval(function () { rivalFlip(); }, RIVAL_INTERVAL_MS);
    addInterval(function () { spawnRainbowBall(); }, RAINBOW_SPAWN_MS);

    var gameInstance = {
      flipTile: flipTile,
      rivalFlip: rivalFlip,
      triggerRainbowBurst: triggerRainbowBurst,
      spawnRainbowBall: spawnRainbowBall,
      stepSecond: stepSecond,
      finishGame: finishGame,
      getState: function () {
        var counts = countOwners(state.tiles);
        return {
          gameId: state.gameId,
          timeLeft: state.timeLeft,
          maxTime: state.maxTime,
          score: state.score,
          combo: state.combo,
          playerCount: counts.playerCount,
          rivalCount: counts.rivalCount,
          rainbowIndex: state.rainbowIndex,
          rainbowBursts: state.rainbowBursts,
          finished: state.finished,
          isVictory: state.isVictory,
          outcome: state.outcome,
          bannerText: state.bannerText,
          tiles: state.tiles.map(function (t) {
            return {
              index: t.index,
              row: t.row,
              col: t.col,
              owner: t.owner,
              hasRainbow: t.hasRainbow
            };
          })
        };
      }
    };

    stageEl._flipBattleGame = gameInstance;

    return function cleanup() {
      if (state.cleanedUp) return;
      state.cleanedUp = true;
      clearAllTimers();
      if (stageEl._flipBattleGame === gameInstance) {
        stageEl._flipBattleGame = null;
      }
    };
  }

  var gameDef = {
    id: 'flipbattle',
    title: '후다닥! 판 뒤집기 대결!',
    subtitle: '로켓단보다 먼저 카드를 내 포켓몬으로 뒤집어요!',
    icon: '⚡',
    badgeColor: '#FF7043',
    themeColor: '#FF7043',
    RIVAL_META: RIVAL_META,
    getCrossIndices: getCrossIndices,
    mount: mountFlipBattleGame
  };

  global.PokeGameFlipBattle = gameDef;
  if (global.PokeMiniGames && typeof global.PokeMiniGames.register === 'function') {
    global.PokeMiniGames.register(gameDef.id, gameDef);
  }
})(typeof window !== 'undefined' ? window : globalThis);
