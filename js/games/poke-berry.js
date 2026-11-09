/**
 * 포켓몬 도감 미니게임 P2: 가랏! 속성 열매 받아먹기 (poke-berry.js)
 * - 6~7세 눈높이 맞춤 열매 캐치 + 실시간 진화 변신 시스템 (진화 게이지 10칸 달성 시 다음 진화 단계로 변신)
 * - 최종 진화/단일 포켓몬은 황금 오라 "🌟 슈퍼 메가 파워업! (점수 2배!)" 모드로 변신
 */
(function (global) {
  'use strict';

  var NORMAL_BERRIES = ['🍎', '🍊', '🍇', '🍓'];
  var EVOLUTION_TARGET = 10;

  function createSafeHelpers(helpers) {
    var h = helpers || {};
    return {
      playSfx: function (type, noteIdx) {
        if (typeof h.playSfx === 'function') h.playSfx(type, noteIdx);
      },
      playCry: function () {
        if (typeof h.playCry === 'function') h.playCry();
      },
      getHighScore: function (gameId) {
        if (typeof h.getHighScore === 'function') return Number(h.getHighScore(gameId)) || 0;
        return 0;
      },
      saveHighScore: function (gameId, score) {
        if (typeof h.saveHighScore === 'function') return h.saveHighScore(gameId, score);
      },
      rewardCharacter: function () {
        if (typeof h.rewardCharacter === 'function') return h.rewardCharacter();
      },
      showResultOverlay: function (stageEl, opts) {
        if (typeof h.showResultOverlay === 'function') return h.showResultOverlay(stageEl, opts);
      }
    };
  }

  function injectBerryStyles() {
    if (typeof document === 'undefined' || !document.head) return;
    if (document.getElementById('poke-berry-styles')) return;
    var style = document.createElement('style');
    style.id = 'poke-berry-styles';
    style.textContent = [
      '.poke-berry-wrap {',
      '  position: relative; width: 100%; height: 100%; min-height: 360px;',
      '  display: flex; flex-direction: column; justify-content: space-between;',
      '  background: linear-gradient(180deg, #fff9c4 0%, #c8e6c9 68%, #81c784 100%);',
      '  border-radius: 18px; overflow: hidden; user-select: none; -webkit-user-select: none;',
      '  font-family: "Noto Sans KR", "Outfit", sans-serif;',
      '}',
      '.poke-berry-hud {',
      '  position: relative; z-index: 5; display: flex; flex-direction: column; gap: 6px;',
      '  padding: 8px 14px; background: rgba(255,255,255,0.9); backdrop-filter: blur(6px);',
      '  border-bottom: 3px solid rgba(0,0,0,0.08); font-weight: 900;',
      '}',
      '.poke-berry-hud-top {',
      '  display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;',
      '}',
      '.poke-berry-hearts { font-size: 1.3rem; letter-spacing: 3px; }',
      '.poke-berry-score-group { display: flex; align-items: center; gap: 8px; }',
      '.poke-berry-score-pill {',
      '  background: #e8f5e9; border: 2px solid #66bb6a; border-radius: 999px; padding: 3px 12px; color: #1b5e20;',
      '}',
      '.poke-berry-name-pill {',
      '  background: #fff3e0; border: 2px solid #ffb74d; border-radius: 999px; padding: 3px 10px; color: #e65100; font-size: 0.9rem;',
      '}',
      '.poke-berry-gauge-row {',
      '  display: flex; align-items: center; gap: 10px; font-size: 0.88rem; color: #2e7d32;',
      '}',
      '.poke-berry-gauge-label { white-space: nowrap; font-weight: 900; }',
      '.poke-berry-gauge-track {',
      '  flex: 1; height: 14px; background: #e0e0e0; border-radius: 999px; overflow: hidden;',
      '  border: 2px solid rgba(0,0,0,0.1);',
      '}',
      '.poke-berry-gauge-fill {',
      '  height: 100%; width: 0%; background: linear-gradient(90deg, #ffca28 0%, #ff7043 55%, #ab47bc 100%);',
      '  border-radius: 999px; transition: width 0.2s ease;',
      '}',
      '.poke-berry-stage-area {',
      '  position: relative; flex: 1; width: 100%; min-height: 210px; overflow: hidden; touch-action: none;',
      '}',
      '.poke-berry-canvas {',
      '  position: absolute; inset: 0; width: 100%; height: 100%; display: block;',
      '}',
      '.poke-berry-hero {',
      '  position: absolute; bottom: 18px; width: 82px; height: 82px;',
      '  transform: translateX(-50%); z-index: 3; pointer-events: none;',
      '  display: flex; align-items: center; justify-content: center;',
      '  transition: filter 0.2s ease;',
      '}',
      '.poke-berry-hero.mega-aura {',
      '  filter: drop-shadow(0 0 14px #ffd600) drop-shadow(0 0 24px #ffab00);',
      '}',
      '.poke-berry-hero-img {',
      '  width: 76px; height: 76px; object-fit: contain; transform-origin: center bottom;',
      '  transition: transform 0.1s ease;',
      '}',
      '.poke-berry-evo-banner {',
      '  position: absolute; top: 12px; left: 50%; transform: translateX(-50%); z-index: 6;',
      '  max-width: 92%; text-align: center; background: linear-gradient(90deg, #fff8e1, #ffe082, #fff8e1);',
      '  border: 3px solid #ffa000; border-radius: 16px; padding: 8px 14px;',
      '  font-weight: 900; font-size: 0.92rem; color: #bf360c;',
      '  box-shadow: 0 8px 20px rgba(0,0,0,0.22); opacity: 0; pointer-events: none;',
      '  transition: opacity 0.2s ease;',
      '}',
      '.poke-berry-evo-banner.visible { opacity: 1; }',
      '.poke-berry-controls {',
      '  position: relative; z-index: 5; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;',
      '  padding: 10px 14px 14px; background: rgba(255,255,255,0.92); border-top: 3px solid rgba(0,0,0,0.08);',
      '}',
      '.poke-berry-btn {',
      '  appearance: none; border: none; border-radius: 16px; padding: 14px 10px;',
      '  font-size: 1.15rem; font-weight: 900; color: #fff; cursor: pointer;',
      '  display: flex; align-items: center; justify-content: center; gap: 6px;',
      '  box-shadow: 0 6px 0 rgba(0,0,0,0.22); touch-action: manipulation;',
      '}',
      '.poke-berry-btn:active { transform: translateY(4px); box-shadow: 0 2px 0 rgba(0,0,0,0.22); }',
      '.poke-berry-btn-left { background: linear-gradient(180deg, #66bb6a 0%, #388e3c 100%); }',
      '.poke-berry-btn-right { background: linear-gradient(180deg, #42a5f5 0%, #1976d2 100%); }'
    ].join('\n');
    document.head.appendChild(style);
  }

  function resolveStageSprite(stage, fallbackUrl) {
    if (!stage) return fallbackUrl || '';
    return (
      stage.runnerSpriteUrl ||
      stage.artworkUrl ||
      stage.spriteUrl ||
      stage.sprite_url ||
      (stage.id
        ? 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/' +
          stage.id +
          '.png'
        : fallbackUrl || '')
    );
  }

  function resolveStageName(stage, fallbackName) {
    if (!stage) return fallbackName || '포켓몬';
    return stage.nameKr || stage.name_kr || stage.name || fallbackName || '포켓몬';
  }

  function mountBerryGame(stageEl, charCtx, rawHelpers) {
    if (!stageEl) return function () {};
    injectBerryStyles();

    var helpers = createSafeHelpers(rawHelpers);
    var ctxData = Object.assign(
      {
        id: 1,
        nameKr: '이상해씨',
        nameEn: 'bulbasaur',
        artworkUrl:
          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png',
        spriteUrl:
          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
        runnerSpriteUrl:
          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/1.gif',
        primaryType: 'grass',
        typeNameKr: '풀',
        typeColor: '#66BB6A',
        typeEmoji: '🌿',
        evolutionChain: []
      },
      charCtx || {}
    );

    var evoChain = Array.isArray(ctxData.evolutionChain)
      ? ctxData.evolutionChain.slice()
      : [];

    var stageIndex = 0;
    if (evoChain.length > 0) {
      var foundIdx = -1;
      for (var idx = 0; idx < evoChain.length; idx++) {
        var entry = evoChain[idx];
        if (
          (entry && Number(entry.id) === Number(ctxData.id)) ||
          (entry && entry.nameKr && entry.nameKr === ctxData.nameKr) ||
          (entry && entry.name && entry.name === ctxData.nameEn)
        ) {
          foundIdx = idx;
          break;
        }
      }
      stageIndex = foundIdx >= 0 ? foundIdx : 0;
    }

    var initialStage = evoChain[stageIndex] || null;
    var currentId = (initialStage && initialStage.id) || ctxData.id;
    var currentNameKr = resolveStageName(initialStage, ctxData.nameKr);
    var currentSpriteUrl =
      ctxData.runnerSpriteUrl ||
      ctxData.spriteUrl ||
      ctxData.artworkUrl ||
      resolveStageSprite(initialStage, '');

    var W = 520;
    var H = 260;
    var MOVE_STEP = 38;

    var lives = 3;
    var maxLives = 3;
    var score = 0;
    var highScore = helpers.getHighScore('berry');
    var evoGauge = 0;
    var evolutionCount = 0;
    var isMegaPower = false;
    var scoreMultiplier = 1;
    var evolutionBannerText = '';
    var bannerTimer = 0;

    var tick = 0;
    var running = true;
    var isGameOver = false;
    var rafId = null;

    var player = {
      x: W * 0.5,
      targetX: W * 0.5,
      y: H - 42,
      radius: 36,
      chompTimer: 0,
      invincibleTimer: 0,
      moveLeftHeld: false,
      moveRightHeld: false
    };

    var items = [];
    var popups = [];
    var sparkles = [];
    var nextSpawnIn = 28;

    // DOM 구성
    stageEl.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'poke-berry-wrap';

    var hud = document.createElement('div');
    hud.className = 'poke-berry-hud';

    var hudTop = document.createElement('div');
    hudTop.className = 'poke-berry-hud-top';

    var heartsEl = document.createElement('div');
    heartsEl.className = 'poke-berry-hearts';

    var scoreGroup = document.createElement('div');
    scoreGroup.className = 'poke-berry-score-group';

    var namePill = document.createElement('span');
    namePill.className = 'poke-berry-name-pill';

    var scorePill = document.createElement('span');
    scorePill.className = 'poke-berry-score-pill';

    scoreGroup.appendChild(namePill);
    scoreGroup.appendChild(scorePill);
    hudTop.appendChild(heartsEl);
    hudTop.appendChild(scoreGroup);

    var gaugeRow = document.createElement('div');
    gaugeRow.className = 'poke-berry-gauge-row';

    var gaugeLabel = document.createElement('span');
    gaugeLabel.className = 'poke-berry-gauge-label';

    var gaugeTrack = document.createElement('div');
    gaugeTrack.className = 'poke-berry-gauge-track';

    var gaugeFill = document.createElement('div');
    gaugeFill.className = 'poke-berry-gauge-fill';

    gaugeTrack.appendChild(gaugeFill);
    gaugeRow.appendChild(gaugeLabel);
    gaugeRow.appendChild(gaugeTrack);

    hud.appendChild(hudTop);
    hud.appendChild(gaugeRow);

    var stageArea = document.createElement('div');
    stageArea.className = 'poke-berry-stage-area';

    var canvas = document.createElement('canvas');
    canvas.className = 'poke-berry-canvas';
    canvas.width = W;
    canvas.height = H;

    var evoBanner = document.createElement('div');
    evoBanner.className = 'poke-berry-evo-banner';

    var heroEl = document.createElement('div');
    heroEl.className = 'poke-berry-hero';

    var heroImg = document.createElement('img');
    heroImg.className = 'poke-berry-hero-img';
    heroImg.src = currentSpriteUrl;
    heroImg.alt = currentNameKr;

    heroEl.appendChild(heroImg);
    stageArea.appendChild(canvas);
    stageArea.appendChild(evoBanner);
    stageArea.appendChild(heroEl);

    var controls = document.createElement('div');
    controls.className = 'poke-berry-controls';

    var leftBtn = document.createElement('button');
    leftBtn.type = 'button';
    leftBtn.className = 'poke-berry-btn poke-berry-btn-left';
    leftBtn.textContent = '◀ 왼쪽으로';

    var rightBtn = document.createElement('button');
    rightBtn.type = 'button';
    rightBtn.className = 'poke-berry-btn poke-berry-btn-right';
    rightBtn.textContent = '오른쪽으로 ▶';

    controls.appendChild(leftBtn);
    controls.appendChild(rightBtn);

    wrap.appendChild(hud);
    wrap.appendChild(stageArea);
    wrap.appendChild(controls);
    stageEl.appendChild(wrap);

    var gCtx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;

    function updateHud() {
      var fullHearts = Math.max(0, Math.min(maxLives, lives));
      var emptyHearts = Math.max(0, maxLives - fullHearts);
      heartsEl.textContent = '❤️'.repeat(fullHearts) + '🖤'.repeat(emptyHearts);
      namePill.textContent = (isMegaPower ? '🌟 ' : '🐾 ') + currentNameKr;
      scorePill.textContent =
        '🍎 ' + score + '점' + (scoreMultiplier > 1 ? ' (x2!)' : '');
      var clampedGauge = Math.max(0, Math.min(EVOLUTION_TARGET, evoGauge));
      gaugeLabel.textContent =
        '[진화 게이지: ' + clampedGauge + ' / ' + EVOLUTION_TARGET + ']';
      gaugeFill.style.width =
        Math.min(100, Math.round((clampedGauge / EVOLUTION_TARGET) * 100)) + '%';
    }

    function syncHeroDom() {
      var pct = Math.max(8, Math.min(92, (player.x / W) * 100));
      heroEl.style.left = pct.toFixed(2) + '%';

      var scaleX = 1;
      var scaleY = 1;
      if (player.chompTimer > 0) {
        // 받아먹을 때마다 입을 벌리듯 통통 커졌다 줄어드는 탄성 모션
        var phase = player.chompTimer / 16;
        scaleX = 1 + Math.sin(phase * Math.PI) * 0.28;
        scaleY = 1 + Math.cos(phase * Math.PI * 0.5) * 0.24;
      }
      heroImg.style.transform =
        'scale(' + scaleX.toFixed(2) + ', ' + scaleY.toFixed(2) + ')';
      heroImg.style.opacity =
        player.invincibleTimer > 0 && tick % 6 < 3 ? '0.45' : '1';
    }

    function showEvolutionBanner(text, frames) {
      evolutionBannerText = text;
      bannerTimer = frames || 120;
      evoBanner.textContent = text;
      evoBanner.classList.add('visible');
    }

    function triggerEvolutionOrPowerup() {
      evolutionCount += 1;

      if (evoChain.length > 0 && stageIndex + 1 < evoChain.length) {
        var prevName = currentNameKr;
        stageIndex += 1;
        var nextStage = evoChain[stageIndex];
        currentId = (nextStage && nextStage.id) || currentId;
        currentNameKr = resolveStageName(nextStage, currentNameKr);
        currentSpriteUrl = resolveStageSprite(nextStage, currentSpriteUrl);

        heroImg.src = currentSpriteUrl;
        heroImg.alt = currentNameKr;

        var msg =
          '✨ 오잉?! ' +
          prevName +
          '의 상태가...? 축하합니다! ' +
          currentNameKr +
          '(으)로 진화했어요! ✨';
        showEvolutionBanner(msg, 130);
      } else {
        isMegaPower = true;
        scoreMultiplier = 2;
        heroEl.classList.add('mega-aura');
        showEvolutionBanner('🌟 슈퍼 메가 파워업! (점수 2배!)', 130);
      }

      // 진화/파워업 축하 이펙트 파티클
      for (var i = 0; i < 16; i++) {
        var angle = (Math.PI * 2 * i) / 16;
        sparkles.push({
          x: player.x,
          y: player.y - 20,
          vx: Math.cos(angle) * (2.5 + Math.random() * 2.5),
          vy: Math.sin(angle) * (2.5 + Math.random() * 2.5),
          size: 5 + Math.random() * 4,
          color: i % 2 === 0 ? '#ffd600' : ctxData.typeColor || '#66bb6a',
          life: 32
        });
      }

      helpers.playSfx('evolve', evolutionCount);
      helpers.playCry();
      helpers.rewardCharacter();
      updateHud();
    }

    function normalizeItemKind(rawType) {
      if (!rawType) return 'berry';
      if (typeof rawType === 'object' && rawType.kind) return rawType.kind;
      if (typeof rawType === 'object' && rawType.type) return normalizeItemKind(rawType.type);
      var t = String(rawType).trim().toLowerCase();
      if (t === 'bomb' || t === '💣') return 'bomb';
      if (t === 'candy' || t === 'rainbow' || t === '🍬') return 'candy';
      if (
        t === 'special' ||
        t === 'orb' ||
        t === 'type' ||
        rawType === ctxData.typeEmoji
      ) {
        return 'special';
      }
      return 'berry';
    }

    function collectItem(rawType) {
      if (isGameOver) return getState();
      var kind = normalizeItemKind(rawType);

      if (kind === 'bomb') {
        if (player.invincibleTimer <= 0) {
          lives = Math.max(0, lives - 1);
          player.invincibleTimer = 72; // 1.2초 무적
          helpers.playSfx('hit');
          popups.push({
            x: player.x,
            y: player.y - 44,
            text: '앗! 찌릿 폭탄 💥',
            color: '#d32f2f',
            life: 40
          });
          updateHud();
          syncHeroDom();
          if (lives <= 0) {
            handleGameOver();
          }
        }
        return getState();
      }

      var basePts = kind === 'candy' ? 50 : kind === 'special' ? 30 : 10;
      var gaugeAdd = kind === 'candy' ? 3 : kind === 'special' ? 2 : 1;
      var earnedPts = basePts * scoreMultiplier;

      score += earnedPts;
      evoGauge += gaugeAdd;
      player.chompTimer = 16;

      if (kind === 'special') {
        helpers.playCry();
        helpers.playSfx('powerup', 2);
      } else if (kind === 'candy') {
        helpers.playSfx('powerup', 3);
      } else {
        helpers.playSfx('coin', 1);
      }

      popups.push({
        x: player.x,
        y: player.y - 42,
        text: '+' + earnedPts + '점!',
        color: kind === 'candy' ? '#8e24aa' : kind === 'special' ? '#f57f17' : '#2e7d32',
        life: 32
      });

      while (evoGauge >= EVOLUTION_TARGET) {
        evoGauge -= EVOLUTION_TARGET;
        triggerEvolutionOrPowerup();
      }

      updateHud();
      syncHeroDom();
      return getState();
    }

    function moveLeft(amount) {
      if (isGameOver) return player.x;
      var step = typeof amount === 'number' ? amount : MOVE_STEP;
      player.x = Math.max(36, player.x - step);
      player.targetX = player.x;
      syncHeroDom();
      return player.x;
    }

    function moveRight(amount) {
      if (isGameOver) return player.x;
      var step = typeof amount === 'number' ? amount : MOVE_STEP;
      player.x = Math.min(W - 36, player.x + step);
      player.targetX = player.x;
      syncHeroDom();
      return player.x;
    }

    function spawnFallingItem(forcedKind) {
      var roll = Math.random();
      var kind =
        forcedKind ||
        (roll < 0.16
          ? 'bomb'
          : roll < 0.28
          ? 'candy'
          : roll < 0.52
          ? 'special'
          : 'berry');
      var emoji =
        kind === 'bomb'
          ? '💣'
          : kind === 'candy'
          ? '🍬'
          : kind === 'special'
          ? ctxData.typeEmoji || '⚡'
          : NORMAL_BERRIES[Math.floor(Math.random() * NORMAL_BERRIES.length)];

      items.push({
        kind: kind,
        emoji: emoji,
        x: 42 + Math.random() * (W - 84),
        y: -24,
        vy: 2.3 + Math.random() * 1.4,
        radius: 20,
        swayOffset: Math.random() * Math.PI * 2
      });
    }

    function handleGameOver() {
      isGameOver = true;
      running = false;
      if (rafId !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      var prevBest = highScore;
      highScore = Math.max(highScore, score);
      helpers.saveHighScore('berry', score);
      if (score >= 80 || evolutionCount > 0) {
        helpers.rewardCharacter();
      }
      updateHud();
      helpers.showResultOverlay(stageEl, {
        gameId: 'berry',
        title: '열매 파티 완료! 🍎',
        score: score,
        highScore: highScore,
        isNewRecord: score > prevBest,
        message:
          evolutionCount > 0
            ? currentNameKr + '(으)로 멋지게 진화하며 열매를 듬뿍 먹었어요! ✨'
            : '맛있는 열매를 먹고 또 진화해볼까요?',
        onRetry: function () {
          resetGame();
        },
        onRestart: function () {
          resetGame();
        }
      });
    }

    function renderCanvas() {
      if (!gCtx) return;
      gCtx.clearRect(0, 0, W, H);

      // 배경 나무와 잔디
      gCtx.fillStyle = '#a5d6a7';
      gCtx.fillRect(0, H - 32, W, 32);

      // 낙하 아이템 렌더링
      gCtx.textAlign = 'center';
      gCtx.textBaseline = 'middle';
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.kind === 'special' || it.kind === 'candy') {
          gCtx.save();
          gCtx.fillStyle =
            it.kind === 'special'
              ? 'rgba(255, 235, 59, 0.45)'
              : 'rgba(206, 147, 216, 0.42)';
          gCtx.beginPath();
          gCtx.arc(it.x, it.y, 24, 0, Math.PI * 2);
          gCtx.fill();
          gCtx.restore();
        }
        gCtx.font = '30px sans-serif';
        gCtx.fillText(it.emoji, it.x, it.y);
      }

      // 반짝이 파티클
      for (var s = 0; s < sparkles.length; s++) {
        var sp = sparkles[s];
        gCtx.save();
        gCtx.fillStyle = sp.color;
        gCtx.beginPath();
        gCtx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        gCtx.fill();
        gCtx.restore();
      }

      // 점수 팝업
      for (var p = 0; p < popups.length; p++) {
        var pop = popups[p];
        gCtx.save();
        gCtx.fillStyle = pop.color;
        gCtx.font = 'bold 14px "Noto Sans KR", sans-serif';
        gCtx.fillText(pop.text, pop.x, pop.y);
        gCtx.restore();
      }
    }

    function stepFrame() {
      if (isGameOver) return getState();

      tick += 1;

      if (player.moveLeftHeld) {
        player.targetX = Math.max(36, player.targetX - 6.5);
      }
      if (player.moveRightHeld) {
        player.targetX = Math.min(W - 36, player.targetX + 6.5);
      }

      // 부드러운 좌우 추적
      player.x += (player.targetX - player.x) * 0.28;
      player.x = Math.max(36, Math.min(W - 36, player.x));

      if (player.chompTimer > 0) player.chompTimer -= 1;
      if (player.invincibleTimer > 0) player.invincibleTimer -= 1;

      if (bannerTimer > 0) {
        bannerTimer -= 1;
        if (bannerTimer === 0) {
          evoBanner.classList.remove('visible');
        }
      }

      nextSpawnIn -= 1;
      if (nextSpawnIn <= 0) {
        spawnFallingItem();
        nextSpawnIn = 28 + Math.floor(Math.random() * 20);
      }

      // 아이템 낙하 및 수집 판정
      for (var i = items.length - 1; i >= 0; i--) {
        var it = items[i];
        it.y += it.vy;
        it.x += Math.sin(tick * 0.06 + it.swayOffset) * 0.45;

        var dx = it.x - player.x;
        var dy = it.y - player.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= player.radius + it.radius) {
          var caughtKind = it.kind;
          items.splice(i, 1);
          collectItem(caughtKind);
          if (isGameOver) break;
          continue;
        }

        if (it.y > H + 30) {
          items.splice(i, 1);
        }
      }

      // 파티클 및 팝업 업데이트
      for (var s = sparkles.length - 1; s >= 0; s--) {
        var sp = sparkles[s];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.life -= 1;
        if (sp.life <= 0) sparkles.splice(s, 1);
      }

      for (var p = popups.length - 1; p >= 0; p--) {
        popups[p].y -= 0.85;
        popups[p].life -= 1;
        if (popups[p].life <= 0) popups.splice(p, 1);
      }

      syncHeroDom();
      renderCanvas();

      return getState();
    }

    function loop() {
      if (!running || isGameOver) return;
      stepFrame();
      if (running && !isGameOver && typeof requestAnimationFrame === 'function') {
        rafId = requestAnimationFrame(loop);
      }
    }

    function resetGame() {
      lives = 3;
      score = 0;
      evoGauge = 0;
      evolutionCount = 0;
      isMegaPower = false;
      scoreMultiplier = 1;
      stageIndex = 0;
      var firstStage = evoChain[0] || null;
      currentId = (firstStage && firstStage.id) || ctxData.id;
      currentNameKr = resolveStageName(firstStage, ctxData.nameKr);
      currentSpriteUrl =
        ctxData.runnerSpriteUrl ||
        ctxData.spriteUrl ||
        ctxData.artworkUrl ||
        resolveStageSprite(firstStage, '');
      heroImg.src = currentSpriteUrl;
      heroEl.classList.remove('mega-aura');
      evoBanner.classList.remove('visible');

      player.x = W * 0.5;
      player.targetX = W * 0.5;
      player.chompTimer = 0;
      player.invincibleTimer = 0;
      items.length = 0;
      popups.length = 0;
      sparkles.length = 0;
      isGameOver = false;
      running = true;

      updateHud();
      syncHeroDom();
      renderCanvas();

      if (rafId !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafId);
      }
      if (typeof requestAnimationFrame === 'function') {
        rafId = requestAnimationFrame(loop);
      }
    }

    function getState() {
      var activeStage = evoChain[stageIndex] || {
        id: currentId,
        nameKr: currentNameKr,
        spriteUrl: currentSpriteUrl
      };
      return {
        score: score,
        highScore: Math.max(highScore, score),
        lives: lives,
        maxLives: maxLives,
        evoGauge: evoGauge,
        gauge: evoGauge,
        evolutionGauge: evoGauge,
        evolutionTarget: EVOLUTION_TARGET,
        stageIndex: stageIndex,
        currentEvoIndex: stageIndex,
        evolutionCount: evolutionCount,
        currentStage: Object.assign({}, activeStage, {
          id: currentId,
          nameKr: currentNameKr,
          spriteUrl: currentSpriteUrl
        }),
        currentPokemon: {
          id: currentId,
          nameKr: currentNameKr,
          spriteUrl: currentSpriteUrl
        },
        id: currentId,
        pokemonId: currentId,
        nameKr: currentNameKr,
        spriteUrl: currentSpriteUrl,
        isMegaPower: isMegaPower,
        scoreMultiplier: scoreMultiplier,
        evolutionBannerText: evolutionBannerText,
        playerX: player.x,
        x: player.x,
        chompTimer: player.chompTimer,
        invincibleTimer: player.invincibleTimer,
        items: items.slice(),
        running: running,
        isGameOver: isGameOver,
        tick: tick
      };
    }

    // 입력 이벤트 핸들러
    function onLeftDown(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      player.moveLeftHeld = true;
      moveLeft();
    }

    function onLeftUp() {
      player.moveLeftHeld = false;
    }

    function onRightDown(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      player.moveRightHeld = true;
      moveRight();
    }

    function onRightUp() {
      player.moveRightHeld = false;
    }

    function onStagePointerMove(e) {
      if (!running || isGameOver) return;
      var clientX =
        e.clientX !== undefined
          ? e.clientX
          : e.touches && e.touches[0]
          ? e.touches[0].clientX
          : null;
      if (clientX === null) return;
      var rect =
        typeof stageArea.getBoundingClientRect === 'function'
          ? stageArea.getBoundingClientRect()
          : { left: 0, width: W };
      var relX = ((clientX - rect.left) / Math.max(1, rect.width)) * W;
      player.targetX = Math.max(36, Math.min(W - 36, relX));
    }

    function onKeyDown(e) {
      if (!running || isGameOver) return;
      var code = e.code || e.key;
      if (code === 'ArrowLeft') {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        player.moveLeftHeld = true;
        moveLeft();
      } else if (code === 'ArrowRight') {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        player.moveRightHeld = true;
        moveRight();
      }
    }

    function onKeyUp(e) {
      var code = e.code || e.key;
      if (code === 'ArrowLeft') player.moveLeftHeld = false;
      if (code === 'ArrowRight') player.moveRightHeld = false;
    }

    leftBtn.addEventListener('pointerdown', onLeftDown);
    leftBtn.addEventListener('pointerup', onLeftUp);
    leftBtn.addEventListener('click', onLeftDown);
    rightBtn.addEventListener('pointerdown', onRightDown);
    rightBtn.addEventListener('pointerup', onRightUp);
    rightBtn.addEventListener('click', onRightDown);
    stageArea.addEventListener('pointermove', onStagePointerMove);
    stageArea.addEventListener('touchmove', onStagePointerMove);

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
    }

    // 테스트 및 외부 제어 훅 노출
    stageEl._berryGame = {
      moveLeft: moveLeft,
      moveRight: moveRight,
      collectItem: collectItem,
      stepFrame: stepFrame,
      getState: getState,
      spawnFallingItem: spawnFallingItem,
      reset: resetGame
    };

    updateHud();
    syncHeroDom();
    renderCanvas();

    if (typeof requestAnimationFrame === 'function') {
      rafId = requestAnimationFrame(loop);
    }

    return function cleanup() {
      running = false;
      if (rafId !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      leftBtn.removeEventListener('pointerdown', onLeftDown);
      leftBtn.removeEventListener('pointerup', onLeftUp);
      leftBtn.removeEventListener('click', onLeftDown);
      rightBtn.removeEventListener('pointerdown', onRightDown);
      rightBtn.removeEventListener('pointerup', onRightUp);
      rightBtn.removeEventListener('click', onRightDown);
      stageArea.removeEventListener('pointermove', onStagePointerMove);
      stageArea.removeEventListener('touchmove', onStagePointerMove);
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      }
      stageEl._berryGame = null;
    };
  }

  var gameDef = {
    id: 'berry',
    title: '가랏! 속성 열매 받아먹기',
    subtitle: '맛있는 열매를 먹고 진화해보자!',
    icon: '🍎',
    badgeColor: '#4CAF50',
    mount: mountBerryGame
  };

  global.PokeGameBerry = gameDef;
  if (global.PokeMiniGames && typeof global.PokeMiniGames.register === 'function') {
    global.PokeMiniGames.register('berry', gameDef);
  }
})(typeof window !== 'undefined' ? window : globalThis);
