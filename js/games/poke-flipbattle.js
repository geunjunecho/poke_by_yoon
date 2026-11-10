/**
 * 포켓몬 미니게임 P6: 후다닥! 판 뒤집기 대결! (poke-flipbattle.js)
 * 6~7세 맞춤 운동회 스타일 4x4 스피드 판 뒤집기 대결 (내 포켓몬 vs 😼 로켓단 나옹)
 */
(function (global) {
  'use strict';

  var GRID_COLS = 4;
  var GRID_ROWS = 4;
  var TOTAL_TILES = GRID_COLS * GRID_ROWS; // 16장
  var TOTAL_ROUNDS = 5;
  var GAME_DURATION_SEC = 25;
  var NEXT_ROUND_DURATION_SEC = 15;
  var RIVAL_INTERVAL_MS = 1200;
  var RIVAL_INTERVALS_BY_ROUND = [1200, 980, 800, 650, 520];
  var RAINBOW_SPAWN_MS = 5000;

  function getRivalIntervalForRound(roundNum) {
    var idx = Math.max(0, Math.min(RIVAL_INTERVALS_BY_ROUND.length - 1, (Number(roundNum) || 1) - 1));
    return RIVAL_INTERVALS_BY_ROUND[idx];
  }

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

  var ALARM_CLOCK_SVG =
    '<svg class="poke-arcade-clock-svg" viewBox="0 0 64 64" width="46" height="46" aria-hidden="true">' +
      '<path d="M10 18 C6 12, 14 4, 22 10 L18 20 Z" fill="#FACC15" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M54 18 C58 12, 50 4, 42 10 L46 20 Z" fill="#FACC15" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<rect x="29" y="5" width="6" height="8" rx="3" fill="#EAB308" stroke="#FFFFFF" stroke-width="2"/>' +
      '<path d="M18 52 L13 59 M46 52 L51 59" stroke="#FACC15" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="32" cy="35" r="22" fill="#FACC15" stroke="#FFFFFF" stroke-width="3"/>' +
      '<circle cx="32" cy="35" r="17" fill="#FFFFFF" stroke="#EAB308" stroke-width="2"/>' +
      '<path d="M32 35 L32 24 M32 35 L25 40" stroke="#334155" stroke-width="2.8" stroke-linecap="round"/>' +
      '<circle cx="32" cy="35" r="2.6" fill="#334155"/>' +
    '</svg>';

  function buildFlipBattleMarkup(hero, state) {
    var counts = countOwners(state.tiles);
    var playerPct = Math.round((counts.playerCount / TOTAL_TILES) * 100);
    var rivalPct = 100 - playerPct;

    var tilesHtml = state.tiles.map(function (tile) {
      var isPlayer = tile.owner === 'player';
      var cls = 'poke-flipbattle-tile ' + (isPlayer ? 'is-player' : 'is-rival');
      if (tile.hasRainbow) cls += ' has-rainbow';
      if (tile.burstFlash) cls += ' is-burst-flash is-bursting';
      if (tile.tiltedFlip) cls += ' is-tilted-flip';

      return (
        '<button type="button" class="' + cls + '" data-role="flip-tile" data-tile-index="' + tile.index + '" ' +
          'data-owner="' + tile.owner + '" data-rainbow="' + (tile.hasRainbow ? 'true' : 'false') + '" ' +
          'style="--player-tile-color: ' + hero.typeColor + '; --rival-tile-color: ' + RIVAL_META.color + ';" ' +
          'aria-label="' + (isPlayer ? hero.nameKr + ' 카드' : '로켓단 나옹 카드') + '">' +
          '<span class="poke-flipbattle-rainbow-badge" data-role="rainbow-badge"' + (tile.hasRainbow ? '' : ' style="display: none;"') + '>🌟 무지개 몬스터볼</span>' +
          '<div class="poke-flipbattle-tile-inner">' +
            '<div class="poke-flipbattle-face poke-flipbattle-face-player">' +
              '<div class="poke-flipbattle-well poke-flipbattle-well-player">' +
                '<img class="poke-flipbattle-tile-img" src="' + hero.artworkUrl + '" alt="' + hero.nameKr + '" width="76" height="76" decoding="async" draggable="false" />' +
                '<span class="poke-flipbattle-tile-label">' + hero.typeEmoji + ' ' + hero.nameKr + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="poke-flipbattle-face poke-flipbattle-face-rival">' +
              '<div class="poke-flipbattle-well poke-flipbattle-well-rival">' +
                '<img class="poke-flipbattle-tile-img poke-flipbattle-rival-img" src="' + RIVAL_META.artworkUrl + '" alt="' + RIVAL_META.nameKr + '" width="76" height="76" decoding="async" draggable="false" />' +
                '<div class="poke-flipbattle-rival-emblem">' +
                  '<span class="poke-flipbattle-rival-r">R</span>' +
                  '<span class="poke-flipbattle-rival-icon">😼</span>' +
                '</div>' +
                '<span class="poke-flipbattle-tile-label">😼 로켓단</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</button>'
      );
    }).join('');

    var roundSlotsHtml = [];
    for (var rIdx = 1; rIdx <= TOTAL_ROUNDS; rIdx++) {
      var hist = state.roundHistory && state.roundHistory[rIdx - 1];
      var slotCls = 'poke-flipbattle-round-slot';
      var slotIcon = rIdx + 'R';
      if (hist) {
        slotCls += hist.won ? ' is-won' : ' is-lost';
        slotIcon = rIdx + 'R ' + (hist.won ? '🏆' : '💦');
      } else if (rIdx === state.round && !state.finished) {
        slotCls += ' is-current';
        slotIcon = rIdx + 'R 🔥';
      }
      roundSlotsHtml.push(
        '<span class="' + slotCls + '" data-round-slot="' + rIdx + '">' + slotIcon + '</span>'
      );
    }

    return (
      '<div class="poke-flipbattle-root" style="--hero-color: ' + hero.typeColor + ';">' +
        '<div class="poke-flipbattle-hud">' +
          '<div class="poke-flipbattle-hud-stat">' +
            '<div class="poke-flipbattle-hud-avatar">' +
              '<img src="' + hero.artworkUrl + '" alt="' + hero.nameKr + '" width="48" height="48" decoding="async" draggable="false" />' +
            '</div>' +
            '<span class="poke-flipbattle-big-num" data-role="hud-my-count-num">' + counts.playerCount + '</span>' +
          '</div>' +
          '<div class="poke-flipbattle-hud-clock">' +
            ALARM_CLOCK_SVG +
            '<span class="poke-flipbattle-big-num" data-role="hud-timer-num">' + state.timeLeft + '</span>' +
            '<span class="poke-flipbattle-timer-pill sr-only" data-role="timer-pill">⏱️ 남은 시간 ' + state.timeLeft + '초</span>' +
          '</div>' +
          '<div class="poke-flipbattle-hud-ribbon-group">' +
            '<span class="poke-flipbattle-round-wins-pill" data-role="round-wins-pill">🏆 5판 중 ' + state.roundWins + '승 (' + state.roundWins + '승 ' + state.roundLosses + '패)</span>' +
            '<span class="poke-flipbattle-speed-pill" data-role="rival-speed-pill">😼 로켓단 속도 Lv.' + state.round + '</span>' +
            '<span class="poke-flipbattle-score-pill" data-role="score-pill">점수 ' + state.score + '점</span>' +
            '<div class="poke-flipbattle-corner-ribbon">카드 뒤집기</div>' +
          '</div>' +
        '</div>' +
        '<div class="poke-flipbattle-series-bar" data-role="series-bar">' +
          roundSlotsHtml.join('') +
        '</div>' +
        '<div class="poke-flipbattle-subhud">' +
          '<div class="poke-flipbattle-banner" data-role="banner-text">' + state.bannerText + '</div>' +
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
      round: 1,
      maxRounds: TOTAL_ROUNDS,
      completedRounds: 0,
      roundWins: 0,
      roundLosses: 0,
      roundHistory: [],
      rivalIntervalMs: getRivalIntervalForRound(1),
      timeLeft: GAME_DURATION_SEC,
      maxTime: GAME_DURATION_SEC,
      score: 0,
      combo: 0,
      rainbowIndex: -1,
      rainbowBursts: 0,
      tiles: createInitialTiles(),
      isPointerDown: false,
      lastSwipedIndex: -1,
      lastSwipeFlipAt: 0,
      finished: false,
      cleanedUp: false,
      outcome: null,
      isVictory: false,
      bannerText: '🖐️ 1라운드 시작! 로켓단 카드를 터치하거나 쓱~ 문질러 뒤집어요!'
    };

    var intervals = [];
    var timeouts = [];
    var rivalIntervalId = null;
    var cachedTileEls = [];
    var cachedBadgeEls = [];

    function addInterval(fn, ms) {
      var id = setInterval(function () {
        if (!state.cleanedUp && !state.finished) fn();
      }, ms);
      intervals.push(id);
      return id;
    }

    function restartRivalTimer() {
      if (rivalIntervalId !== null) {
        clearInterval(rivalIntervalId);
        var idx = intervals.indexOf(rivalIntervalId);
        if (idx !== -1) intervals.splice(idx, 1);
        rivalIntervalId = null;
      }
      if (!state.cleanedUp && !state.finished) {
        rivalIntervalId = addInterval(function () { rivalFlip(); }, state.rivalIntervalMs);
      }
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

    function collectTileElements() {
      cachedTileEls = [];
      cachedBadgeEls = [];
      if (typeof stageEl.querySelectorAll === 'function') {
        var found = stageEl.querySelectorAll('[data-role="flip-tile"]');
        if (!found || found.length === 0) {
          found = stageEl.querySelectorAll('.poke-flipbattle-tile');
        }
        if (found && found.length) {
          for (var i = 0; i < found.length; i++) {
            var tileEl = found[i];
            cachedTileEls.push(tileEl);
            var badgeEl = null;
            if (tileEl && typeof tileEl.querySelector === 'function') {
              badgeEl = tileEl.querySelector('[data-role="rainbow-badge"]');
            }
            cachedBadgeEls.push(badgeEl);
          }
        }
      }
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
        boardEl.addEventListener('pointercancel', function () {
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
                  state.lastSwipeFlipAt = Date.now();
                  flipTile(idx, { fromSwipe: true });
                }
              }
            }
          }
        });
      }

      collectTileElements();
      for (var i = 0; i < cachedTileEls.length; i++) {
        (function (tileEl, fallbackIdx) {
          if (!tileEl || typeof tileEl.addEventListener !== 'function') return;
          function getIdx() {
            var attr = tileEl.getAttribute ? tileEl.getAttribute('data-tile-index') : null;
            return attr !== null ? Number(attr) : fallbackIdx;
          }
          tileEl.addEventListener('pointerdown', function () {
            state.isPointerDown = true;
            state.lastSwipedIndex = getIdx();
          });
          tileEl.addEventListener('click', function (e) {
            if (e && typeof e.preventDefault === 'function') e.preventDefault();
            var idx = getIdx();
            if (state.lastSwipeFlipAt && Date.now() - state.lastSwipeFlipAt < 180 && state.lastSwipedIndex === idx) {
              return;
            }
            flipTile(idx);
          });
          tileEl.addEventListener('pointerenter', function () {
            if (state.isPointerDown) {
              var idx = getIdx();
              state.lastSwipedIndex = idx;
              state.lastSwipeFlipAt = Date.now();
              flipTile(idx, { fromSwipe: true });
            }
          });
        })(cachedTileEls[i], i);
      }
    }

    /**
     * 16장 타일 보드는 마운트 시 딱 1회만 생성하여
     * 스와이프 중 DOM 파괴 현상과 이미지 깜빡임을 원천 차단합니다.
     */
    function mountBoardDOM() {
      if (state.cleanedUp) return;
      stageEl.innerHTML = buildFlipBattleMarkup(hero, state);
      bindBoardEvents();
      syncUI();
    }

    /**
     * 타일 뒤집기·타이머·세력 게이지·무지개 볼 상태는 인플레이스(In-Place)로만 갱신합니다.
     */
    function syncUI() {
      if (state.cleanedUp) return;
      var counts = countOwners(state.tiles);
      var playerPct = Math.round((counts.playerCount / TOTAL_TILES) * 100);
      var rivalPct = 100 - playerPct;

      var hudMyNumEl = queryRole('hud-my-count-num');
      if (hudMyNumEl) {
        hudMyNumEl.textContent = String(counts.playerCount);
      }

      var hudTimerNumEl = queryRole('hud-timer-num');
      if (hudTimerNumEl) {
        hudTimerNumEl.textContent = String(state.timeLeft);
      }

      var timerEl = queryRole('timer-pill');
      if (timerEl) {
        timerEl.textContent = '⏱️ 남은 시간 ' + state.timeLeft + '초';
      }

      var bannerEl = queryRole('banner-text');
      if (bannerEl) {
        bannerEl.textContent = state.bannerText;
      }

      var scoreEl = queryRole('score-pill');
      if (scoreEl) {
        scoreEl.textContent = '점수 ' + state.score + '점';
      }

      var winsEl = queryRole('round-wins-pill');
      if (winsEl) {
        winsEl.textContent = '🏆 5판 중 ' + state.roundWins + '승 (' + state.roundWins + '승 ' + state.roundLosses + '패)';
      }

      var speedEl = queryRole('rival-speed-pill');
      if (speedEl) {
        speedEl.textContent = '😼 로켓단 속도 Lv.' + state.round;
      }

      if (typeof stageEl.querySelectorAll === 'function') {
        var slotEls = stageEl.querySelectorAll('[data-round-slot]');
        if (slotEls && slotEls.length) {
          for (var sIdx = 0; sIdx < slotEls.length; sIdx++) {
            var slotEl = slotEls[sIdx];
            var rNum = Number(slotEl.getAttribute('data-round-slot')) || (sIdx + 1);
            var hist = state.roundHistory[rNum - 1];
            var sCls = 'poke-flipbattle-round-slot';
            var sTxt = rNum + 'R';
            if (hist) {
              sCls += hist.won ? ' is-won' : ' is-lost';
              sTxt = rNum + 'R ' + (hist.won ? '🏆' : '💦');
            } else if (rNum === state.round && !state.finished) {
              sCls += ' is-current';
              sTxt = rNum + 'R 🔥';
            }
            slotEl.className = sCls;
            slotEl.textContent = sTxt;
          }
        }
      }

      var myCountEl = queryRole('my-count-label');
      if (myCountEl) {
        myCountEl.textContent = hero.typeEmoji + ' 내 포켓몬 ' + counts.playerCount + '장';
      }

      var rivalCountEl = queryRole('rival-count-label');
      if (rivalCountEl) {
        rivalCountEl.textContent = '😼 로켓단 ' + counts.rivalCount + '장';
      }

      var fillPlayerEl = queryRole('tug-fill-player');
      if (fillPlayerEl && fillPlayerEl.style) {
        fillPlayerEl.style.width = playerPct + '%';
        fillPlayerEl.style.background = hero.typeColor;
      }

      var fillRivalEl = queryRole('tug-fill-rival');
      if (fillRivalEl && fillRivalEl.style) {
        fillRivalEl.style.width = rivalPct + '%';
      }

      if (cachedTileEls.length !== state.tiles.length) {
        collectTileElements();
      }

      for (var i = 0; i < state.tiles.length; i++) {
        var tile = state.tiles[i];
        var tileEl = cachedTileEls[i];
        if (!tileEl) continue;

        var isPlayer = tile.owner === 'player';
        var cls = 'poke-flipbattle-tile ' + (isPlayer ? 'is-player' : 'is-rival');
        if (tile.hasRainbow) cls += ' has-rainbow';
        if (tile.burstFlash) cls += ' is-burst-flash is-bursting';
        if (tile.tiltedFlip) cls += ' is-tilted-flip';

        tileEl.className = cls;
        if (typeof tileEl.setAttribute === 'function') {
          tileEl.setAttribute('data-owner', tile.owner);
          tileEl.setAttribute('data-rainbow', tile.hasRainbow ? 'true' : 'false');
          tileEl.setAttribute('aria-label', isPlayer ? hero.nameKr + ' 카드' : '로켓단 나옹 카드');
        }

        var badgeEl = cachedBadgeEls[i];
        if (!badgeEl && typeof tileEl.querySelector === 'function') {
          badgeEl = tileEl.querySelector('[data-role="rainbow-badge"]');
          cachedBadgeEls[i] = badgeEl;
        }
        if (badgeEl && badgeEl.style) {
          badgeEl.style.display = tile.hasRainbow ? '' : 'none';
        }
      }
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
      syncUI();

      addTimeout(function () {
        for (var k = 0; k < state.tiles.length; k++) {
          state.tiles[k].burstFlash = false;
        }
        syncUI();
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

      for (var t = 0; t < state.tiles.length; t++) {
        state.tiles[t].tiltedFlip = (t === idx);
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

      syncUI();
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
      syncUI();

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
      syncUI();
      return idx;
    }

    /**
     * 현재 라운드 종료 및 다음 라운드(1R -> 5R, 로켓단 속도 가속) 전환
     */
    function completeRound() {
      if (state.cleanedUp || state.finished) {
        return finishGame();
      }

      if (state.round >= TOTAL_ROUNDS) {
        return finishGame();
      }

      var finishedRound = state.round;
      var counts = countOwners(state.tiles);
      var wonRound = counts.playerCount > counts.rivalCount;
      var roundBonus = wonRound ? 100 : 50;

      state.completedRounds += 1;
      if (wonRound) {
        state.roundWins += 1;
      } else {
        state.roundLosses += 1;
      }
      state.score += roundBonus;

      var roundEntry = {
        round: finishedRound,
        won: wonRound,
        playerCount: counts.playerCount,
        rivalCount: counts.rivalCount,
        bonusPoints: roundBonus,
        rivalIntervalMs: state.rivalIntervalMs
      };
      state.roundHistory.push(roundEntry);

      state.round = finishedRound + 1;
      state.rivalIntervalMs = getRivalIntervalForRound(state.round);
      state.timeLeft = NEXT_ROUND_DURATION_SEC;
      state.maxTime = NEXT_ROUND_DURATION_SEC;
      state.combo = 0;
      state.rainbowIndex = -1;
      state.tiles = createInitialTiles();

      state.bannerText = (wonRound ? '🏆 ' + finishedRound + '라운드 승리! (+100점) ' : '💪 ' + finishedRound + '라운드 아깝다! (+50점) ') +
        '🔥 ' + state.round + '라운드 시작! 로켓단 속도가 Lv.' + state.round + '로 빨라졌어요! (현재 ' + state.roundWins + '승 ' + state.roundLosses + '패)';

      safeHelpers.playSfx(wonRound ? 'win' : 'collect', state.round);
      restartRivalTimer();
      syncUI();

      return {
        finished: false,
        completedRound: finishedRound,
        wonRound: wonRound,
        bonusPoints: roundBonus,
        round: state.round,
        roundWins: state.roundWins,
        roundLosses: state.roundLosses,
        rivalIntervalMs: state.rivalIntervalMs,
        score: state.score
      };
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
      syncUI();
      if (state.timeLeft <= 0) {
        completeRound();
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
          score: state.score,
          roundWins: state.roundWins,
          roundLosses: state.roundLosses
        };
      }

      clearAllTimers();
      state.finished = true;

      var counts = countOwners(state.tiles);
      var currentRoundWin = counts.playerCount > counts.rivalCount;
      var endBonus = currentRoundWin ? 100 : 50;
      state.score += endBonus;
      state.completedRounds += 1;
      if (currentRoundWin) {
        state.roundWins += 1;
      } else {
        state.roundLosses += 1;
      }
      state.roundHistory.push({
        round: state.round,
        won: currentRoundWin,
        playerCount: counts.playerCount,
        rivalCount: counts.rivalCount,
        bonusPoints: endBonus,
        rivalIntervalMs: state.rivalIntervalMs
      });

      var isSeriesVictory = state.roundWins > state.roundLosses || (state.completedRounds === 1 && currentRoundWin);
      state.isVictory = isSeriesVictory;
      state.outcome = isSeriesVictory ? 'win' : 'encourage';

      var seriesRecordText = TOTAL_ROUNDS + '판 중 ' + state.roundWins + '번 승리! (' + state.roundWins + '승 ' + state.roundLosses + '패)';
      var resultMessage = isSeriesVictory
        ? '🎉 대승리! ' + seriesRecordText + ' 로켓단을 물리쳤어요! (승리 보너스 +' + endBonus + '점)'
        : '😊 아깝다! ' + seriesRecordText + ' 그래도 정말 빨랐어요! (+' + endBonus + '점 격려 보너스)';

      state.bannerText = resultMessage;
      syncUI();

      var prevBest = safeHelpers.getHighScore('flipbattle');
      safeHelpers.saveHighScore('flipbattle', state.score);
      safeHelpers.rewardCharacter();
      safeHelpers.playCry();

      safeHelpers.showResultOverlay(stageEl, {
        gameId: 'flipbattle',
        title: isSeriesVictory ? '⚡ 판 뒤집기 ' + state.roundWins + '승 대승리!' : '⚡ 판 뒤집기 5판 대결 완료!',
        score: state.score,
        highScore: Math.max(prevBest, state.score),
        stars: isSeriesVictory ? 3 : 2,
        message: resultMessage,
        summary: resultMessage + ' (마지막 판: 내 포켓몬 ' + counts.playerCount + '장 vs 로켓단 ' + counts.rivalCount + '장)'
      });

      return {
        finished: true,
        isVictory: isSeriesVictory,
        outcome: state.outcome,
        bonusPoints: endBonus,
        score: state.score,
        round: state.round,
        maxRounds: state.maxRounds,
        roundWins: state.roundWins,
        roundLosses: state.roundLosses,
        roundHistory: state.roundHistory.slice(),
        playerCount: counts.playerCount,
        rivalCount: counts.rivalCount,
        message: resultMessage
      };
    }

    // 초기 1회 보드 DOM 마운트 및 주기 타이머 가동
    mountBoardDOM();
    addInterval(stepSecond, 1000);
    restartRivalTimer();
    addInterval(function () { spawnRainbowBall(); }, RAINBOW_SPAWN_MS);

    var gameInstance = {
      flipTile: flipTile,
      rivalFlip: rivalFlip,
      triggerRainbowBurst: triggerRainbowBurst,
      spawnRainbowBall: spawnRainbowBall,
      stepSecond: stepSecond,
      completeRound: completeRound,
      nextRound: completeRound,
      finishGame: finishGame,
      getState: function () {
        var counts = countOwners(state.tiles);
        return {
          gameId: state.gameId,
          round: state.round,
          maxRounds: state.maxRounds,
          completedRounds: state.completedRounds,
          roundWins: state.roundWins,
          roundLosses: state.roundLosses,
          roundHistory: state.roundHistory.slice(),
          rivalIntervalMs: state.rivalIntervalMs,
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
    subtitle: '5판 3선승! 점점 빨라지는 로켓단을 이겨봐요!',
    icon: '⚡',
    badgeColor: '#FF7043',
    themeColor: '#FF7043',
    RIVAL_META: RIVAL_META,
    RIVAL_INTERVALS_BY_ROUND: RIVAL_INTERVALS_BY_ROUND,
    getRivalIntervalForRound: getRivalIntervalForRound,
    getCrossIndices: getCrossIndices,
    mount: mountFlipBattleGame
  };

  global.PokeGameFlipBattle = gameDef;
  if (global.PokeMiniGames && typeof global.PokeMiniGames.register === 'function') {
    global.PokeMiniGames.register(gameDef.id, gameDef);
  }
})(typeof window !== 'undefined' ? window : globalThis);
