/**
 * 포켓몬 미니게임 P5: 포켓몬 카드 짝맞추기! (poke-memory.js)
 * 6~7세 맞춤 2스테이지(1스테이지 4쌍 8장, 2스테이지 6쌍 12장) 메모리 카드 뒤집기 놀이
 */
(function (global) {
  'use strict';

  var STAGE_CONFIGS = {
    1: { stage: 1, label: '1스테이지 (쉬움)', pairCount: 4, cols: 4, rows: 2, previewMs: 2500 },
    2: { stage: 2, label: '2스테이지 (신남)', pairCount: 6, cols: 4, rows: 3, previewMs: 2500 }
  };

  var PREVIEW_MS = 2500;
  var MISMATCH_CLOSE_MS = 800;
  var HINT_FLASH_MS = 1500;
  var STAGE_TRANSITION_MS = 1100;

  function artworkUrlById(id) {
    return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/' + id + '.png';
  }

  // 인기 포켓몬 10종 내장 폴백 풀
  var FALLBACK_POOL = [
    { id: 25,  nameKr: '피카츄',   artworkUrl: artworkUrlById(25)  },
    { id: 4,   nameKr: '파이리',   artworkUrl: artworkUrlById(4)   },
    { id: 7,   nameKr: '꼬부기',   artworkUrl: artworkUrlById(7)   },
    { id: 1,   nameKr: '이상해씨', artworkUrl: artworkUrlById(1)   },
    { id: 133, nameKr: '이브이',   artworkUrl: artworkUrlById(133) },
    { id: 151, nameKr: '뮤',       artworkUrl: artworkUrlById(151) },
    { id: 143, nameKr: '잠만보',   artworkUrl: artworkUrlById(143) },
    { id: 39,  nameKr: '푸린',     artworkUrl: artworkUrlById(39)  },
    { id: 6,   nameKr: '리자몽',   artworkUrl: artworkUrlById(6)   },
    { id: 658, nameKr: '개굴닌자', artworkUrl: artworkUrlById(658) }
  ];

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
    var fallbackMatch = null;
    for (var i = 0; i < FALLBACK_POOL.length; i++) {
      if (FALLBACK_POOL[i].id === id) {
        fallbackMatch = FALLBACK_POOL[i];
        break;
      }
    }
    var nameKr = c.nameKr || (fallbackMatch ? fallbackMatch.nameKr : '피카츄');
    var imgUrl = c.artworkUrl || c.runnerSpriteUrl || c.spriteUrl || artworkUrlById(id);

    return {
      id: id,
      nameKr: nameKr,
      artworkUrl: imgUrl,
      typeColor: c.typeColor || '#AB47BC',
      typeEmoji: c.typeEmoji || '🃏',
      evolutionChain: Array.isArray(c.evolutionChain) ? c.evolutionChain : []
    };
  }

  /**
   * 1순위: 내 주인공 포켓몬 (👑 내 파트너)
   * 2순위: charCtx.evolutionChain 진화 친구들
   * 3순위: 인기 포켓몬 폴백 풀에서 중복 없이 선택
   */
  function selectCardSpecies(hero, pairCount) {
    var selected = [];
    var usedIds = {};

    function addSpecies(id, nameKr, artworkUrl, isHero) {
      var numId = Number(id);
      if (!numId || usedIds[numId]) return false;
      usedIds[numId] = true;
      selected.push({
        pokemonId: numId,
        nameKr: nameKr || ('포켓몬 #' + numId),
        artworkUrl: artworkUrl || artworkUrlById(numId),
        isHero: Boolean(isHero)
      });
      return true;
    }

    // 1순위: 주인공 포켓몬
    addSpecies(hero.id, hero.nameKr, hero.artworkUrl, true);

    // 2순위: 진화 체인 포켓몬
    for (var i = 0; i < hero.evolutionChain.length && selected.length < pairCount; i++) {
      var evo = hero.evolutionChain[i];
      if (evo && evo.id) {
        var evoId = Number(evo.id);
        var evoImg = artworkUrlById(evoId) || evo.sprite_url || evo.spriteUrl;
        addSpecies(evoId, evo.nameKr || evo.name, evoImg, evoId === hero.id);
      }
    }

    // 3순위: 인기 포켓몬 폴백 풀
    for (var j = 0; j < FALLBACK_POOL.length && selected.length < pairCount; j++) {
      var fb = FALLBACK_POOL[j];
      addSpecies(fb.id, fb.nameKr, fb.artworkUrl, fb.id === hero.id);
    }

    return selected.slice(0, pairCount);
  }

  function shuffleArray(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function buildStageDeck(hero, stageNum) {
    var cfg = STAGE_CONFIGS[stageNum] || STAGE_CONFIGS[1];
    var speciesList = selectCardSpecies(hero, cfg.pairCount);
    var rawCards = [];

    for (var i = 0; i < speciesList.length; i++) {
      var sp = speciesList[i];
      for (var copyIdx = 0; copyIdx < 2; copyIdx++) {
        rawCards.push({
          pokemonId: sp.pokemonId,
          nameKr: sp.nameKr,
          artworkUrl: sp.artworkUrl,
          isHero: sp.isHero,
          copyIdx: copyIdx
        });
      }
    }

    var shuffled = shuffleArray(rawCards);
    return shuffled.map(function (item, idx) {
      return {
        index: idx,
        pokemonId: item.pokemonId,
        nameKr: item.nameKr,
        artworkUrl: item.artworkUrl,
        isHero: item.isHero,
        isFlipped: false,
        isMatched: false,
        isHinted: false
      };
    });
  }

  function buildMemoryMarkup(hero, state) {
    var cfg = STAGE_CONFIGS[state.stage] || STAGE_CONFIGS[1];
    var cardsHtml = state.cards.map(function (card) {
      var showFace = state.isPreviewing || card.isFlipped || card.isMatched || card.isHinted;
      var cls = 'poke-memory-card';
      if (showFace) cls += ' is-flipped';
      if (card.isMatched) cls += ' is-matched';
      if (card.isHinted) cls += ' is-hinted';
      if (card.isHero) cls += ' is-hero-card';

      return (
        '<button type="button" class="' + cls + '" data-role="memory-card" data-card-index="' + card.index + '" aria-label="' + (showFace ? card.nameKr : '뒤집힌 포켓몬 카드') + '">' +
          '<div class="poke-memory-card-inner">' +
            '<div class="poke-memory-card-back">' +
              '<div class="poke-memory-pokeball-emblem">' +
                '<div class="poke-memory-pokeball-top"></div>' +
                '<div class="poke-memory-pokeball-center"></div>' +
              '</div>' +
              '<span class="poke-memory-back-label">POKÉMON</span>' +
            '</div>' +
            '<div class="poke-memory-card-front">' +
              (card.isHero ? '<span class="poke-memory-hero-badge">👑 내 파트너</span>' : '') +
              '<img class="poke-memory-card-img" src="' + card.artworkUrl + '" alt="' + card.nameKr + '" />' +
              '<span class="poke-memory-card-name">' + card.nameKr + '</span>' +
            '</div>' +
          '</div>' +
        '</button>'
      );
    }).join('');

    return (
      '<div class="poke-memory-root" data-stage="' + state.stage + '">' +
        '<div class="poke-memory-hud">' +
          '<div class="poke-memory-hud-left">' +
            '<span class="poke-memory-stage-pill" data-role="stage-pill">🃏 ' + cfg.label + '</span>' +
            '<span class="poke-memory-pairs-pill" data-role="pairs-pill">짝꿍 ' + state.matchedPairs + ' / ' + state.totalPairs + '</span>' +
          '</div>' +
          '<div class="poke-memory-hud-right">' +
            '<button type="button" class="poke-memory-hint-btn" data-role="hint-btn">⚡ 도감 레이더 힌트!</button>' +
            (state.isPreviewing
              ? '<button type="button" class="poke-memory-skip-btn" data-role="skip-btn">👀 바로 시작!</button>'
              : '') +
            '<span class="poke-memory-score-pill" data-role="score-pill">점수 ' + state.score + '점</span>' +
          '</div>' +
        '</div>' +
        '<div class="poke-memory-banner" data-role="banner-text">' +
          (state.isPreviewing
            ? '👀 잘 보고 기억해봐요~! ✨ (2.5초 동안 앞면을 보여줘요)'
            : '🃏 카드를 터치해 ' + hero.nameKr + ' 친구와 짝꿍을 찾아봐요!') +
        '</div>' +
        '<div class="poke-memory-grid cols-' + cfg.cols + ' rows-' + cfg.rows + '" data-role="card-grid">' +
          cardsHtml +
        '</div>' +
      '</div>'
    );
  }

  function mountMemoryGame(stageEl, charCtx, helpers) {
    if (!stageEl) {
      return function noopCleanup() {};
    }

    var safeHelpers = createSafeHelpers(helpers);
    var hero = normalizeHeroPokemon(charCtx);

    var state = {
      gameId: 'memory',
      stage: 1,
      maxStage: 2,
      score: 0,
      streak: 0,
      matchedPairs: 0,
      totalPairs: STAGE_CONFIGS[1].pairCount,
      cards: buildStageDeck(hero, 1),
      flippedIndices: [],
      hintIndices: [],
      hintsUsed: 0,
      isPreviewing: true,
      mismatchPending: false,
      stageCleared: false,
      finished: false,
      cleanedUp: false,
      bannerText: '👀 잘 보고 기억해봐요~! ✨'
    };

    var timers = [];
    var previewTimerId = null;
    var mismatchTimerId = null;
    var hintTimerId = null;
    var stageTransitionTimerId = null;

    function addTimer(fn, delay) {
      var id = setTimeout(function () {
        var idx = timers.indexOf(id);
        if (idx !== -1) timers.splice(idx, 1);
        if (!state.cleanedUp) fn();
      }, delay);
      timers.push(id);
      return id;
    }

    function cancelTimer(id) {
      if (!id) return;
      clearTimeout(id);
      var idx = timers.indexOf(id);
      if (idx !== -1) timers.splice(idx, 1);
    }

    function clearAllTimers() {
      while (timers.length > 0) {
        clearTimeout(timers.pop());
      }
      previewTimerId = null;
      mismatchTimerId = null;
      hintTimerId = null;
      stageTransitionTimerId = null;
    }

    function queryRole(role) {
      if (typeof stageEl.querySelector === 'function') {
        return stageEl.querySelector('[data-role="' + role + '"]');
      }
      return null;
    }

    function bindEvents() {
      var hintBtn = queryRole('hint-btn');
      if (hintBtn && typeof hintBtn.addEventListener === 'function') {
        hintBtn.addEventListener('click', function (e) {
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          useHint();
        });
      }

      var skipBtn = queryRole('skip-btn');
      if (skipBtn && typeof skipBtn.addEventListener === 'function') {
        skipBtn.addEventListener('click', function (e) {
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          skipPreview();
        });
      }

      if (typeof stageEl.querySelectorAll === 'function') {
        var cardEls = stageEl.querySelectorAll('.poke-memory-card');
        if (!cardEls || cardEls.length === 0) {
          cardEls = stageEl.querySelectorAll('[data-role="memory-card"]');
        }
        for (var i = 0; i < (cardEls ? cardEls.length : 0); i++) {
          (function (cardEl, fallbackIdx) {
            if (cardEl && typeof cardEl.addEventListener === 'function') {
              cardEl.addEventListener('click', function (e) {
                if (e && typeof e.preventDefault === 'function') e.preventDefault();
                var attrIdx = cardEl.getAttribute ? cardEl.getAttribute('data-card-index') : null;
                var idx = attrIdx !== null ? Number(attrIdx) : fallbackIdx;
                flipCard(idx);
              });
            }
          })(cardEls[i], i);
        }
      }
    }

    function render() {
      if (state.cleanedUp) return;
      stageEl.innerHTML = buildMemoryMarkup(hero, state);
      var bannerEl = queryRole('banner-text');
      if (bannerEl && state.bannerText) {
        bannerEl.textContent = state.bannerText;
      }
      bindEvents();
    }

    function startPreviewWindow() {
      cancelTimer(previewTimerId);
      state.isPreviewing = true;
      state.bannerText = '👀 잘 보고 기억해봐요~! ✨';
      render();

      var cfg = STAGE_CONFIGS[state.stage] || STAGE_CONFIGS[1];
      previewTimerId = addTimer(function () {
        previewTimerId = null;
        if (state.isPreviewing && !state.finished) {
          state.isPreviewing = false;
          state.bannerText = '🃏 같은 포켓몬 카드 두 장을 찾아 뒤집어 보세요!';
          render();
        }
      }, cfg.previewMs);
    }

    /**
     * 라운드 시작 2.5초 미리보기를 즉시 종료하고 본 게임 시작
     */
    function skipPreview() {
      if (state.cleanedUp || state.finished) return false;
      cancelTimer(previewTimerId);
      previewTimerId = null;
      if (!state.isPreviewing) return false;
      state.isPreviewing = false;
      state.bannerText = '🃏 같은 포켓몬 카드 두 장을 찾아 뒤집어 보세요!';
      render();
      return true;
    }

    /**
     * 미매칭 짝 대기 상태가 있을 때 즉시 닫기 (빠른 연속 입력/테스트 호환)
     */
    function flushPendingMismatch() {
      if (!state.mismatchPending) return;
      cancelTimer(mismatchTimerId);
      mismatchTimerId = null;
      state.mismatchPending = false;
      for (var i = 0; i < state.flippedIndices.length; i++) {
        var idx = state.flippedIndices[i];
        if (state.cards[idx] && !state.cards[idx].isMatched) {
          state.cards[idx].isFlipped = false;
        }
      }
      state.flippedIndices = [];
    }

    /**
     * ⚡ 도감 레이더 힌트!
     * 아직 맞추지 못한 카드 한 쌍(내 파트너 포켓몬 우선)을 1.5초 동안 반짝이며 보여줌
     */
    function useHint() {
      if (state.cleanedUp || state.finished) return null;
      if (state.isPreviewing) {
        skipPreview();
      }
      flushPendingMismatch();

      // 아직 안 맞춘 카드들을 pokemonId별로 그룹화
      var groups = {};
      var heroGroup = null;
      var firstGroup = null;

      for (var i = 0; i < state.cards.length; i++) {
        var c = state.cards[i];
        if (!c.isMatched) {
          if (!groups[c.pokemonId]) {
            groups[c.pokemonId] = {
              pokemonId: c.pokemonId,
              nameKr: c.nameKr,
              isHero: c.isHero,
              indices: []
            };
          }
          groups[c.pokemonId].indices.push(c.index);
          if (c.isHero && groups[c.pokemonId].indices.length === 2) {
            heroGroup = groups[c.pokemonId];
          }
          if (!firstGroup && groups[c.pokemonId].indices.length === 2) {
            firstGroup = groups[c.pokemonId];
          }
        }
      }

      var target = heroGroup || firstGroup;
      if (!target) return null;

      cancelTimer(hintTimerId);
      for (var j = 0; j < state.cards.length; j++) {
        state.cards[j].isHinted = false;
      }

      target.indices.forEach(function (idx) {
        if (state.cards[idx]) {
          state.cards[idx].isHinted = true;
        }
      });

      state.hintIndices = target.indices.slice();
      state.hintsUsed += 1;
      state.bannerText = '⚡ 도감 레이더 작동! ' + target.nameKr + ' 짝꿍 위치가 반짝여요! ✨';
      safeHelpers.playSfx('collect', 5);
      render();

      hintTimerId = addTimer(function () {
        hintTimerId = null;
        for (var k = 0; k < state.cards.length; k++) {
          state.cards[k].isHinted = false;
        }
        state.hintIndices = [];
        if (!state.finished) {
          state.bannerText = '🃏 방금 반짝인 카드를 기억해서 뒤집어 보세요!';
          render();
        }
      }, HINT_FLASH_MS);

      return {
        pokemonId: target.pokemonId,
        nameKr: target.nameKr,
        isHero: target.isHero,
        indices: target.indices.slice()
      };
    }

    /**
     * 2스테이지로 전환
     */
    function nextStage() {
      if (state.cleanedUp || state.finished) return false;
      cancelTimer(stageTransitionTimerId);
      stageTransitionTimerId = null;

      state.stage = 2;
      state.stageCleared = false;
      state.matchedPairs = 0;
      state.totalPairs = STAGE_CONFIGS[2].pairCount;
      state.flippedIndices = [];
      state.hintIndices = [];
      state.mismatchPending = false;
      state.cards = buildStageDeck(hero, 2);

      safeHelpers.playSfx('win');
      startPreviewWindow();
      return true;
    }

    /**
     * 게임 클리어 처리 및 결과 오버레이 노출
     */
    function finishGame() {
      if (state.cleanedUp || state.finished) return state.score;
      clearAllTimers();
      state.finished = true;
      state.isPreviewing = false;
      state.bannerText = '🎉 모든 포켓몬 카드 짝꿍을 다 찾았어요! 최고예요!';
      render();

      var prevBest = safeHelpers.getHighScore('memory');
      safeHelpers.saveHighScore('memory', state.score);
      safeHelpers.rewardCharacter();
      safeHelpers.playCry();

      safeHelpers.showResultOverlay(stageEl, {
        gameId: 'memory',
        title: '🃏 포켓몬 카드 짝맞추기 완주!',
        score: state.score,
        highScore: Math.max(prevBest, state.score),
        stars: 3,
        summary: hero.nameKr + ' 파트너와 진화 친구들 카드를 모두 찾았어요!'
      });

      return state.score;
    }

    /**
     * 카드 1장 뒤집기
     */
    function flipCard(cardIndex) {
      if (state.cleanedUp || state.finished) {
        return { action: 'ignored', totalScore: state.score };
      }

      if (state.isPreviewing) {
        skipPreview();
      }

      if (state.mismatchPending) {
        flushPendingMismatch();
      }

      var idx = Number(cardIndex);
      var card = state.cards[idx];
      if (!card || card.isMatched || card.isFlipped) {
        return { action: 'ignored', totalScore: state.score };
      }

      card.isFlipped = true;
      card.isHinted = false;
      state.flippedIndices.push(idx);
      safeHelpers.playSfx('pop', state.flippedIndices.length);

      // 첫 번째 카드만 뒤집힌 상태
      if (state.flippedIndices.length === 1) {
        state.bannerText = '🔍 ' + card.nameKr + ' 카드를 찾았어요! 짝꿍은 어디 있을까?';
        render();
        return {
          action: 'flip',
          card: { index: card.index, pokemonId: card.pokemonId, nameKr: card.nameKr, isHero: card.isHero },
          matched: false,
          pointsEarned: 0,
          totalScore: state.score,
          stage: state.stage,
          matchedPairs: state.matchedPairs,
          totalPairs: state.totalPairs,
          stageCleared: false,
          finished: false
        };
      }

      // 두 번째 카드가 뒤집힌 상태 -> 짝 판정
      var firstIdx = state.flippedIndices[0];
      var secondIdx = state.flippedIndices[1];
      var firstCard = state.cards[firstIdx];
      var secondCard = state.cards[secondIdx];

      if (firstCard && secondCard && firstCard.pokemonId === secondCard.pokemonId) {
        // 짝 맞춤 성공!
        firstCard.isMatched = true;
        secondCard.isMatched = true;
        state.flippedIndices = [];
        state.matchedPairs += 1;
        state.streak += 1;

        var basePoints = 50;
        var comboBonus = state.streak >= 2 ? 20 : 0;
        var heroBonus = firstCard.isHero ? 100 : 0;
        var earned = basePoints + comboBonus + heroBonus;
        state.score += earned;

        safeHelpers.playSfx('collect', state.matchedPairs);
        if (firstCard.isHero) {
          safeHelpers.playCry();
          state.bannerText = '👑 내 파트너 ' + firstCard.nameKr + ' 짝맞추기 성공! (+' + earned + '점 보너스!)';
        } else if (comboBonus > 0) {
          state.bannerText = '✨ 짝짝짝! ' + firstCard.nameKr + ' 연속 성공! (+' + earned + '점!)';
        } else {
          state.bannerText = '🎉 딩동댕! ' + firstCard.nameKr + ' 짝꿍을 찾았어요! (+' + earned + '점!)';
        }

        var isStageDone = state.matchedPairs >= state.totalPairs;
        state.stageCleared = isStageDone;
        render();

        if (isStageDone) {
          if (state.stage < state.maxStage) {
            state.bannerText = '🌟 1스테이지 클리어! 더 신나는 2스테이지가 열려요!';
            render();
            stageTransitionTimerId = addTimer(function () {
              stageTransitionTimerId = null;
              if (!state.finished && state.stage === 1) {
                nextStage();
              }
            }, STAGE_TRANSITION_MS);
          } else {
            finishGame();
          }
        }

        return {
          action: 'match',
          card: { index: card.index, pokemonId: card.pokemonId, nameKr: card.nameKr, isHero: card.isHero },
          matched: true,
          isHeroMatch: Boolean(firstCard.isHero),
          pointsEarned: earned,
          totalScore: state.score,
          stage: state.stage,
          matchedPairs: state.matchedPairs,
          totalPairs: state.totalPairs,
          stageCleared: isStageDone,
          finished: state.finished
        };
      }

      // 틀렸을 때: 감점 제로, 0.8초간 얼굴을 보여준 뒤 닫힘
      state.streak = 0;
      state.mismatchPending = true;
      state.bannerText = '💖 아깝다~! ' + firstCard.nameKr + '랑 ' + secondCard.nameKr + ' 위치를 기억해 두자!';
      safeHelpers.playSfx('bounce', 1);
      render();

      mismatchTimerId = addTimer(function () {
        mismatchTimerId = null;
        flushPendingMismatch();
        if (!state.finished) {
          state.bannerText = '🃏 다시 한 번 짝꿍 카드를 찾아 뒤집어 보세요!';
          render();
        }
      }, MISMATCH_CLOSE_MS);

      return {
        action: 'mismatch',
        card: { index: card.index, pokemonId: card.pokemonId, nameKr: card.nameKr, isHero: card.isHero },
        matched: false,
        isHeroMatch: false,
        pointsEarned: 0,
        totalScore: state.score,
        stage: state.stage,
        matchedPairs: state.matchedPairs,
        totalPairs: state.totalPairs,
        stageCleared: false,
        finished: false
      };
    }

    // 1스테이지 미리보기 시작
    startPreviewWindow();

    var gameInstance = {
      skipPreview: skipPreview,
      flipCard: flipCard,
      useHint: useHint,
      nextStage: nextStage,
      finishGame: finishGame,
      getState: function () {
        return {
          gameId: state.gameId,
          stage: state.stage,
          maxStage: state.maxStage,
          score: state.score,
          streak: state.streak,
          matchedPairs: state.matchedPairs,
          totalPairs: state.totalPairs,
          isPreviewing: state.isPreviewing,
          mismatchPending: state.mismatchPending,
          hintsUsed: state.hintsUsed,
          hintIndices: state.hintIndices.slice(),
          flippedIndices: state.flippedIndices.slice(),
          stageCleared: state.stageCleared,
          finished: state.finished,
          bannerText: state.bannerText,
          cards: state.cards.map(function (c) {
            return {
              index: c.index,
              pokemonId: c.pokemonId,
              nameKr: c.nameKr,
              artworkUrl: c.artworkUrl,
              isHero: c.isHero,
              isFlipped: c.isFlipped,
              isMatched: c.isMatched,
              isHinted: c.isHinted
            };
          })
        };
      }
    };

    stageEl._memoryGame = gameInstance;

    return function cleanup() {
      if (state.cleanedUp) return;
      state.cleanedUp = true;
      clearAllTimers();
      if (stageEl._memoryGame === gameInstance) {
        stageEl._memoryGame = null;
      }
    };
  }

  var gameDef = {
    id: 'memory',
    title: '포켓몬 카드 짝맞추기!',
    subtitle: '카드를 뒤집어 내 포켓몬과 진화 친구들을 찾아요!',
    icon: '🃏',
    badgeColor: '#AB47BC',
    themeColor: '#AB47BC',
    FALLBACK_POOL: FALLBACK_POOL,
    STAGE_CONFIGS: STAGE_CONFIGS,
    mount: mountMemoryGame
  };

  global.PokeGameMemory = gameDef;
  if (global.PokeMiniGames && typeof global.PokeMiniGames.register === 'function') {
    global.PokeMiniGames.register(gameDef.id, gameDef);
  }
})(typeof window !== 'undefined' ? window : globalThis);
