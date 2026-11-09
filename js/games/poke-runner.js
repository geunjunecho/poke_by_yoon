/**
 * 포켓몬 도감 미니게임 P1: 달려라! 포켓몬 점프런 (poke-runner.js)
 * - 6~7세 눈높이 맞춤 클래식 무한 러너 (하트 3개 + 더블 점프 + 0.65초 자동 숙이기 유지)
 * - 주인공 포켓몬은 움직이는 GIF(runnerSpriteUrl)가 멈추지 않도록 DOM 오버레이(.poke-runner-hero)로 렌더링
 * - 레트로 16비트 픽셀아트 플랫폼 월드 캔버스 렌더링 적용
 */
(function (global) {
  'use strict';

  var GROUND_OBSTACLES = [
    { emoji: '🌲', label: '강철 가시 함정', spriteKind: 'spikes', width: 48, height: 36 },
    { emoji: '🪨', label: '가시 잔디 블록', spriteKind: 'spiked_block', width: 48, height: 50 },
    { emoji: '🌵', label: '쌍둥이 가시 바위', spriteKind: 'spikes_wide', width: 52, height: 38 }
  ];

  var AIR_OBSTACLES = [
    { emoji: '🦇', label: '둥둥 잔디섬 블록', spriteKind: 'floating_island', width: 52, height: 44 },
    { emoji: '🌩️', label: '가시 공중 블록', spriteKind: 'spiked_island', width: 52, height: 46 },
    { emoji: '🌀', label: '하늘 바위섬', spriteKind: 'floating_island', width: 48, height: 42 }
  ];

  var BERRY_EMOJIS = ['🍓', '🍎'];

  function createSafeHelpers(helpers) {
    var h = helpers || {};
    return {
      playSfx: function (type, noteIdx) {
        if (typeof h.playSfx === 'function') h.playSfx(type, noteIdx);
      },
      playCry: function () {
        if (typeof h.playCry === 'function') h.playCry();
      },
      computeRunTransform: function (state, tick) {
        if (typeof h.computeRunTransform === 'function') {
          return h.computeRunTransform(state, tick);
        }
        var s = state || {};
        var t = tick || 0;
        var flipX = s.flipX !== undefined ? Boolean(s.flipX) : true;
        var dirX = flipX ? -1 : 1;
        var yOffset = s.yOffset || 0;
        var bobY = 0;
        var tilt = 0;
        var sx = 1;
        var sy = 1;

        if (s.isJumping) {
          bobY = yOffset;
          sx = 0.88;
          sy = 1.16;
          tilt = flipX ? 10 : -10;
        } else if (s.isDucking) {
          bobY = 8;
          sx = 1.32;
          sy = 0.56;
          tilt = flipX ? -12 : 12;
        } else {
          bobY = Math.abs(Math.sin(t * 0.35)) * -10;
          tilt = Math.sin(t * 0.35) * 6;
          sx = 1 + Math.sin(t * 0.7) * 0.06;
          sy = 1 - Math.sin(t * 0.7) * 0.06;
        }

        var shadowScale = s.isJumping
          ? Math.max(0.35, 1 - Math.abs(yOffset) / 140)
          : s.isDucking
          ? 1.25
          : 0.95 - Math.abs(bobY) * 0.02;

        var transform =
          'translateY(' +
          Math.round(bobY) +
          'px) rotate(' +
          tilt.toFixed(1) +
          'deg) scale(' +
          (sx * dirX).toFixed(2) +
          ', ' +
          sy.toFixed(2) +
          ')';
        var filter = s.isHit
          ? Math.floor(t / 3) % 2 === 0
            ? 'brightness(2.2) saturate(0.3)'
            : 'opacity(0.45)'
          : 'drop-shadow(0 6px 8px rgba(0,0,0,0.45))';
        return {
          transform: transform,
          filter: filter,
          shadowScale: shadowScale,
          scaleY: sy,
          opacity: s.isHit && t % 6 < 3 ? '0.45' : '1'
        };
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

  function injectRunnerStyles() {
    if (typeof document === 'undefined' || !document.head) return;
    if (document.getElementById('poke-runner-styles')) return;
    var style = document.createElement('style');
    style.id = 'poke-runner-styles';
    style.textContent = [
      '.poke-runner-wrap {',
      '  position: relative; max-width: 960px; width: 100%; height: 100%; min-height: 360px; margin: 0 auto;',
      '  display: flex; flex-direction: column; justify-content: space-between;',
      '  background: #48B8F8;',
      '  border-radius: 20px; border: 4px solid #181818; box-shadow: 0 12px 32px rgba(0,0,0,0.5);',
      '  overflow: hidden; user-select: none; -webkit-user-select: none; box-sizing: border-box;',
      '  font-family: "Noto Sans KR", "Outfit", sans-serif;',
      '}',
      '.poke-runner-hud {',
      '  position: relative; z-index: 5; display: flex; align-items: center; justify-content: space-between;',
      '  padding: 10px 16px; background: rgba(255,255,255,0.92); backdrop-filter: blur(8px);',
      '  border-bottom: 3px solid #181818; font-weight: 900; gap: 8px; flex-wrap: wrap;',
      '}',
      '.poke-runner-hearts { font-size: 1.4rem; letter-spacing: 3px; }',
      '.poke-runner-score-box {',
      '  display: flex; align-items: center; gap: 10px; font-size: 1.05rem; color: #1b3a4b;',
      '}',
      '.poke-runner-score-pill {',
      '  background: #fff3e0; border: 2px solid #181818; border-radius: 999px; padding: 4px 14px; color: #e65100;',
      '}',
      '.poke-runner-best-pill {',
      '  background: #ede7f6; border: 2px solid #181818; border-radius: 999px; padding: 4px 12px; color: #4527a0; font-size: 0.92rem;',
      '}',
      '.poke-runner-stage-area {',
      '  position: relative; flex: 1; width: 100%; min-height: 220px; overflow: hidden;',
      '}',
      '.poke-runner-canvas {',
      '  position: absolute; inset: 0; width: 100%; height: 100%; display: block;',
      '  image-rendering: pixelated; image-rendering: crisp-edges;',
      '}',
      '.poke-runner-hero {',
      '  position: absolute; left: 14.5833%; bottom: 21.25%; width: 88px; height: 88px;',
      '  transform: translateX(-50%); z-index: 3; pointer-events: none;',
      '  display: flex; align-items: flex-end; justify-content: center;',
      '}',
      '.poke-runner-shadow {',
      '  position: absolute; bottom: -5px; left: 50%; width: 64px; height: 14px;',
      '  border-radius: 50%; background: radial-gradient(ellipse at center, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.18) 65%, transparent 100%);',
      '  transform: translateX(-50%); z-index: 1; pointer-events: none; transition: opacity 0.1s ease;',
      '}',
      '.poke-runner-hero-img {',
      '  position: relative; z-index: 2; width: 88px; height: 88px; object-fit: contain; image-rendering: pixelated;',
      '  transform-origin: center bottom; transform: scaleX(-1); will-change: transform, filter;',
      '}',
      '.poke-runner-bubble {',
      '  position: absolute; bottom: 96px; left: 50%; transform: translateX(-50%); z-index: 4;',
      '  white-space: nowrap; background: #fff8e1; color: #d84315; font-weight: 900; font-size: 0.88rem;',
      '  padding: 5px 12px; border-radius: 999px; border: 2.5px solid #181818;',
      '  box-shadow: 0 4px 0 rgba(0,0,0,0.28); opacity: 0; transition: opacity 0.15s ease;',
      '}',
      '.poke-runner-bubble.visible { opacity: 1; }',
      '.poke-runner-controls {',
      '  position: relative; z-index: 5; display: grid; grid-template-columns: 1fr 1fr; gap: 14px;',
      '  padding: 10px 16px 14px; background: rgba(255,255,255,0.95); border-top: 3px solid #181818;',
      '}',
      '.poke-runner-btn {',
      '  appearance: none; border: 3px solid #181818; border-radius: 16px; padding: 14px 10px;',
      '  font-size: 1.18rem; font-weight: 900; color: #fff; cursor: pointer;',
      '  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;',
      '  box-shadow: 0 6px 0 #181818; transition: transform 0.08s ease;',
      '  touch-action: manipulation;',
      '}',
      '.poke-runner-btn:active, .poke-runner-btn.active { transform: translateY(4px); box-shadow: 0 2px 0 #181818; }',
      '.poke-runner-btn-jump { background: linear-gradient(180deg, #ff7043 0%, #f4511e 100%); }',
      '.poke-runner-btn-duck { background: linear-gradient(180deg, #29b6f6 0%, #0288d1 100%); }',
      '.poke-runner-btn-sub { font-size: 0.78rem; font-weight: 700; opacity: 0.95; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ============================================================================
  // 16비트 픽셀아트 플랫폼 월드 렌더러 헬퍼 (순수 fillRect 기반 - 모든 캔버스 호환)
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
    // 하단 하늘색 그림자 단
    ctx.fillStyle = '#C8ECFF';
    ctx.fillRect(bx - u * 5, by + u * 2, u * 11, u * 2);
    // 흰색 계단식 픽셀 구름 몸통
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(bx - u * 4, by, u * 9, u * 2);
    ctx.fillRect(bx - u * 3, by - u * 2, u * 6, u * 2);
    ctx.fillRect(bx - u, by - u * 3, u * 3, u);
  }

  function drawPixelSpikeUp(ctx, x, bottomY, w, h) {
    var bx = Math.round(x);
    var by = Math.round(bottomY);
    var sw = w || 14;
    var sh = h || 18;
    // 외곽선 계단형 삼각형
    ctx.fillStyle = '#181818';
    ctx.fillRect(bx, by - 4, sw, 4);
    ctx.fillRect(bx + 2, by - 8, sw - 4, 4);
    ctx.fillRect(bx + 4, by - 13, sw - 8, 5);
    ctx.fillRect(bx + 6, by - sh, sw - 12, sh - 13);
    // 좌측 밝은 메탈 하이라이트
    ctx.fillStyle = '#E8F0F8';
    ctx.fillRect(bx + 2, by - 4, Math.floor((sw - 4) * 0.5), 2);
    ctx.fillRect(bx + 4, by - 8, Math.floor((sw - 8) * 0.5), 4);
    ctx.fillRect(bx + 6, by - 13, 2, 5);
    // 우측 메탈 그림자
    ctx.fillStyle = '#788898';
    ctx.fillRect(bx + Math.floor(sw * 0.5), by - 4, Math.floor((sw - 4) * 0.5), 2);
    ctx.fillRect(bx + Math.floor(sw * 0.5), by - 8, Math.floor((sw - 8) * 0.5), 4);
    ctx.fillRect(bx + Math.floor(sw * 0.5), by - 12, 2, 4);
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
    // 기둥
    ctx.fillStyle = '#385848';
    ctx.fillRect(x - Math.floor(tw * 0.5) - 2, y - th, tw + 4, th);
    ctx.fillStyle = '#587860';
    ctx.fillRect(x - Math.floor(tw * 0.5), y - th, tw, th - 2);
    // 수관 그림자층
    var r = Math.round(22 * s);
    ctx.fillStyle = '#389038';
    ctx.fillRect(x - r, y - th - Math.round(r * 0.9), r * 2, Math.round(r * 0.9));
    // 수관 본체
    ctx.fillStyle = '#58B848';
    ctx.fillRect(x - r + 2, y - th - Math.round(r * 1.45), (r - 2) * 2, Math.round(r * 1.15));
    ctx.fillRect(x - Math.round(r * 0.75), y - th - Math.round(r * 1.75), Math.round(r * 1.5), Math.round(r * 0.4));
    // 상단 밝은 하이라이트
    ctx.fillStyle = '#88E060';
    ctx.fillRect(x - Math.round(r * 0.65), y - th - Math.round(r * 1.65), Math.round(r * 1.3), Math.round(6 * s));
    // 나무 위 픽셀 하얀 꽃송이 장식
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

    // 검은 외곽선 아치
    ctx.fillStyle = '#181818';
    ctx.fillRect(left - 3, top + 8, dw + 6, dh - 8);
    ctx.fillRect(left + 3, top + 3, dw - 6, 6);
    ctx.fillRect(left + 9, top, dw - 18, 4);

    // 황금 아치 테두리
    ctx.fillStyle = '#FFE840';
    ctx.fillRect(left, top + 9, dw, dh - 9);
    ctx.fillRect(left + 5, top + 5, dw - 10, 5);
    ctx.fillRect(left + 11, top + 2, dw - 22, 4);

    // 빨간 문 본체
    ctx.fillStyle = '#F84858';
    ctx.fillRect(left + 5, top + 12, dw - 10, dh - 14);
    ctx.fillRect(left + 9, top + 8, dw - 18, 5);

    // 문 중앙 분할선 및 하단 패널
    ctx.fillStyle = '#D82838';
    ctx.fillRect(dx - 1, top + 10, 2, dh - 12);
    ctx.fillRect(left + 7, dy - 12, dw - 14, 8);

    // 중앙 황금 열쇠구멍 패드
    ctx.fillStyle = '#181818';
    ctx.fillRect(dx - 11, top + 20, 22, 22);
    ctx.fillStyle = '#FFE840';
    ctx.fillRect(dx - 9, top + 22, 18, 18);
    ctx.fillStyle = '#181818';
    ctx.fillRect(dx - 3, top + 25, 6, 6);
    ctx.fillRect(dx - 4, top + 31, 8, 6);
  }

  function drawPixelFloatingIsland(ctx, x, y, w, h, withTopSpikes) {
    var bx = Math.round(x);
    var by = Math.round(y);
    var bw = Math.round(w || 48);
    var bh = Math.round(h || 42);

    if (withTopSpikes) {
      drawPixelSpikeUp(ctx, bx + 6, by + 2, 16, 16);
      drawPixelSpikeUp(ctx, bx + bw - 22, by + 2, 16, 16);
    }

    // 하단 둥근 테라코타 흙 블록 + 검은 외곽선
    ctx.fillStyle = '#181818';
    ctx.fillRect(bx + 2, by + 12, bw - 4, bh - 16);
    ctx.fillRect(bx + 6, by + bh - 6, bw - 12, 6);
    ctx.fillStyle = '#C07040';
    ctx.fillRect(bx + 5, by + 14, bw - 10, bh - 20);
    ctx.fillRect(bx + 9, by + bh - 8, bw - 18, 5);
    // 흙 속 하얀 픽셀 별 장식
    drawPixelStarCross(ctx, bx + bw - 16, by + bh - 14, '#FFFFFF');
    ctx.fillStyle = '#703818';
    ctx.fillRect(bx + 12, by + 22, 3, 3);

    // 상단 픽셀 잔디 캡
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
    // 검은 외곽선
    ctx.fillStyle = '#181818';
    ctx.fillRect(x - 12, y - 16, 24, 15);
    ctx.fillRect(x - 4, y - 1, 9, 17);
    ctx.fillRect(x - 9, y + 6, 6, 4);
    ctx.fillRect(x - 9, y + 11, 6, 4);
    // 황금 몸통
    ctx.fillStyle = '#FFE840';
    ctx.fillRect(x - 10, y - 14, 20, 11);
    ctx.fillRect(x - 2, y - 1, 5, 15);
    ctx.fillRect(x - 7, y + 7, 5, 2);
    ctx.fillRect(x - 7, y + 12, 5, 2);
    // 음영
    ctx.fillStyle = '#D89818';
    ctx.fillRect(x - 10, y - 6, 20, 3);
    ctx.fillRect(x + 1, y - 1, 2, 14);
    // 열쇠 구멍
    ctx.fillStyle = '#181818';
    ctx.fillRect(x - 5, y - 10, 10, 4);
  }

  function drawPixelBerryItem(ctx, cx, cy) {
    var x = Math.round(cx);
    var y = Math.round(cy);
    // 검은 외곽선
    ctx.fillStyle = '#181818';
    ctx.fillRect(x - 10, y - 8, 20, 18);
    ctx.fillRect(x - 7, y - 10, 14, 22);
    // 빨간 열매 본체
    ctx.fillStyle = '#F83848';
    ctx.fillRect(x - 8, y - 6, 16, 14);
    ctx.fillRect(x - 5, y - 8, 10, 18);
    // 하이라이트 및 씨앗 점
    ctx.fillStyle = '#FF98A8';
    ctx.fillRect(x - 5, y - 4, 4, 4);
    ctx.fillStyle = '#FFE840';
    ctx.fillRect(x + 2, y - 2, 2, 2);
    ctx.fillRect(x - 2, y + 3, 2, 2);
    ctx.fillRect(x + 3, y + 4, 2, 2);
    // 초록 픽셀 잎사귀
    ctx.fillStyle = '#181818';
    ctx.fillRect(x - 6, y - 13, 12, 5);
    ctx.fillStyle = '#78C830';
    ctx.fillRect(x - 4, y - 12, 9, 3);
  }

  function drawPixelStarItem(ctx, cx, cy) {
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
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - 3, y - 3, 6, 6);
  }

  function mountRunnerGame(stageEl, charCtx, rawHelpers) {
    if (!stageEl) return function () {};
    injectRunnerStyles();

    var helpers = createSafeHelpers(rawHelpers);
    var ctxData = Object.assign(
      {
        id: 25,
        nameKr: '피카츄',
        nameEn: 'pikachu',
        artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
        spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
        runnerSpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/25.gif',
        isAnimatedGif: true,
        primaryType: 'electric',
        typeNameKr: '전기',
        typeColor: '#FFD54F',
        typeEmoji: '⚡'
      },
      charCtx || {}
    );

    var heroSprite =
      ctxData.runnerSpriteUrl || ctxData.spriteUrl || ctxData.artworkUrl || '';

    var W = 720;
    var H = 320;
    var GROUND_Y = 252;
    var PLAYER_X = 105;
    var HERO_LEFT_PCT = (PLAYER_X / W) * 100;
    var HERO_BOTTOM_PCT = ((H - GROUND_Y) / H) * 100;
    var GRAVITY = 0.68;
    var JUMP_VELOCITY_1 = -12.2;
    var JUMP_VELOCITY_2 = -10.8;
    var AUTO_DUCK_FRAMES = 40; // 약 0.65초 유지

    var dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);

    var lives = 3;
    var maxLives = 3;
    var score = 0;
    var highScore = helpers.getHighScore('runner');
    var speed = 4.6;
    var tick = 0;
    var running = true;
    var isGameOver = false;
    var rewarded = false;
    var rafId = null;

    var player = {
      x: PLAYER_X,
      y: 0, // 바닥 기준 오프셋 (음수 = 공중)
      vy: 0,
      width: 58,
      height: 62,
      isJumping: false,
      isDucking: false,
      duckKeyHeld: false,
      duckHoldTimer: 0,
      jumpCount: 0,
      maxJumps: 2,
      invincibleTimer: 0
    };

    var obstacles = [];
    var items = [];
    var particles = [];
    var popups = [];
    var clouds = [
      { x: 110, y: 48, scale: 1.0, speed: 0.42 },
      { x: 340, y: 84, scale: 1.35, speed: 0.3 },
      { x: 560, y: 42, scale: 0.9, speed: 0.52 }
    ];

    var nextObstacleIn = 75;
    var nextItemIn = 45;
    var bubbleTimer = 0;
    var bubbleText = '';

    // DOM 구성
    stageEl.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'poke-runner-wrap';

    var hud = document.createElement('div');
    hud.className = 'poke-runner-hud';

    var heartsEl = document.createElement('div');
    heartsEl.className = 'poke-runner-hearts';
    heartsEl.setAttribute('aria-label', '남은 하트');

    var scoreBox = document.createElement('div');
    scoreBox.className = 'poke-runner-score-box';

    var scorePill = document.createElement('span');
    scorePill.className = 'poke-runner-score-pill';

    var bestPill = document.createElement('span');
    bestPill.className = 'poke-runner-best-pill';

    scoreBox.appendChild(scorePill);
    scoreBox.appendChild(bestPill);
    hud.appendChild(heartsEl);
    hud.appendChild(scoreBox);

    var stageArea = document.createElement('div');
    stageArea.className = 'poke-runner-stage-area';

    var canvas = document.createElement('canvas');
    canvas.className = 'poke-runner-canvas';
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    var heroEl = document.createElement('div');
    heroEl.className = 'poke-runner-hero';
    heroEl.style.left = HERO_LEFT_PCT.toFixed(4) + '%';
    heroEl.style.bottom = HERO_BOTTOM_PCT.toFixed(4) + '%';

    var shadowEl = document.createElement('div');
    shadowEl.className = 'poke-runner-shadow';

    var heroImg = document.createElement('img');
    heroImg.className = 'poke-runner-hero-img';
    heroImg.src = heroSprite;
    heroImg.alt = ctxData.nameKr || '포켓몬';

    var bubbleEl = document.createElement('div');
    bubbleEl.className = 'poke-runner-bubble';

    heroEl.appendChild(bubbleEl);
    heroEl.appendChild(shadowEl);
    heroEl.appendChild(heroImg);
    stageArea.appendChild(canvas);
    stageArea.appendChild(heroEl);

    var controls = document.createElement('div');
    controls.className = 'poke-runner-controls';

    var jumpBtn = document.createElement('button');
    jumpBtn.type = 'button';
    jumpBtn.className = 'poke-runner-btn poke-runner-btn-jump';
    jumpBtn.innerHTML =
      '<span>⬆️ 폴짝 점프!</span><span class="poke-runner-btn-sub">한 번 더 누르면 2단 점프!</span>';

    var duckBtn = document.createElement('button');
    duckBtn.type = 'button';
    duckBtn.className = 'poke-runner-btn poke-runner-btn-duck';
    duckBtn.innerHTML =
      '<span>⬇️ 납작 숙이기!</span><span class="poke-runner-btn-sub">살짝만 눌러도 슈웅 통과!</span>';

    controls.appendChild(jumpBtn);
    controls.appendChild(duckBtn);

    wrap.appendChild(hud);
    wrap.appendChild(stageArea);
    wrap.appendChild(controls);
    stageEl.appendChild(wrap);

    var gCtx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;

    function updateHud() {
      var fullHearts = Math.max(0, Math.min(maxLives, lives));
      var emptyHearts = Math.max(0, maxLives - fullHearts);
      heartsEl.textContent = '❤️'.repeat(fullHearts) + '🖤'.repeat(emptyHearts);
      scorePill.textContent = '⭐ ' + score + '점';
      bestPill.textContent = '🏆 최고 ' + Math.max(highScore, score) + '점';
    }

    function showBubble(text, frames) {
      bubbleText = text;
      bubbleTimer = frames || 50;
      bubbleEl.textContent = text;
      bubbleEl.classList.add('visible');
    }

    function syncHeroTransform() {
      var tf = helpers.computeRunTransform(
        {
          yOffset: player.y,
          isJumping: player.isJumping,
          isDucking: player.isDucking,
          isHit: player.invincibleTimer > 0,
          flipX: true
        },
        tick
      );
      var shadowScale = player.isJumping
        ? Math.max(0.35, 1 - Math.abs(player.y) / 140)
        : player.isDucking
        ? 1.25
        : 0.95;

      if (typeof tf === 'string') {
        heroImg.style.transform = tf;
        heroImg.style.filter =
          player.invincibleTimer > 0
            ? 'drop-shadow(0 0 10px #ff5252) brightness(1.5)'
            : 'drop-shadow(0 6px 8px rgba(0,0,0,0.35))';
      } else if (tf && typeof tf === 'object') {
        if (tf.transform !== undefined) heroImg.style.transform = tf.transform;
        if (tf.filter !== undefined) heroImg.style.filter = tf.filter;
        if (tf.opacity !== undefined) heroImg.style.opacity = tf.opacity;
        if (typeof tf.shadowScale === 'number') shadowScale = tf.shadowScale;
      }

      shadowEl.style.transform =
        'translateX(-50%) scale(' + shadowScale.toFixed(2) + ')';
      shadowEl.style.opacity = Math.max(0.22, Math.min(1, shadowScale * 0.85)).toFixed(2);
    }

    function spawnFootstepDust(count) {
      var n = count || 1;
      for (var i = 0; i < n; i++) {
        particles.push({
          x: player.x - 14 + (Math.random() * 16 - 8),
          y: GROUND_Y - 4 + (Math.random() * 6 - 3),
          vx: -speed * (0.45 + Math.random() * 0.4),
          vy: -(0.6 + Math.random() * 1.6),
          size: 4 + Math.floor(Math.random() * 4),
          life: 18 + Math.floor(Math.random() * 10),
          maxLife: 28,
          color: i % 2 === 0 ? '#FFE840' : (ctxData.typeColor || '#88E050')
        });
      }
    }

    function jump() {
      if (isGameOver) return false;
      if (player.jumpCount >= player.maxJumps) return false;

      player.jumpCount += 1;
      player.isJumping = true;
      player.isDucking = false;
      player.duckKeyHeld = false;
      player.duckHoldTimer = 0;
      duckBtn.classList.remove('active');

      player.vy = player.jumpCount === 1 ? JUMP_VELOCITY_1 : JUMP_VELOCITY_2;
      // 호출 직후에도 y < 0 상태가 보장되도록 즉시 이륙 오프셋 적용
      if (player.y >= 0) {
        player.y = -12;
      } else {
        player.y -= 6;
      }

      spawnFootstepDust(4);
      helpers.playSfx('jump', player.jumpCount);
      if (player.jumpCount === 2) {
        showBubble('폴짝폴짝 2단 점프! ✨', 35);
      }
      syncHeroTransform();
      return true;
    }

    function duck(active) {
      if (isGameOver) return false;
      var shouldDuck = active === undefined ? true : Boolean(active);
      if (shouldDuck) {
        player.isDucking = true;
        player.duckKeyHeld = true;
        player.duckHoldTimer = AUTO_DUCK_FRAMES;
        player.y = 0;
        player.vy = 0;
        player.isJumping = false;
        player.jumpCount = 0;
        duckBtn.classList.add('active');
        helpers.playSfx('duck', 0);
        showBubble('납작 슈웅~! ⬇️', 32);
      } else {
        player.duckKeyHeld = false;
        player.duckHoldTimer = 0;
        player.isDucking = false;
        duckBtn.classList.remove('active');
      }
      syncHeroTransform();
      return player.isDucking;
    }

    function tapDuckButton() {
      if (isGameOver) return;
      player.isDucking = true;
      player.duckHoldTimer = AUTO_DUCK_FRAMES;
      if (player.isJumping) {
        player.y = 0;
        player.vy = 0;
        player.isJumping = false;
        player.jumpCount = 0;
      }
      duckBtn.classList.add('active');
      helpers.playSfx('duck', 0);
      showBubble('납작 슈웅~! ⬇️', 35);
      syncHeroTransform();
    }

    function spawnObstacle(forcedCategory) {
      var category =
        forcedCategory || (Math.random() < 0.56 ? 'ground' : 'air');
      var pool = category === 'ground' ? GROUND_OBSTACLES : AIR_OBSTACLES;
      var tpl = pool[Math.floor(Math.random() * pool.length)];
      obstacles.push({
        category: category,
        spriteKind: tpl.spriteKind,
        emoji: tpl.emoji,
        label: tpl.label,
        hintText: category === 'ground' ? '⬆️ 점프!' : '⬇️ 숙이기!',
        x: W + 44,
        y: category === 'ground' ? GROUND_Y - tpl.height : GROUND_Y - 88,
        width: tpl.width,
        height: tpl.height,
        passed: false
      });
    }

    function spawnItem(forcedKind) {
      var roll = Math.random();
      var kind = forcedKind || (roll < 0.14 ? 'star' : roll < 0.45 ? 'orb' : 'berry');
      var emoji =
        kind === 'star'
          ? '🌟'
          : kind === 'orb'
          ? ctxData.typeEmoji || '🔑'
          : BERRY_EMOJIS[Math.floor(Math.random() * BERRY_EMOJIS.length)];
      var pts = kind === 'star' ? 50 : kind === 'orb' ? 30 : 15;
      var high = Math.random() < 0.45;
      items.push({
        kind: kind,
        emoji: emoji,
        points: pts,
        x: W + 34,
        y: high ? GROUND_Y - 104 : GROUND_Y - 48,
        radius: 20,
        collected: false
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
      helpers.saveHighScore('runner', score);
      if (score >= 100 && !rewarded) {
        rewarded = true;
        helpers.rewardCharacter();
      }
      updateHud();
      helpers.showResultOverlay(stageEl, {
        gameId: 'runner',
        title: '달리기 완료! 🏁',
        score: score,
        highScore: highScore,
        isNewRecord: score > prevBest,
        rewarded: rewarded,
        message:
          score >= 100
            ? ctxData.nameKr + '와(과) 신나게 달려서 최고예요! 🌟'
            : '점프와 숙이기로 다시 한 번 달려볼까요?',
        onRetry: function () {
          resetGame();
        },
        onRestart: function () {
          resetGame();
        }
      });
    }

    function triggerObstacleHit() {
      if (player.invincibleTimer > 0 || isGameOver) return;
      lives = Math.max(0, lives - 1);
      player.invincibleTimer = 90;
      helpers.playSfx('hit');
      showBubble('앗! 조심조심~!', 90);
      updateHud();
      syncHeroTransform();
      if (lives <= 0) {
        handleGameOver();
      }
    }

    function checkCollisions() {
      var pLeft = player.x - 18;
      var pRight = player.x + 18;
      var pHeight = player.isDucking ? 28 : 50;
      var pBottom = GROUND_Y + player.y;
      var pTop = pBottom - pHeight;

      for (var i = items.length - 1; i >= 0; i--) {
        var it = items[i];
        var ix = it.x;
        var iy = it.y;
        var catchTop = pTop - 18;
        var catchBottom = pBottom + 12;
        if (
          ix + it.radius >= pLeft - 14 &&
          ix - it.radius <= pRight + 14 &&
          iy + it.radius >= catchTop &&
          iy - it.radius <= catchBottom
        ) {
          score += it.points;
          if (it.kind === 'star') {
            lives = Math.min(maxLives, lives + 1);
            helpers.playSfx('powerup');
            showBubble('황금별! 하트 회복 ❤️+1', 50);
          } else if (it.kind === 'orb') {
            helpers.playSfx('coin', 2);
            showBubble('🔑 황금 열쇠 +30점!', 40);
          } else {
            helpers.playSfx('coin', 1);
          }
          if (score >= 100 && !rewarded) {
            rewarded = true;
            helpers.rewardCharacter();
          }
          popups.push({
            x: it.x,
            y: it.y - 12,
            text:
              it.kind === 'star'
                ? '+' + it.points + '점! ❤️+1'
                : '+' + it.points + '점!',
            color: it.kind === 'star' ? '#FFE840' : '#FFFFFF',
            life: 32
          });
          items.splice(i, 1);
          updateHud();
        }
      }

      if (player.invincibleTimer > 0) return;

      for (var j = 0; j < obstacles.length; j++) {
        var obs = obstacles[j];
        var oLeft = obs.x + 8;
        var oRight = obs.x + obs.width - 8;
        if (pRight < oLeft || pLeft > oRight) continue;

        if (obs.category === 'ground') {
          if (player.y < -26) continue;
          triggerObstacleHit(obs);
          break;
        } else if (obs.category === 'air') {
          if (player.isDucking && player.y > -15) continue;
          triggerObstacleHit(obs);
          break;
        }
      }
    }

    function renderCanvas() {
      if (!gCtx) return;
      gCtx.save();
      if (dpr !== 1) {
        gCtx.scale(dpr, dpr);
      }
      gCtx.clearRect(0, 0, W, H);

      // 1. 픽셀 블루 하늘 배경 (#48B8F8)
      gCtx.fillStyle = '#48B8F8';
      gCtx.fillRect(0, 0, W, GROUND_Y);

      // 2. 원경 거대 흰색 계단형 구름산맥 (패럴랙스 레이어 1)
      var mtnScroll = (tick * speed * 0.1) % 240;
      for (var mx = -mtnScroll - 120; mx < W + 240; mx += 240) {
        var bmx = Math.round(mx);
        gCtx.fillStyle = '#D8F0FF';
        gCtx.fillRect(bmx, GROUND_Y - 102, 240, 26);
        gCtx.fillStyle = '#FFFFFF';
        gCtx.fillRect(bmx + 16, GROUND_Y - 118, 208, 18);
        gCtx.fillRect(bmx + 36, GROUND_Y - 134, 156, 16);
        gCtx.fillRect(bmx + 64, GROUND_Y - 150, 96, 16);
        gCtx.fillRect(bmx + 88, GROUND_Y - 164, 48, 14);
      }

      // 3. 상공 계단식 픽셀 구름
      for (var c = 0; c < clouds.length; c++) {
        drawPixelCloud(gCtx, clouds[c].x, clouds[c].y, clouds[c].scale);
      }

      // 4. 민트색 원경 덤불 수관 (#98E898, 패럴랙스 레이어 2)
      var bushScroll = (tick * speed * 0.2) % 56;
      gCtx.fillStyle = '#78D080';
      gCtx.fillRect(0, GROUND_Y - 82, W, 24);
      gCtx.fillStyle = '#98E898';
      for (var bx = -bushScroll - 56; bx < W + 56; bx += 56) {
        var rbx = Math.round(bx);
        gCtx.fillRect(rbx + 4, GROUND_Y - 94, 48, 16);
        gCtx.fillRect(rbx + 10, GROUND_Y - 100, 36, 8);
        gCtx.fillStyle = '#68B870';
        gCtx.fillRect(rbx + 26, GROUND_Y - 92, 4, 10);
        gCtx.fillStyle = '#98E898';
      }

      // 5. 짙은 숲 배경띠 (#205848) 및 초원 잔디밭 (#58B848)
      gCtx.fillStyle = '#205848';
      gCtx.fillRect(0, GROUND_Y - 62, W, 30);
      gCtx.fillStyle = '#307860';
      var darkTreeScroll = (tick * speed * 0.28) % 44;
      for (var dtx = -darkTreeScroll; dtx < W + 44; dtx += 44) {
        gCtx.fillRect(Math.round(dtx) + 8, GROUND_Y - 56, 24, 24);
      }
      gCtx.fillStyle = '#58B848';
      gCtx.fillRect(0, GROUND_Y - 32, W, 32);

      // 초원 위 작은 픽셀 꽃 장식
      var flowerScroll = (tick * speed * 0.45) % 90;
      for (var flx = -flowerScroll; flx < W + 90; flx += 90) {
        var rflx = Math.round(flx);
        gCtx.fillStyle = '#FFFFFF';
        gCtx.fillRect(rflx + 20, GROUND_Y - 22, 4, 4);
        gCtx.fillRect(rflx + 26, GROUND_Y - 16, 4, 4);
        gCtx.fillStyle = '#389038';
        gCtx.fillRect(rflx + 54, GROUND_Y - 20, 6, 4);
      }

      // 6. 둥근 픽셀 나무 행렬 (패럴랙스 레이어 3)
      var treeSpacing = 128;
      var treeScroll = (tick * speed * 0.45) % treeSpacing;
      for (var tx = -treeScroll; tx < W + treeSpacing; tx += treeSpacing) {
        drawPixelTree(gCtx, tx + 32, GROUND_Y - 14, 0.95);
        drawPixelTree(gCtx, tx + 92, GROUND_Y - 6, 0.78);
      }

      // 7. 스테이지 랜드마크: 빨간 아치형 픽셀 골 도어 (배경 장식)
      var doorCycle = 680;
      var doorX = W - ((tick * speed * 0.65 + 160) % doorCycle) + 80;
      if (doorX > -40 && doorX < W + 40) {
        drawPixelGoalDoor(gCtx, doorX, GROUND_Y - 12);
      }

      // 8. 상단 천장 픽셀 가시 장식 (레퍼런스 이미지 상단 가시열 재현)
      for (var sx = 28; sx < W - 40; sx += 22) {
        drawPixelSpikeDown(gCtx, sx, 0, 14, 15);
      }

      // 9. 테라코타 별무늬 흙 바닥 (#C07040) & 픽셀 잔디 캡 (#78C830)
      gCtx.fillStyle = '#C07040';
      gCtx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

      var groundPatternSpacing = 56;
      var groundScroll = Math.round((tick * speed) % groundPatternSpacing);
      for (var gx = -groundScroll - groundPatternSpacing; gx < W + groundPatternSpacing; gx += groundPatternSpacing) {
        drawPixelStarCross(gCtx, gx + 18, GROUND_Y + 28, '#FFFFFF');
        drawPixelStarCross(gCtx, gx + 46, GROUND_Y + 48, '#703818');
        gCtx.fillStyle = '#703818';
        gCtx.fillRect(gx + 34, GROUND_Y + 24, 4, 4);
        gCtx.fillRect(gx + 12, GROUND_Y + 50, 4, 4);
      }

      // 잔디 캡 상단 2px 검은 외곽선 + 초록 잔디 + 톱니 프린지
      gCtx.fillStyle = '#181818';
      gCtx.fillRect(0, GROUND_Y - 12, W, 16);
      gCtx.fillStyle = '#88E050';
      gCtx.fillRect(0, GROUND_Y - 10, W, 3);
      gCtx.fillStyle = '#78C830';
      gCtx.fillRect(0, GROUND_Y - 7, W, 6);
      gCtx.fillStyle = '#489818';
      var toothScroll = Math.round((tick * speed) % 12);
      for (varzgx = -toothScroll; varzgx < W + 12; varzgx += 12) {
        gCtx.fillRect(varzgx, GROUND_Y - 2, 7, 4);
      }

      // 10. 좌우 테라코타 픽셀 기둥 프레임 (레퍼런스 이미지의 좌우 벽면 재현)
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

      // 11. 발밑 픽셀 파티클
      for (var p = 0; p < particles.length; p++) {
        var pt = particles[p];
        gCtx.save();
        gCtx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        gCtx.fillStyle = '#181818';
        gCtx.fillRect(Math.round(pt.x) - 1, Math.round(pt.y) - 1, pt.size + 2, pt.size + 2);
        gCtx.fillStyle = pt.color;
        gCtx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
        gCtx.restore();
      }

      // 12. 픽셀아트 수집 아이템 렌더링 (황금 열쇠 / 빨간 열매 / 황금별)
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var bobY = it.y + Math.round(Math.sin((tick + i * 12) * 0.12) * 4);
        if (it.kind === 'star') {
          drawPixelStarItem(gCtx, it.x, bobY);
        } else if (it.kind === 'orb') {
          drawPixelKeyItem(gCtx, it.x, bobY);
        } else {
          drawPixelBerryItem(gCtx, it.x, bobY);
        }
      }

      // 13. 픽셀아트 장애물 & 6~7세용 힌트 배지(⬆️ 점프! / ⬇️ 숙이기!) 렌더링
      gCtx.textAlign = 'center';
      gCtx.textBaseline = 'middle';
      for (var j = 0; j < obstacles.length; j++) {
        var obs = obstacles[j];
        var centerX = Math.round(obs.x + obs.width * 0.5);

        if (obs.category === 'ground') {
          if (obs.spriteKind === 'spiked_block') {
            drawPixelFloatingIsland(gCtx, obs.x, GROUND_Y - 44, obs.width, 36, true);
          } else {
            drawPixelSpikeUp(gCtx, obs.x + 2, GROUND_Y - 10, 15, 22);
            drawPixelSpikeUp(gCtx, obs.x + 17, GROUND_Y - 10, 15, 24);
            drawPixelSpikeUp(gCtx, obs.x + 32, GROUND_Y - 10, 15, 22);
          }
        } else {
          drawPixelFloatingIsland(
            gCtx,
            obs.x,
            obs.y,
            obs.width,
            obs.height,
            obs.spriteKind === 'spiked_island'
          );
        }

        // 픽셀 스타일 안내 배지
        var badgeY = obs.y - 22;
        var badgeW = 84;
        var badgeH = 22;
        gCtx.fillStyle = '#181818';
        gCtx.fillRect(centerX - badgeW * 0.5 - 2, badgeY - badgeH * 0.5 - 2, badgeW + 4, badgeH + 4);
        gCtx.fillStyle = obs.category === 'ground' ? '#FF5722' : '#0288D1';
        gCtx.fillRect(centerX - badgeW * 0.5, badgeY - badgeH * 0.5, badgeW, badgeH);
        gCtx.fillStyle = '#FFFFFF';
        gCtx.font = '900 12px "Noto Sans KR", sans-serif';
        gCtx.fillText(obs.hintText, centerX, badgeY);
      }

      // 14. 점수 보너스 팝업
      for (var k = 0; k < popups.length; k++) {
        var pop = popups[k];
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

    var varzgx = 0;

    function stepFrame() {
      if (isGameOver) return getState();

      tick += 1;
      speed = Math.min(6.8, 4.6 + Math.floor(tick / 360) * 0.22);

      if (tick % 15 === 0) {
        score += 1;
        if (score >= 100 && !rewarded) {
          rewarded = true;
          helpers.rewardCharacter();
        }
        updateHud();
      }

      if (player.invincibleTimer > 0) {
        player.invincibleTimer -= 1;
      }

      if (bubbleTimer > 0) {
        bubbleTimer -= 1;
        if (bubbleTimer === 0) {
          bubbleEl.classList.remove('visible');
        }
      }

      if (player.isDucking && !player.duckKeyHeld) {
        if (player.duckHoldTimer > 0) {
          player.duckHoldTimer -= 1;
          if (player.duckHoldTimer <= 0) {
            player.isDucking = false;
            duckBtn.classList.remove('active');
          }
        }
      } else if (player.isDucking && player.duckHoldTimer > 0) {
        player.duckHoldTimer -= 1;
      }

      if (player.isJumping || player.y < 0 || player.vy !== 0) {
        player.y += player.vy;
        player.vy += GRAVITY;
        if (player.y >= 0) {
          player.y = 0;
          player.vy = 0;
          player.isJumping = false;
          player.jumpCount = 0;
          spawnFootstepDust(3);
        }
      } else if (tick % 4 === 0) {
        spawnFootstepDust(1);
      }

      for (var c = 0; c < clouds.length; c++) {
        clouds[c].x -= clouds[c].speed;
        if (clouds[c].x < -60) clouds[c].x = W + 60;
      }

      for (var p = particles.length - 1; p >= 0; p--) {
        var pt = particles[p];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life -= 1;
        if (pt.life <= 0) particles.splice(p, 1);
      }

      for (var k = popups.length - 1; k >= 0; k--) {
        popups[k].y -= 0.85;
        popups[k].life -= 1;
        if (popups[k].life <= 0) popups.splice(k, 1);
      }

      nextObstacleIn -= 1;
      if (nextObstacleIn <= 0) {
        spawnObstacle();
        nextObstacleIn = 78 + Math.floor(Math.random() * 45);
      }

      nextItemIn -= 1;
      if (nextItemIn <= 0) {
        spawnItem();
        nextItemIn = 42 + Math.floor(Math.random() * 35);
      }

      for (var j = obstacles.length - 1; j >= 0; j--) {
        obstacles[j].x -= speed;
        if (obstacles[j].x + obstacles[j].width < -40) {
          obstacles.splice(j, 1);
        }
      }

      for (var i = items.length - 1; i >= 0; i--) {
        items[i].x -= speed;
        if (items[i].x < -40) {
          items.splice(i, 1);
        }
      }

      checkCollisions();
      syncHeroTransform();
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
      speed = 4.6;
      tick = 0;
      isGameOver = false;
      running = true;
      rewarded = false;
      player.y = 0;
      player.vy = 0;
      player.isJumping = false;
      player.isDucking = false;
      player.duckKeyHeld = false;
      player.duckHoldTimer = 0;
      player.jumpCount = 0;
      player.invincibleTimer = 0;
      obstacles.length = 0;
      items.length = 0;
      particles.length = 0;
      popups.length = 0;
      nextObstacleIn = 75;
      nextItemIn = 40;
      updateHud();
      syncHeroTransform();
      renderCanvas();
      if (rafId !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafId);
      }
      if (typeof requestAnimationFrame === 'function') {
        rafId = requestAnimationFrame(loop);
      }
    }

    function getState() {
      return {
        isJumping: player.isJumping,
        isDucking: player.isDucking,
        isHit: player.invincibleTimer > 0,
        invincibleTimer: player.invincibleTimer,
        y: player.y,
        vy: player.vy,
        jumpCount: player.jumpCount,
        lives: lives,
        maxLives: maxLives,
        score: score,
        highScore: Math.max(highScore, score),
        speed: speed,
        tick: tick,
        running: running,
        isGameOver: isGameOver,
        bubbleText: bubbleText,
        obstacles: obstacles.slice(),
        items: items.slice(),
        player: Object.assign({}, player)
      };
    }

    var lastJumpPointerTime = -1000;
    var lastDuckPointerTime = -1000;

    function onJumpPointerDown(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      lastJumpPointerTime = Date.now();
      jump();
    }

    function onJumpClick(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      if (Date.now() - lastJumpPointerTime < 300) return;
      jump();
    }

    function onDuckPointerDown(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      lastDuckPointerTime = Date.now();
      tapDuckButton();
    }

    function onDuckClick(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      if (Date.now() - lastDuckPointerTime < 300) return;
      tapDuckButton();
    }

    function onDuckEnd(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      player.duckKeyHeld = false;
    }

    function onKeyDown(e) {
      if (!running || isGameOver) return;
      var code = e.code || e.key;
      if (code === 'Space' || code === 'ArrowUp' || code === ' ') {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        jump();
      } else if (code === 'ArrowDown') {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        duck(true);
      }
    }

    function onKeyUp(e) {
      var code = e.code || e.key;
      if (code === 'ArrowDown') {
        player.duckKeyHeld = false;
      }
    }

    jumpBtn.addEventListener('pointerdown', onJumpPointerDown);
    jumpBtn.addEventListener('click', onJumpClick);
    duckBtn.addEventListener('pointerdown', onDuckPointerDown);
    duckBtn.addEventListener('pointerup', onDuckEnd);
    duckBtn.addEventListener('click', onDuckClick);

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
    }

    stageEl._runnerGame = {
      jump: jump,
      duck: duck,
      stepFrame: stepFrame,
      getState: getState,
      spawnObstacle: spawnObstacle,
      spawnItem: spawnItem,
      reset: resetGame
    };

    updateHud();
    syncHeroTransform();
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
      jumpBtn.removeEventListener('pointerdown', onJumpPointerDown);
      jumpBtn.removeEventListener('click', onJumpClick);
      duckBtn.removeEventListener('pointerdown', onDuckPointerDown);
      duckBtn.removeEventListener('pointerup', onDuckEnd);
      duckBtn.removeEventListener('click', onDuckClick);
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      }
      stageEl._runnerGame = null;
    };
  }

  var gameDef = {
    id: 'runner',
    title: '달려라! 포켓몬 점프런',
    subtitle: '폴짝 점프하고 납작 숙여서 달려요!',
    icon: '🏃‍♂️',
    badgeColor: '#FF5252',
    mount: mountRunnerGame
  };

  global.PokeGameRunner = gameDef;
  if (global.PokeMiniGames && typeof global.PokeMiniGames.register === 'function') {
    global.PokeMiniGames.register('runner', gameDef);
  }
})(typeof window !== 'undefined' ? window : globalThis);
