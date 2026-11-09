/**
 * 포켓몬 도감 미니게임 P2: 가랏! 속성 열매 받아먹기 (poke-berry.js)
 * - 6~7세 눈높이 맞춤 열매 캐치 + 실시간 진화 변신 시스템 (진화 게이지 10칸 달성 시 다음 진화 단계로 변신)
 * - 최종 진화/단일 포켓몬은 황금 오라 "🌟 슈퍼 메가 파워업! (점수 2배!)" 모드로 변신
 * - 레트로 16비트 픽셀아트 플랫폼 월드 캔버스 렌더링 적용
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
      '  position: relative; max-width: 960px; width: 100%; height: 100%; min-height: 360px; margin: 0 auto;',
      '  display: flex; flex-direction: column; justify-content: space-between;',
      '  background: #48B8F8;',
      '  border-radius: 20px; border: 4px solid #181818; box-shadow: 0 12px 32px rgba(0,0,0,0.5);',
      '  overflow: hidden; user-select: none; -webkit-user-select: none; box-sizing: border-box;',
      '  font-family: "Noto Sans KR", "Outfit", sans-serif;',
      '}',
      '.poke-berry-hud {',
      '  position: relative; z-index: 5; display: flex; flex-direction: column; gap: 6px;',
      '  padding: 8px 16px; background: rgba(255,255,255,0.92); backdrop-filter: blur(8px);',
      '  border-bottom: 3px solid #181818; font-weight: 900;',
      '}',
      '.poke-berry-hud-top {',
      '  display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;',
      '}',
      '.poke-berry-hearts { font-size: 1.35rem; letter-spacing: 3px; }',
      '.poke-berry-score-group { display: flex; align-items: center; gap: 8px; }',
      '.poke-berry-score-pill {',
      '  background: #e8f5e9; border: 2px solid #181818; border-radius: 999px; padding: 3px 14px; color: #1b5e20;',
      '}',
      '.poke-berry-name-pill {',
      '  background: #fff3e0; border: 2px solid #181818; border-radius: 999px; padding: 3px 12px; color: #e65100; font-size: 0.92rem;',
      '}',
      '.poke-berry-gauge-row {',
      '  display: flex; align-items: center; gap: 10px; font-size: 0.9rem; color: #1b5e20;',
      '}',
      '.poke-berry-gauge-label { white-space: nowrap; font-weight: 900; }',
      '.poke-berry-gauge-track {',
      '  flex: 1; height: 14px; background: #e0e0e0; border-radius: 999px; overflow: hidden;',
      '  border: 2px solid #181818;',
      '}',
      '.poke-berry-gauge-fill {',
      '  height: 100%; width: 0%; background: linear-gradient(90deg, #ffca28 0%, #ff7043 55%, #ab47bc 100%);',
      '  border-radius: 999px; transition: width 0.2s ease;',
      '}',
      '.poke-berry-stage-area {',
      '  position: relative; flex: 1; width: 100%; min-height: 220px; overflow: hidden; touch-action: none; cursor: grab;',
      '}',
      '.poke-berry-stage-area:active { cursor: grabbing; }',
      '.poke-berry-canvas {',
      '  position: absolute; inset: 0; width: 100%; height: 100%; display: block;',
      '  image-rendering: pixelated; image-rendering: crisp-edges;',
      '}',
      '.poke-berry-hero {',
      '  position: absolute; bottom: 16.25%; width: 88px; height: 88px;',
      '  transform: translateX(-50%); z-index: 3; pointer-events: none;',
      '  display: flex; align-items: flex-end; justify-content: center;',
      '  transition: filter 0.2s ease;',
      '}',
      '.poke-berry-shadow {',
      '  position: absolute; bottom: -5px; left: 50%; width: 64px; height: 14px;',
      '  border-radius: 50%; background: radial-gradient(ellipse at center, rgba(0,0,0,0.46) 0%, rgba(0,0,0,0.16) 65%, transparent 100%);',
      '  transform: translateX(-50%); z-index: 1; pointer-events: none;',
      '}',
      '.poke-berry-aura {',
      '  position: absolute; inset: -10px; border-radius: 50%; z-index: 1; pointer-events: none; opacity: 0;',
      '  background: radial-gradient(circle, rgba(255,235,59,0.55) 0%, rgba(255,152,0,0.22) 55%, transparent 75%);',
      '  transition: opacity 0.25s ease;',
      '}',
      '.poke-berry-hero.evolved-aura .poke-berry-aura { opacity: 0.72; }',
      '.poke-berry-hero.mega-aura .poke-berry-aura {',
      '  opacity: 1;',
      '  background: radial-gradient(circle, rgba(255,214,0,0.8) 0%, rgba(255,109,0,0.38) 58%, transparent 78%);',
      '}',
      '.poke-berry-hero.mega-aura {',
      '  filter: drop-shadow(0 0 14px #ffd600) drop-shadow(0 0 24px #ffab00);',
      '}',
      '.poke-berry-hero-img {',
      '  position: relative; z-index: 2; width: 88px; height: 88px; object-fit: contain; transform-origin: center bottom;',
      '  image-rendering: pixelated; filter: drop-shadow(0 6px 8px rgba(0,0,0,0.36)); transition: transform 0.08s ease;',
      '}',
      '.poke-berry-evo-banner {',
      '  position: absolute; top: 18px; left: 50%; transform: translateX(-50%); z-index: 6;',
      '  max-width: 92%; text-align: center; background: linear-gradient(90deg, #fff8e1, #ffe082, #fff8e1);',
      '  border: 3px solid #181818; border-radius: 16px; padding: 8px 16px;',
      '  font-weight: 900; font-size: 0.94rem; color: #bf360c;',
      '  box-shadow: 0 6px 0 rgba(0,0,0,0.28); opacity: 0; pointer-events: none;',
      '  transition: opacity 0.2s ease;',
      '}',
      '.poke-berry-evo-banner.visible { opacity: 1; }',
      '.poke-berry-controls {',
      '  position: relative; z-index: 5; display: grid; grid-template-columns: 1fr 1fr; gap: 14px;',
      '  padding: 10px 16px 14px; background: rgba(255,255,255,0.95); border-top: 3px solid #181818;',
      '}',
      '.poke-berry-btn {',
      '  appearance: none; border: 3px solid #181818; border-radius: 16px; padding: 14px 10px;',
      '  font-size: 1.18rem; font-weight: 900; color: #fff; cursor: pointer;',
      '  display: flex; align-items: center; justify-content: center; gap: 6px;',
      '  box-shadow: 0 6px 0 #181818; touch-action: manipulation;',
      '}',
      '.poke-berry-btn:active { transform: translateY(4px); box-shadow: 0 2px 0 #181818; }',
      '.poke-berry-btn-left { background: linear-gradient(180deg, #66bb6a 0%, #388e3c 100%); }',
      '.poke-berry-btn-right { background: linear-gradient(180deg, #42a5f5 0%, #1976d2 100%); }'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ============================================================================
  // 16비트 픽셀아트 플랫폼 월드 렌더러 헬퍼
  // ============================================================================

  function drawPixelStarCross(ctx, cx, cy, color) {
    var x = Math.round(cx);
    var y = Math.round(cy);
    ctx.fillStyle = color;
    ctx.fillRect(x - 2, y - 6, 4, 12);
    ctx.fillRect(x - 6, y - 2, 12, 4);
    ctx.fillRect(x - 4, y - 4, 8, 8);
  }

  function drawPixelCloud(ctx, x, y, scale) {
    var s = scale || 1;
    var bx = Math.round(x);
    var by = Math.round(y);
    var u = Math.max(2, Math.round(4 * s));
    ctx.fillStyle = '#C8ECFF';
    ctx.fillRect(bx - u * 5, by + u * 2, u * 11, u * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(bx - u * 4, by, u * 9, u * 2);
    ctx.fillRect(bx - u * 3, by - u * 2, u * 6, u * 2);
    ctx.fillRect(bx - u, by - u * 3, u * 3, u);
  }

  function drawPixelSpikeDown(ctx, x, topY, w, h) {
    var bx = Math.round(x);
    var ty = Math.round(topY);
    var sw = w || 14;
    var sh = h || 16;
    ctx.fillStyle = '#181818';
    ctx.fillRect(bx, ty, sw, 4);
    ctx.fillRect(bx + 2, ty + 4, sw - 4, 4);
    ctx.fillRect(bx + 4, ty + 8, sw - 8, 4);
    ctx.fillRect(bx + 6, ty + 12, sw - 12, sh - 12);
    ctx.fillStyle = '#E8F0F8';
    ctx.fillRect(bx + 2, ty + 2, Math.floor((sw - 4) * 0.5), 2);
    ctx.fillRect(bx + 4, ty + 4, Math.floor((sw - 8) * 0.5), 4);
    ctx.fillStyle = '#788898';
    ctx.fillRect(bx + Math.floor(sw * 0.5), ty + 2, Math.floor((sw - 4) * 0.5), 2);
    ctx.fillRect(bx + Math.floor(sw * 0.5), ty + 4, Math.floor((sw - 8) * 0.5), 4);
  }

  function drawPixelTree(ctx, cx, baseY, scale) {
    var s = scale || 1;
    var x = Math.round(cx);
    var y = Math.round(baseY);
    var tw = Math.round(12 * s);
    var th = Math.round(16 * s);
    ctx.fillStyle = '#385848';
    ctx.fillRect(x - Math.floor(tw * 0.5) - 2, y - th, tw + 4, th);
    ctx.fillStyle = '#587860';
    ctx.fillRect(x - Math.floor(tw * 0.5), y - th, tw, th - 2);
    var r = Math.round(22 * s);
    ctx.fillStyle = '#389038';
    ctx.fillRect(x - r, y - th - Math.round(r * 0.9), r * 2, Math.round(r * 0.9));
    ctx.fillStyle = '#58B848';
    ctx.fillRect(x - r + 2, y - th - Math.round(r * 1.45), (r - 2) * 2, Math.round(r * 1.15));
    ctx.fillRect(x - Math.round(r * 0.75), y - th - Math.round(r * 1.75), Math.round(r * 1.5), Math.round(r * 0.4));
    ctx.fillStyle = '#88E060';
    ctx.fillRect(x - Math.round(r * 0.65), y - th - Math.round(r * 1.65), Math.round(r * 1.3), Math.round(6 * s));
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - Math.round(r * 0.45), y - th - Math.round(r * 1.1), 4, 4);
    ctx.fillRect(x + Math.round(r * 0.3), y - th - Math.round(r * 0.8), 4, 4);
  }

  function drawPixelGoalDoor(ctx, x, groundY) {
    var dx = Math.round(x);
    var dy = Math.round(groundY);
    var dw = 48;
    var dh = 58;
    var left = dx - dw * 0.5;
    var top = dy - dh;

    ctx.fillStyle = '#181818';
    ctx.fillRect(left - 3, top + 8, dw + 6, dh - 8);
    ctx.fillRect(left + 3, top + 3, dw - 6, 6);
    ctx.fillRect(left + 9, top, dw - 18, 4);

    ctx.fillStyle = '#FFE840';
    ctx.fillRect(left, top + 9, dw, dh - 9);
    ctx.fillRect(left + 5, top + 5, dw - 10, 5);
    ctx.fillRect(left + 11, top + 2, dw - 22, 4);

    ctx.fillStyle = '#F84858';
    ctx.fillRect(left + 5, top + 12, dw - 10, dh - 14);
    ctx.fillRect(left + 9, top + 8, dw - 18, 5);

    ctx.fillStyle = '#D82838';
    ctx.fillRect(dx - 1, top + 10, 2, dh - 12);
    ctx.fillRect(left + 7, dy - 12, dw - 14, 8);

    ctx.fillStyle = '#181818';
    ctx.fillRect(dx - 11, top + 20, 22, 22);
    ctx.fillStyle = '#FFE840';
    ctx.fillRect(dx - 9, top + 22, 18, 18);
    ctx.fillStyle = '#181818';
    ctx.fillRect(dx - 3, top + 25, 6, 6);
    ctx.fillRect(dx - 4, top + 31, 8, 6);
  }

  function drawPixelFloatingIsland(ctx, x, y, w, h) {
    var bx = Math.round(x);
    var by = Math.round(y);
    var bw = Math.round(w || 48);
    var bh = Math.round(h || 40);

    ctx.fillStyle = '#181818';
    ctx.fillRect(bx + 2, by + 12, bw - 4, bh - 16);
    ctx.fillRect(bx + 6, by + bh - 6, bw - 12, 6);
    ctx.fillStyle = '#C07040';
    ctx.fillRect(bx + 5, by + 14, bw - 10, bh - 20);
    ctx.fillRect(bx + 9, by + bh - 8, bw - 18, 5);
    drawPixelStarCross(ctx, bx + bw - 16, by + bh - 14, '#FFFFFF');

    ctx.fillStyle = '#181818';
    ctx.fillRect(bx, by, bw, 16);
    ctx.fillStyle = '#88E050';
    ctx.fillRect(bx + 2, by + 2, bw - 4, 3);
    ctx.fillStyle = '#78C830';
    ctx.fillRect(bx + 2, by + 5, bw - 4, 6);
    ctx.fillStyle = '#489818';
    for (var tx = bx + 3; tx < bx + bw - 5; tx += 8) {
      ctx.fillRect(tx, by + 10, 5, 4);
    }
  }

  function drawPixelKeyItem(ctx, cx, cy) {
    var x = Math.round(cx);
    var y = Math.round(cy);
    ctx.fillStyle = '#181818';
    ctx.fillRect(x - 12, y - 16, 24, 15);
    ctx.fillRect(x - 4, y - 1, 9, 17);
    ctx.fillRect(x - 9, y + 6, 6, 4);
    ctx.fillRect(x - 9, y + 11, 6, 4);
    ctx.fillStyle = '#FFE840';
    ctx.fillRect(x - 10, y - 14, 20, 11);
    ctx.fillRect(x - 2, y - 1, 5, 15);
    ctx.fillRect(x - 7, y + 7, 5, 2);
    ctx.fillRect(x - 7, y + 12, 5, 2);
    ctx.fillStyle = '#D89818';
    ctx.fillRect(x - 10, y - 6, 20, 3);
    ctx.fillRect(x + 1, y - 1, 2, 14);
    ctx.fillStyle = '#181818';
    ctx.fillRect(x - 5, y - 10, 10, 4);
  }

  function drawPixelBerryItem(ctx, cx, cy) {
    var x = Math.round(cx);
    var y = Math.round(cy);
    ctx.fillStyle = '#181818';
    ctx.fillRect(x - 10, y - 8, 20, 18);
    ctx.fillRect(x - 7, y - 10, 14, 22);
    ctx.fillStyle = '#F83848';
    ctx.fillRect(x - 8, y - 6, 16, 14);
    ctx.fillRect(x - 5, y - 8, 10, 18);
    ctx.fillStyle = '#FF98A8';
    ctx.fillRect(x - 5, y - 4, 4, 4);
    ctx.fillStyle = '#FFE840';
    ctx.fillRect(x + 2, y - 2, 2, 2);
    ctx.fillRect(x - 2, y + 3, 2, 2);
    ctx.fillRect(x + 3, y + 4, 2, 2);
    ctx.fillStyle = '#181818';
    ctx.fillRect(x - 6, y - 13, 12, 5);
    ctx.fillStyle = '#78C830';
    ctx.fillRect(x - 4, y - 12, 9, 3);
  }

  function drawPixelCandyItem(ctx, cx, cy) {
    var x = Math.round(cx);
    var y = Math.round(cy);
    ctx.fillStyle = '#181818';
    ctx.fillRect(x - 4, y - 14, 8, 28);
    ctx.fillRect(x - 14, y - 4, 28, 8);
    ctx.fillRect(x - 9, y - 9, 18, 18);
    ctx.fillStyle = '#FFE840';
    ctx.fillRect(x - 2, y - 12, 4, 24);
    ctx.fillRect(x - 12, y - 2, 24, 4);
    ctx.fillRect(x - 7, y - 7, 14, 14);
    ctx.fillStyle = '#FF80AB';
    ctx.fillRect(x - 4, y - 4, 8, 8);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - 2, y - 2, 4, 4);
  }

  function drawPixelBombItem(ctx, cx, cy) {
    var x = Math.round(cx);
    var y = Math.round(cy);
    // 가시 폭탄 블록
    ctx.fillStyle = '#181818';
    ctx.fillRect(x - 10, y - 10, 20, 20);
    ctx.fillRect(x - 3, y - 15, 6, 30);
    ctx.fillRect(x - 15, y - 3, 30, 6);
    ctx.fillStyle = '#586878';
    ctx.fillRect(x - 8, y - 8, 16, 16);
    ctx.fillStyle = '#E8F0F8';
    ctx.fillRect(x - 5, y - 5, 5, 5);
    ctx.fillStyle = '#F84858';
    ctx.fillRect(x - 2, y - 14, 4, 4);
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

    var W = 720;
    var H = 320;
    var GROUND_Y = 268;
    var HERO_BOTTOM_PCT = ((H - GROUND_Y) / H) * 100;
    var MOVE_STEP = 48;

    var dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);

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
      y: GROUND_Y - 28,
      radius: 42,
      facingRight: true,
      chompTimer: 0,
      invincibleTimer: 0,
      moveLeftHeld: false,
      moveRightHeld: false
    };

    var items = [];
    var popups = [];
    var sparkles = [];
    var clouds = [
      { x: 110, y: 42, scale: 1.0, speed: 0.35 },
      { x: 370, y: 66, scale: 1.25, speed: 0.25 },
      { x: 590, y: 38, scale: 0.9, speed: 0.42 }
    ];
    var orchardTrees = [
      { x: 96, scale: 0.95 },
      { x: 245, scale: 0.82 },
      { x: 425, scale: 0.9 },
      { x: 575, scale: 0.85 }
    ];
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
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    var evoBanner = document.createElement('div');
    evoBanner.className = 'poke-berry-evo-banner';

    var heroEl = document.createElement('div');
    heroEl.className = 'poke-berry-hero';
    heroEl.style.bottom = HERO_BOTTOM_PCT.toFixed(4) + '%';

    var shadowEl = document.createElement('div');
    shadowEl.className = 'poke-berry-shadow';

    var auraEl = document.createElement('div');
    auraEl.className = 'poke-berry-aura';

    var heroImg = document.createElement('img');
    heroImg.className = 'poke-berry-hero-img';
    heroImg.src = currentSpriteUrl;
    heroImg.alt = currentNameKr;

    heroEl.appendChild(shadowEl);
    heroEl.appendChild(auraEl);
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
      var pct = Math.max(7, Math.min(93, (player.x / W) * 100));
      heroEl.style.left = pct.toFixed(2) + '%';

      var dirX = player.facingRight ? -1 : 1;
      var scaleX = 1;
      var scaleY = 1;
      if (player.chompTimer > 0) {
        var phase = player.chompTimer / 16;
        scaleX = 1 + Math.sin(phase * Math.PI) * 0.26;
        scaleY = 1 + Math.cos(phase * Math.PI * 0.5) * 0.22;
      }
      heroImg.style.transform =
        'scale(' + (scaleX * dirX).toFixed(2) + ', ' + scaleY.toFixed(2) + ')';
      heroImg.style.opacity =
        player.invincibleTimer > 0 && tick % 6 < 3 ? '0.45' : '1';
      shadowEl.style.transform =
        'translateX(-50%) scale(' + scaleX.toFixed(2) + ', 1)';
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
        heroEl.classList.add('evolved-aura');

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
        heroEl.classList.add('evolved-aura');
        heroEl.classList.add('mega-aura');
        showEvolutionBanner('🌟 슈퍼 메가 파워업! (점수 2배!)', 130);
      }

      for (var i = 0; i < 18; i++) {
        var angle = (Math.PI * 2 * i) / 18;
        sparkles.push({
          x: player.x,
          y: player.y - 24,
          vx: Math.cos(angle) * (2.6 + Math.random() * 2.6),
          vy: Math.sin(angle) * (2.6 + Math.random() * 2.6),
          size: 6,
          color: i % 2 === 0 ? '#FFE840' : '#FFFFFF',
          life: 34
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
          player.invincibleTimer = 72;
          helpers.playSfx('hit');
          popups.push({
            x: player.x,
            y: player.y - 46,
            text: '앗! 가시 폭탄 💥',
            color: '#FF5252',
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
        y: player.y - 44,
        text: '+' + earnedPts + '점!',
        color: kind === 'candy' ? '#FFE840' : kind === 'special' ? '#FFF59D' : '#FFFFFF',
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
      player.facingRight = false;
      player.x = Math.max(44, player.x - step);
      player.targetX = player.x;
      syncHeroDom();
      return player.x;
    }

    function moveRight(amount) {
      if (isGameOver) return player.x;
      var step = typeof amount === 'number' ? amount : MOVE_STEP;
      player.facingRight = true;
      player.x = Math.min(W - 44, player.x + step);
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
          ? ctxData.typeEmoji || '🔑'
          : NORMAL_BERRIES[Math.floor(Math.random() * NORMAL_BERRIES.length)];

      items.push({
        kind: kind,
        emoji: emoji,
        x: 52 + Math.random() * (W - 104),
        y: -26,
        vy: 2.3 + Math.random() * 1.4,
        radius: 22,
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
      gCtx.save();
      if (dpr !== 1) {
        gCtx.scale(dpr, dpr);
      }
      gCtx.clearRect(0, 0, W, H);

      // 1. 픽셀 블루 하늘 (#48B8F8)
      gCtx.fillStyle = '#48B8F8';
      gCtx.fillRect(0, 0, W, GROUND_Y);

      // 2. 원경 거대 흰색 계단형 구름산맥
      for (var mx = -20; mx < W + 220; mx += 220) {
        gCtx.fillStyle = '#D8F0FF';
        gCtx.fillRect(mx, GROUND_Y - 106, 220, 26);
        gCtx.fillStyle = '#FFFFFF';
        gCtx.fillRect(mx + 14, GROUND_Y - 122, 192, 18);
        gCtx.fillRect(mx + 34, GROUND_Y - 138, 148, 16);
        gCtx.fillRect(mx + 62, GROUND_Y - 154, 92, 16);
        gCtx.fillRect(mx + 84, GROUND_Y - 168, 48, 14);
      }

      // 3. 계단식 픽셀 구름
      for (var c = 0; c < clouds.length; c++) {
        drawPixelCloud(gCtx, clouds[c].x, clouds[c].y, clouds[c].scale);
      }

      // 4. 민트색 원경 덤불 수관 (#98E898)
      gCtx.fillStyle = '#78D080';
      gCtx.fillRect(0, GROUND_Y - 84, W, 24);
      gCtx.fillStyle = '#98E898';
      for (var bx = 12; bx < W; bx += 56) {
        gCtx.fillRect(bx, GROUND_Y - 96, 48, 16);
        gCtx.fillRect(bx + 6, GROUND_Y - 102, 36, 8);
        gCtx.fillStyle = '#68B870';
        gCtx.fillRect(bx + 22, GROUND_Y - 94, 4, 10);
        gCtx.fillStyle = '#98E898';
      }

      // 5. 짙은 숲 배경띠 (#205848) & 초원 잔디밭 (#58B848)
      gCtx.fillStyle = '#205848';
      gCtx.fillRect(0, GROUND_Y - 64, W, 30);
      gCtx.fillStyle = '#307860';
      for (var dtx = 24; dtx < W; dtx += 46) {
        gCtx.fillRect(dtx, GROUND_Y - 58, 24, 24);
      }
      gCtx.fillStyle = '#58B848';
      gCtx.fillRect(0, GROUND_Y - 34, W, 34);

      // 6. 배경 픽셀 나무 & 우측 아치형 골 도어 + 장식용 부유 잔디섬
      for (var t = 0; t < orchardTrees.length; t++) {
        drawPixelTree(gCtx, orchardTrees[t].x, GROUND_Y - 12, orchardTrees[t].scale);
      }
      drawPixelFloatingIsland(gCtx, 54, 88, 52, 38);
      drawPixelGoalDoor(gCtx, W - 78, GROUND_Y - 12);

      // 7. 상단 천장 픽셀 가시열
      for (var sx = 28; sx < W - 40; sx += 22) {
        drawPixelSpikeDown(gCtx, sx, 0, 14, 15);
      }

      // 8. 테라코타 별무늬 흙 바닥 (#C07040) & 픽셀 잔디 캡 (#78C830)
      gCtx.fillStyle = '#C07040';
      gCtx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      for (var gx = 28; gx < W - 28; gx += 56) {
        drawPixelStarCross(gCtx, gx, GROUND_Y + 24, '#FFFFFF');
        drawPixelStarCross(gCtx, gx + 28, GROUND_Y + 40, '#703818');
        gCtx.fillStyle = '#703818';
        gCtx.fillRect(gx + 14, GROUND_Y + 18, 4, 4);
      }

      gCtx.fillStyle = '#181818';
      gCtx.fillRect(0, GROUND_Y - 12, W, 16);
      gCtx.fillStyle = '#88E050';
      gCtx.fillRect(0, GROUND_Y - 10, W, 3);
      gCtx.fillStyle = '#78C830';
      gCtx.fillRect(0, GROUND_Y - 7, W, 6);
      gCtx.fillStyle = '#489818';
      for (var tgx = 0; tgx < W; tgx += 12) {
        gCtx.fillRect(tgx, GROUND_Y - 2, 7, 4);
      }

      // 9. 좌우 테라코타 픽셀 기둥 프레임
      var pillarW = 22;
      gCtx.fillStyle = '#181818';
      gCtx.fillRect(0, 0, pillarW + 3, H);
      gCtx.fillRect(W - pillarW - 3, 0, pillarW + 3, H);
      gCtx.fillStyle = '#C07040';
      gCtx.fillRect(0, 0, pillarW, H);
      gCtx.fillRect(W - pillarW, 0, pillarW, H);
      for (var py = 24; py < H - 16; py += 48) {
        drawPixelStarCross(gCtx, 11, py, '#FFFFFF');
        drawPixelStarCross(gCtx, W - 11, py, '#FFFFFF');
        gCtx.fillStyle = '#703818';
        gCtx.fillRect(8, py + 24, 4, 4);
        gCtx.fillRect(W - 12, py + 24, 4, 4);
      }

      // 10. 낙하 픽셀 아이템 렌더링 (황금 열쇠 / 황금 사탕별 / 빨간 열매 / 가시 폭탄)
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (it.kind === 'special') {
          drawPixelKeyItem(gCtx, it.x, it.y);
        } else if (it.kind === 'candy') {
          drawPixelCandyItem(gCtx, it.x, it.y);
        } else if (it.kind === 'bomb') {
          drawPixelBombItem(gCtx, it.x, it.y);
        } else {
          drawPixelBerryItem(gCtx, it.x, it.y);
        }
      }

      // 11. 반짝이 픽셀 파티클
      for (var spIdx = 0; spIdx < sparkles.length; spIdx++) {
        var sp = sparkles[spIdx];
        gCtx.fillStyle = '#181818';
        gCtx.fillRect(Math.round(sp.x) - 1, Math.round(sp.y) - 1, sp.size + 2, sp.size + 2);
        gCtx.fillStyle = sp.color;
        gCtx.fillRect(Math.round(sp.x), Math.round(sp.y), sp.size, sp.size);
      }

      // 12. 점수 팝업
      gCtx.textAlign = 'center';
      gCtx.textBaseline = 'middle';
      for (var p = 0; p < popups.length; p++) {
        var pop = popups[p];
        gCtx.save();
        gCtx.fillStyle = '#181818';
        gCtx.font = '900 15px "Noto Sans KR", sans-serif';
        gCtx.fillText(pop.text, pop.x + 1, pop.y + 1);
        gCtx.fillStyle = pop.color;
        gCtx.fillText(pop.text, pop.x, pop.y);
        gCtx.restore();
      }

      gCtx.restore();
    }

    function stepFrame() {
      if (isGameOver) return getState();

      tick += 1;

      if (player.moveLeftHeld) {
        player.facingRight = false;
        player.targetX = Math.max(44, player.targetX - 7.5);
      }
      if (player.moveRightHeld) {
        player.facingRight = true;
        player.targetX = Math.min(W - 44, player.targetX + 7.5);
      }

      var diffX = player.targetX - player.x;
      if (Math.abs(diffX) > 1.5) {
        player.facingRight = diffX > 0;
      }
      player.x += diffX * 0.3;
      player.x = Math.max(44, Math.min(W - 44, player.x));

      if (player.chompTimer > 0) player.chompTimer -= 1;
      if (player.invincibleTimer > 0) player.invincibleTimer -= 1;

      if (bannerTimer > 0) {
        bannerTimer -= 1;
        if (bannerTimer === 0) {
          evoBanner.classList.remove('visible');
        }
      }

      for (var c = 0; c < clouds.length; c++) {
        clouds[c].x -= clouds[c].speed;
        if (clouds[c].x < -60) clouds[c].x = W + 60;
      }

      nextSpawnIn -= 1;
      if (nextSpawnIn <= 0) {
        spawnFallingItem();
        nextSpawnIn = 28 + Math.floor(Math.random() * 20);
      }

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
      heroEl.classList.remove('evolved-aura');
      heroEl.classList.remove('mega-aura');
      evoBanner.classList.remove('visible');

      player.x = W * 0.5;
      player.targetX = W * 0.5;
      player.facingRight = true;
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

    var lastLeftPointerTime = -1000;
    var lastRightPointerTime = -1000;

    function onLeftPointerDown(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      lastLeftPointerTime = Date.now();
      player.moveLeftHeld = true;
      moveLeft();
    }

    function onLeftClick(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      if (Date.now() - lastLeftPointerTime < 300) return;
      moveLeft();
    }

    function onLeftUp() {
      player.moveLeftHeld = false;
    }

    function onRightPointerDown(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      lastRightPointerTime = Date.now();
      player.moveRightHeld = true;
      moveRight();
    }

    function onRightClick(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      if (Date.now() - lastRightPointerTime < 300) return;
      moveRight();
    }

    function onRightUp() {
      player.moveRightHeld = false;
    }

    function onStagePointerInput(e) {
      if (!running || isGameOver) return;
      var clientX =
        e && e.clientX !== undefined
          ? e.clientX
          : e && e.touches && e.touches[0]
          ? e.touches[0].clientX
          : null;
      if (clientX === null) return;
      var rect =
        typeof stageArea.getBoundingClientRect === 'function'
          ? stageArea.getBoundingClientRect()
          : { left: 0, width: W };
      var relX = ((clientX - rect.left) / Math.max(1, rect.width)) * W;
      var clampedX = Math.max(44, Math.min(W - 44, relX));
      if (Math.abs(clampedX - player.x) > 1.5) {
        player.facingRight = clampedX > player.x;
      }
      player.targetX = clampedX;
      player.x += (player.targetX - player.x) * 0.35;
      syncHeroDom();
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

    leftBtn.addEventListener('pointerdown', onLeftPointerDown);
    leftBtn.addEventListener('pointerup', onLeftUp);
    leftBtn.addEventListener('click', onLeftClick);
    rightBtn.addEventListener('pointerdown', onRightPointerDown);
    rightBtn.addEventListener('pointerup', onRightUp);
    rightBtn.addEventListener('click', onRightClick);
    stageArea.addEventListener('pointerdown', onStagePointerInput);
    stageArea.addEventListener('pointermove', onStagePointerInput);
    stageArea.addEventListener('touchstart', onStagePointerInput);
    stageArea.addEventListener('touchmove', onStagePointerInput);

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
    }

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
      leftBtn.removeEventListener('pointerdown', onLeftPointerDown);
      leftBtn.removeEventListener('pointerup', onLeftUp);
      leftBtn.removeEventListener('click', onLeftClick);
      rightBtn.removeEventListener('pointerdown', onRightPointerDown);
      rightBtn.removeEventListener('pointerup', onRightUp);
      rightBtn.removeEventListener('click', onRightClick);
      stageArea.removeEventListener('pointerdown', onStagePointerInput);
      stageArea.removeEventListener('pointermove', onStagePointerInput);
      stageArea.removeEventListener('touchstart', onStagePointerInput);
      stageArea.removeEventListener('touchmove', onStagePointerInput);
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
