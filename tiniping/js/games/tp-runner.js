/**
 * 티니핑 미니게임 T1: 샤랄라 구름길 점프런 (tp-runner.js)
 * - 6~7세 맞춤 하트 3개 무한 달리기 & 점프/숙이기 액션 게임
 * - 주인공 티니핑 DOM 퍼펫(.tp-runner-hero + 양쪽 마법 날개 .tp-wing)과
 *   16비트 레트로 픽셀아트 플랫폼 월드 <canvas> 배경의 하이브리드 렌더링
 */
(function (global) {
  'use strict';

  var GROUND_OBSTACLES = [
    { icon: '⛈️', name: '뾰족 가시 함정', badge: '⬆️점프!', kind: 'ground', spriteKind: 'spikes' },
    { icon: '🍄', name: '가시 잔디 블록', badge: '⬆️점프!', kind: 'ground', spriteKind: 'spiked_block' },
    { icon: '📦', name: '삼단 강철 가시', badge: '⬆️점프!', kind: 'ground', spriteKind: 'spikes_wide' }
  ];

  var AIR_OBSTACLES = [
    { icon: '☄️', name: '둥둥 잔디섬 블록', badge: '⬇️숙이기!', kind: 'air', spriteKind: 'floating_island' },
    { icon: '🦇', name: '가시 공중 잔디섬', badge: '⬇️숙이기!', kind: 'air', spriteKind: 'spiked_island' },
    { icon: '🌪️', name: '하늘 바위섬 블록', badge: '⬇️숙이기!', kind: 'air', spriteKind: 'floating_island' }
  ];

  var SWEET_ICONS = ['🍰', '🍬', '🍓'];

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildRunnerStyles() {
    return [
      '.tp-runner-wrap {',
      '  position: relative; width: 100%; max-width: 760px; margin: 0 auto;',
      '  display: flex; flex-direction: column; gap: 10px;',
      '  font-family: "Pretendard", "Malgun Gothic", sans-serif; user-select: none;',
      '}',
      '.tp-runner-hud {',
      '  display: flex; align-items: center; justify-content: space-between; gap: 8px;',
      '  background: rgba(255, 255, 255, 0.94); border: 3px solid #181818;',
      '  border-radius: 18px; padding: 8px 14px; box-shadow: 0 4px 0 rgba(0, 0, 0, 0.18);',
      '}',
      '.tp-runner-hearts { font-size: 1.35rem; letter-spacing: 2px; min-width: 90px; }',
      '.tp-runner-guide-badge {',
      '  padding: 5px 12px; border-radius: 999px; font-weight: 800; font-size: 0.95rem;',
      '  background: linear-gradient(135deg, #FFF0F6, #F3E5F5); color: #D81B60;',
      '  border: 2px solid #181818; transition: transform 0.2s ease;',
      '}',
      '.tp-runner-guide-badge.is-alert { transform: scale(1.06); background: #FFF8E1; border-color: #181818; color: #E65100; }',
      '.tp-runner-score-box { text-align: right; font-weight: 800; color: #AD1457; font-size: 1rem; }',
      '.tp-runner-score-box small { display: block; font-size: 0.75rem; color: #8E24AA; font-weight: 700; }',
      '.tp-runner-viewport {',
      '  position: relative; width: 100%; height: 290px; aspect-ratio: 640 / 290; border-radius: 22px; overflow: hidden;',
      '  border: 4px solid #181818; background: #48B8F8;',
      '  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);',
      '}',
      '.tp-runner-canvas {',
      '  width: 100%; height: 100%; display: block;',
      '  image-rendering: pixelated; image-rendering: crisp-edges;',
      '}',
      '.tp-runner-shadow {',
      '  position: absolute; left: calc(17.1875% - 28px); bottom: 16.5%; width: 56px; height: 12px;',
      '  border-radius: 50%; background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.45) 0%, rgba(0, 0, 0, 0.14) 65%, transparent 100%);',
      '  pointer-events: none; z-index: 4; transform-origin: center center; will-change: transform, opacity;',
      '}',
      '.tp-runner-hero {',
      '  position: absolute; left: calc(17.1875% - 42px); bottom: 18.62%; width: 84px; height: 84px;',
      '  display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 5;',
      '  transform-origin: center bottom; will-change: transform, filter;',
      '}',
      '.tp-runner-puppet {',
      '  position: relative; width: 76px; height: 76px; display: flex; align-items: center; justify-content: center;',
      '}',
      '.tp-wing {',
      '  position: absolute; top: 18px; font-size: 1.7rem; line-height: 1; pointer-events: none;',
      '  filter: drop-shadow(0 2px 4px rgba(255, 105, 180, 0.35)); transition: transform 0.06s linear;',
      '}',
      '.tp-wing-left { left: -16px; transform-origin: right center; }',
      '.tp-wing-right { right: -16px; transform-origin: left center; }',
      '.tp-runner-avatar {',
      '  width: 68px; height: 68px; border-radius: 50%; border: 3px solid #181818;',
      '  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35); overflow: hidden;',
      '  display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.5rem; color: #FFF;',
      '  background: #FF69B4; position: relative; z-index: 2;',
      '}',
      '.tp-runner-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }',
      '.tp-runner-avatar .tp-runner-fallback { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }',
      '.tp-runner-bubble {',
      '  position: absolute; bottom: 90px; left: 50%; transform: translateX(-50%);',
      '  white-space: nowrap; background: #FFF8E1; color: #D81B60; font-weight: 900; font-size: 0.82rem;',
      '  padding: 5px 11px; border-radius: 14px; border: 2.5px solid #181818;',
      '  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.22); z-index: 8;',
      '}',
      '.tp-runner-controls {',
      '  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;',
      '}',
      '.tp-runner-btn {',
      '  display: flex; flex-direction: column; align-items: center; justify-content: center;',
      '  padding: 14px 10px; border-radius: 20px; border: 3px solid #181818; cursor: pointer;',
      '  font-family: inherit; font-weight: 900; font-size: 1.15rem; transition: transform 0.1s ease, box-shadow 0.1s ease;',
      '  box-shadow: 0 6px 0 #181818;',
      '}',
      '.tp-runner-btn:active, .tp-runner-btn.is-active { transform: translateY(3px) scale(0.98); box-shadow: 0 2px 0 #181818; }',
      '.tp-runner-btn-jump {',
      '  background: linear-gradient(180deg, #FF80AB 0%, #EC407A 100%); color: #FFFFFF;',
      '}',
      '.tp-runner-btn-duck {',
      '  background: linear-gradient(180deg, #BA68C8 0%, #8E24AA 100%); color: #FFFFFF;',
      '}',
      '.tp-runner-btn small { font-size: 0.76rem; font-weight: 700; opacity: 0.94; margin-top: 3px; }'
    ].join('\n');
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

  function drawPixelSpikeUp(ctx, x, bottomY, w, h) {
    var bx = Math.round(x);
    var by = Math.round(bottomY);
    var sw = w || 14;
    var sh = h || 18;
    ctx.fillStyle = '#181818';
    ctx.fillRect(bx, by - 4, sw, 4);
    ctx.fillRect(bx + 2, by - 8, sw - 4, 4);
    ctx.fillRect(bx + 4, by - 13, sw - 8, 5);
    ctx.fillRect(bx + 6, by - sh, sw - 12, sh - 13);
    ctx.fillStyle = '#E8F0F8';
    ctx.fillRect(bx + 2, by - 4, Math.floor((sw - 4) * 0.5), 2);
    ctx.fillRect(bx + 4, by - 8, Math.floor((sw - 8) * 0.5), 4);
    ctx.fillRect(bx + 6, by - 13, 2, 5);
    ctx.fillStyle = '#788898';
    ctx.fillRect(bx + Math.floor(sw * 0.5), by - 4, Math.floor((sw - 4) * 0.5), 2);
    ctx.fillRect(bx + Math.floor(sw * 0.5), by - 8, Math.floor((sw - 8) * 0.5), 4);
    ctx.fillRect(bx + Math.floor(sw * 0.5), by - 12, 2, 4);
  }

  function drawPixelSpikeDown(ctx, x, topY, w, h) {
    var bx = Math.round(x);
    var ty = Math.round(topY);
    var sw = w || 14;
    var sh = h || 15;
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
    var r = Math.round(20 * s);
    ctx.fillStyle = '#389038';
    ctx.fillRect(x - r, y - th - Math.round(r * 0.9), r * 2, Math.round(r * 0.9));
    ctx.fillStyle = '#58B848';
    ctx.fillRect(x - r + 2, y - th - Math.round(r * 1.45), (r - 2) * 2, Math.round(r * 1.15));
    ctx.fillRect(x - Math.round(r * 0.75), y - th - Math.round(r * 1.75), Math.round(r * 1.5), Math.round(r * 0.4));
    ctx.fillStyle = '#88E060';
    ctx.fillRect(x - Math.round(r * 0.65), y - th - Math.round(r * 1.65), Math.round(r * 1.3), Math.round(5 * s));
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - Math.round(r * 0.45), y - th - Math.round(r * 1.1), 4, 4);
    ctx.fillRect(x + Math.round(r * 0.3), y - th - Math.round(r * 0.8), 4, 4);
  }

  function drawPixelGoalDoor(ctx, x, groundY) {
    var dx = Math.round(x);
    var dy = Math.round(groundY);
    var dw = 46;
    var dh = 54;
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
    ctx.fillRect(dx - 10, top + 19, 20, 20);
    ctx.fillStyle = '#FFE840';
    ctx.fillRect(dx - 8, top + 21, 16, 16);
    ctx.fillStyle = '#181818';
    ctx.fillRect(dx - 3, top + 24, 6, 5);
    ctx.fillRect(dx - 4, top + 29, 8, 6);
  }

  function drawPixelFloatingIsland(ctx, cx, cy, w, h, withTopSpikes) {
    var bw = Math.round(w || 46);
    var bh = Math.round(h || 38);
    var bx = Math.round(cx - bw * 0.5);
    var by = Math.round(cy - bh * 0.5);

    if (withTopSpikes) {
      drawPixelSpikeUp(ctx, bx + 6, by + 2, 14, 15);
      drawPixelSpikeUp(ctx, bx + bw - 20, by + 2, 14, 15);
    }

    ctx.fillStyle = '#181818';
    ctx.fillRect(bx + 2, by + 12, bw - 4, bh - 16);
    ctx.fillRect(bx + 6, by + bh - 6, bw - 12, 6);
    ctx.fillStyle = '#C07040';
    ctx.fillRect(bx + 5, by + 14, bw - 10, bh - 20);
    ctx.fillRect(bx + 9, by + bh - 8, bw - 18, 5);
    drawPixelStarCross(ctx, bx + bw - 15, by + bh - 13, '#FFFFFF');

    ctx.fillStyle = '#181818';
    ctx.fillRect(bx, by, bw, 15);
    ctx.fillStyle = '#88E050';
    ctx.fillRect(bx + 2, by + 2, bw - 4, 3);
    ctx.fillStyle = '#78C830';
    ctx.fillRect(bx + 2, by + 5, bw - 4, 6);
    ctx.fillStyle = '#489818';
    for (var tx = bx + 3; tx < bx + bw - 5; tx += 8) {
      ctx.fillRect(tx, by + 9, 5, 4);
    }
  }

  function drawPixelKeyItem(ctx, cx, cy) {
    var x = Math.round(cx);
    var y = Math.round(cy);
    ctx.fillStyle = '#181818';
    ctx.fillRect(x - 11, y - 15, 22, 14);
    ctx.fillRect(x - 4, y - 1, 8, 16);
    ctx.fillRect(x - 8, y + 6, 5, 4);
    ctx.fillRect(x - 8, y + 11, 5, 4);
    ctx.fillStyle = '#FFE840';
    ctx.fillRect(x - 9, y - 13, 18, 10);
    ctx.fillRect(x - 2, y - 1, 4, 14);
    ctx.fillRect(x - 6, y + 7, 4, 2);
    ctx.fillRect(x - 6, y + 12, 4, 2);
    ctx.fillStyle = '#D89818';
    ctx.fillRect(x - 9, y - 6, 18, 3);
    ctx.fillStyle = '#181818';
    ctx.fillRect(x - 4, y - 9, 8, 4);
  }

  function drawPixelBerryItem(ctx, cx, cy) {
    var x = Math.round(cx);
    var y = Math.round(cy);
    ctx.fillStyle = '#181818';
    ctx.fillRect(x - 9, y - 7, 18, 16);
    ctx.fillRect(x - 6, y - 9, 12, 20);
    ctx.fillStyle = '#F83848';
    ctx.fillRect(x - 7, y - 5, 14, 12);
    ctx.fillRect(x - 4, y - 7, 8, 16);
    ctx.fillStyle = '#FF98A8';
    ctx.fillRect(x - 4, y - 3, 4, 4);
    ctx.fillStyle = '#FFE840';
    ctx.fillRect(x + 2, y - 1, 2, 2);
    ctx.fillRect(x - 2, y + 3, 2, 2);
    ctx.fillStyle = '#181818';
    ctx.fillRect(x - 5, y - 12, 10, 4);
    ctx.fillStyle = '#78C830';
    ctx.fillRect(x - 3, y - 11, 7, 3);
  }

  function drawPixelCrownStarItem(ctx, cx, cy) {
    var x = Math.round(cx);
    var y = Math.round(cy);
    ctx.fillStyle = '#181818';
    ctx.fillRect(x - 4, y - 13, 8, 26);
    ctx.fillRect(x - 13, y - 4, 26, 8);
    ctx.fillRect(x - 8, y - 8, 16, 16);
    ctx.fillStyle = '#FFE840';
    ctx.fillRect(x - 2, y - 11, 4, 22);
    ctx.fillRect(x - 11, y - 2, 22, 4);
    ctx.fillRect(x - 6, y - 6, 12, 12);
    ctx.fillStyle = '#FF80AB';
    ctx.fillRect(x - 3, y - 3, 6, 6);
  }

  function defaultComputeRunTransform(state, tick) {
    var yOffset = Number(state && state.yOffset) || 0;
    var isJumping = Boolean(state && state.isJumping);
    var isDucking = Boolean(state && state.isDucking);
    var isHit = Boolean(state && state.isHit);
    var t = Number(tick) || 0;

    var bounceY = isJumping ? yOffset : Math.sin(t * 0.35) * 4;
    var scaleX = isDucking ? 1.24 : (isJumping ? 0.94 : 1 + Math.sin(t * 0.35) * 0.04);
    var scaleY = isDucking ? 0.62 : (isJumping ? 1.08 : 1 - Math.sin(t * 0.35) * 0.04);
    var rot = isDucking ? 8 : (isJumping ? -6 : Math.sin(t * 0.25) * 4);
    var flap = Math.sin(t * (isJumping ? 0.7 : 0.4)) * (isJumping ? 28 : 16);

    var bodyTransform = 'translateY(' + bounceY.toFixed(1) + 'px) rotate(' + rot.toFixed(1) + 'deg) scale(' + scaleX.toFixed(2) + ', ' + scaleY.toFixed(2) + ')';
    var bodyFilter = isHit && (Math.floor(t / 4) % 2 === 0)
      ? 'brightness(1.5) drop-shadow(0 0 10px #FF1744)'
      : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.38))';

    return {
      transform: bodyTransform,
      bodyTransform: bodyTransform,
      filter: bodyFilter,
      bodyFilter: bodyFilter,
      leftWingTransform: 'rotate(' + (-15 - flap).toFixed(1) + 'deg) scale(' + (isDucking ? 0.85 : 1) + ')',
      rightWingTransform: ' scaleX(-1) rotate(' + (-15 - flap).toFixed(1) + 'deg) scale(' + (isDucking ? 0.85 : 1) + ')',
      wingLeft: 'rotate(' + (-15 - flap).toFixed(1) + 'deg)',
      wingRight: 'scaleX(-1) rotate(' + (-15 - flap).toFixed(1) + 'deg)'
    };
  }

  var gameDef = {
    id: 'runner',
    title: '샤랄라 구름길 점프런',
    subtitle: '폴짝 점프하고 납작 숙여서 구름길을 달려요!',
    icon: '🌈',
    badgeColor: '#FF69B4',

    mount: function (stageEl, charCtx, helpers) {
      if (!stageEl) {
        return function () {};
      }

      var ctxChar = Object.assign({
        name: '하츄핑',
        nameEn: 'Heartsping',
        image: '',
        color: '#FF69B4',
        grade: '로열',
        emotion: '사랑',
        gender: '여',
        mainSeason: 1,
        seasonTheme: '샤랄라 하트',
        seasonEmoji: '🍓',
        pool: []
      }, charCtx || {});

      var safeHelpers = Object.assign({
        playSfx: function () {},
        playCry: function () {},
        computeRunTransform: defaultComputeRunTransform,
        getHighScore: function () { return 0; },
        saveHighScore: function () {},
        rewardCharacter: function () {},
        createHeartExplosion: function () {},
        renderAvatarHtml: null,
        showResultOverlay: function () {}
      }, helpers || {});

      var initialChar = escapeHtml((ctxChar.name || '핑').charAt(0));
      var heroColor = escapeHtml(ctxChar.color || '#FF69B4');
      var highScore = Number(safeHelpers.getHighScore('runner')) || 0;

      var avatarInnerHtml = ctxChar.image
        ? '<img src="' + escapeHtml(ctxChar.image) + '" alt="' + escapeHtml(ctxChar.name) + '" onerror="this.style.display=\'none\';if(this.nextElementSibling)this.nextElementSibling.style.display=\'flex\';" />' +
          '<span class="tp-runner-fallback" style="display:none;background:' + heroColor + ';">' + initialChar + '</span>'
        : '<span class="tp-runner-fallback" style="background:' + heroColor + ';">' + initialChar + '</span>';

      stageEl.innerHTML = [
        '<style class="tp-runner-style">' + buildRunnerStyles() + '</style>',
        '<div class="tp-runner-wrap" data-game="runner">',
        '  <div class="tp-runner-hud">',
        '    <div class="tp-runner-hearts" aria-label="남은 하트">💖💖💖</div>',
        '    <div class="tp-runner-guide-badge">🌈 ' + escapeHtml(ctxChar.name) + '과 구름길 출발!</div>',
        '    <div class="tp-runner-score-box">',
        '      <span class="tp-runner-score-val">0점</span>',
        '      <small class="tp-runner-high-val">👑 최고 ' + highScore + '점</small>',
        '    </div>',
        '  </div>',
        '  <div class="tp-runner-viewport">',
        '    <canvas class="tp-runner-canvas" width="640" height="290"></canvas>',
        '    <div class="tp-runner-shadow"></div>',
        '    <div class="tp-runner-hero">',
        '      <div class="tp-runner-bubble" style="display:none;">앗! 깜짝이야~ 츄!</div>',
        '      <div class="tp-runner-puppet">',
        '        <span class="tp-wing tp-wing-left">🪽</span>',
        '        <div class="tp-runner-avatar" style="background:' + heroColor + ';">' + avatarInnerHtml + '</div>',
        '        <span class="tp-wing tp-wing-right">🪽</span>',
        '      </div>',
        '    </div>',
        '  </div>',
        '  <div class="tp-runner-controls">',
        '    <button type="button" class="tp-runner-btn tp-runner-btn-jump" aria-label="폴짝 점프">',
        '      <span>⬆️ 폴짝 점프!</span>',
        '      <small>공중에서 한 번 더 누르면 2단 점프!</small>',
        '    </button>',
        '    <button type="button" class="tp-runner-btn tp-runner-btn-duck" aria-label="납작 숙이기">',
        '      <span>⬇️ 납작 숙이기!</span>',
        '      <small>날아오는 공중 장애물을 피해요!</small>',
        '    </button>',
        '  </div>',
        '</div>'
      ].join('\n');

      var heartsEl = stageEl.querySelector('.tp-runner-hearts');
      var guideBadgeEl = stageEl.querySelector('.tp-runner-guide-badge');
      var scoreValEl = stageEl.querySelector('.tp-runner-score-val');
      var highValEl = stageEl.querySelector('.tp-runner-high-val');
      var canvasEl = stageEl.querySelector('.tp-runner-canvas');
      var shadowEl = stageEl.querySelector('.tp-runner-shadow');
      var heroEl = stageEl.querySelector('.tp-runner-hero');
      var wingLeftEl = stageEl.querySelector('.tp-wing-left');
      var wingRightEl = stageEl.querySelector('.tp-wing-right');
      var bubbleEl = stageEl.querySelector('.tp-runner-bubble');
      var jumpBtn = stageEl.querySelector('.tp-runner-btn-jump');
      var duckBtn = stageEl.querySelector('.tp-runner-btn-duck');

      var canvasCtx = (canvasEl && typeof canvasEl.getContext === 'function')
        ? canvasEl.getContext('2d')
        : null;

      var CANVAS_W = 640;
      var CANVAS_H = 290;
      var GROUND_Y = 236;
      var HERO_X = 110;

      var tick = 0;
      var score = 0;
      var lives = 3;
      var maxLives = 3;
      var speed = 4.6;
      var isGameOver = false;
      var isCleanedUp = false;
      var rafId = null;

      var player = {
        y: 0,
        vy: 0,
        gravity: 0.62,
        isJumping: false,
        isDucking: false,
        duckHold: false,
        duckTimer: 0,
        jumpCount: 0,
        maxJumpCount: 2,
        jumpProgress: 0,
        invincibleTimer: 0,
        bubbleTimer: 0,
        bubbleText: ''
      };

      var obstacles = [];
      var items = [];
      var particles = [];
      var floatingTexts = [];
      var clouds = [
        { x: 95, y: 46, scale: 1.0, speed: 0.45 },
        { x: 290, y: 74, scale: 1.3, speed: 0.32 },
        { x: 495, y: 40, scale: 0.9, speed: 0.55 }
      ];

      var nextObstacleTick = 55;
      var nextItemTick = 28;

      function showBubble(text, durationFrames) {
        player.bubbleText = text;
        player.bubbleTimer = durationFrames || 65;
        if (bubbleEl) {
          bubbleEl.textContent = text;
          bubbleEl.style.display = 'block';
        }
      }

      function updateHud() {
        if (heartsEl) {
          var full = '';
          for (var i = 0; i < maxLives; i++) {
            full += i < lives ? '💖' : '🤍';
          }
          heartsEl.textContent = full;
        }
        if (scoreValEl) {
          scoreValEl.textContent = score + '점';
        }
        if (highValEl) {
          var best = Math.max(highScore, score);
          highValEl.textContent = '👑 최고 ' + best + '점';
        }
      }

      function spawnFootParticles(count, extraEmoji) {
        for (var i = 0; i < count; i++) {
          particles.push({
            x: HERO_X - 18 + Math.random() * 20,
            y: GROUND_Y + player.y - 6 + Math.random() * 8,
            vx: -1.5 - Math.random() * 2.2,
            vy: -0.8 - Math.random() * 2.0,
            size: 4 + Math.floor(Math.random() * 4),
            alpha: 1,
            color: i % 2 === 0 ? '#FFE840' : (ctxChar.color || '#FF69B4'),
            emoji: extraEmoji || ''
          });
        }
        if (particles.length > 50) {
          particles.splice(0, particles.length - 50);
        }
      }

      function applyPuppetTransform() {
        var statePayload = {
          yOffset: player.y,
          isJumping: player.isJumping,
          isDucking: player.isDucking,
          isHit: player.invincibleTimer > 0,
          jumpProgress: player.jumpProgress
        };
        var computed = null;
        try {
          if (typeof safeHelpers.computeRunTransform === 'function') {
            computed = safeHelpers.computeRunTransform(statePayload, tick);
          }
        } catch (err) {
          computed = null;
        }
        var fallback = defaultComputeRunTransform(statePayload, tick);
        var bodyTransform = fallback.bodyTransform;
        var bodyFilter = fallback.bodyFilter;
        var leftWingTransform = fallback.leftWingTransform;
        var rightWingTransform = fallback.rightWingTransform;

        if (typeof computed === 'string') {
          bodyTransform = computed;
        } else if (computed && typeof computed === 'object') {
          bodyTransform = computed.transform || computed.bodyTransform || bodyTransform;
          bodyFilter = computed.filter || computed.bodyFilter || bodyFilter;
          leftWingTransform = computed.leftWingTransform || computed.wingLeftTransform || computed.wingLeft || leftWingTransform;
          rightWingTransform = computed.rightWingTransform || computed.wingRightTransform || computed.wingRight || rightWingTransform;
        }

        if (heroEl && heroEl.style) {
          heroEl.style.transform = bodyTransform;
          heroEl.style.filter = bodyFilter;
          heroEl.style.opacity = (player.invincibleTimer > 0 && Math.floor(tick / 4) % 2 === 1) ? '0.55' : '1';
        }
        if (shadowEl && shadowEl.style) {
          var shadowScale = Math.max(0.45, 1 - Math.abs(player.y) / 135);
          shadowEl.style.transform = 'scale(' + shadowScale.toFixed(2) + ', ' + shadowScale.toFixed(2) + ')';
          shadowEl.style.opacity = (0.35 * shadowScale).toFixed(2);
        }
        if (wingLeftEl && wingLeftEl.style) {
          wingLeftEl.style.transform = leftWingTransform;
        }
        if (wingRightEl && wingRightEl.style) {
          wingRightEl.style.transform = rightWingTransform;
        }
      }

      function jump() {
        if (isGameOver || isCleanedUp) return false;
        if (player.jumpCount >= player.maxJumpCount) return false;

        player.isDucking = false;
        player.duckHold = false;
        player.duckTimer = 0;
        player.isJumping = true;
        player.jumpCount += 1;
        player.vy = player.jumpCount === 1 ? -11.6 : -10.2;
        player.jumpProgress = 0.05;

        if (duckBtn && duckBtn.classList) {
          duckBtn.classList.remove('is-active');
        }
        if (jumpBtn && jumpBtn.classList) {
          jumpBtn.classList.add('is-active');
        }

        safeHelpers.playSfx('jump', player.jumpCount);
        spawnFootParticles(6);
        if (player.jumpCount === 2) {
          showBubble('샤랄라 2단 점프~! 🪽', 40);
        }
        applyPuppetTransform();
        return true;
      }

      function duck(active, autoMaintainMs) {
        if (isGameOver || isCleanedUp) return false;
        var shouldDuck = active === undefined ? true : Boolean(active);

        if (shouldDuck) {
          player.isDucking = true;
          player.duckHold = !autoMaintainMs;
          player.duckTimer = Math.max(player.duckTimer, 40);
          if (player.isJumping && player.vy < 4) {
            player.vy = 5.5;
          }
          if (duckBtn && duckBtn.classList) {
            duckBtn.classList.add('is-active');
          }
          safeHelpers.playSfx('pop', 0);
        } else {
          player.duckHold = false;
          player.isDucking = false;
          player.duckTimer = 0;
          if (duckBtn && duckBtn.classList) {
            duckBtn.classList.remove('is-active');
          }
        }
        applyPuppetTransform();
        return player.isDucking;
      }

      function tapDuck() {
        if (isGameOver || isCleanedUp) return;
        player.isDucking = true;
        player.duckHold = false;
        player.duckTimer = 40;
        if (player.isJumping && player.vy < 4) {
          player.vy = 5.5;
        }
        if (duckBtn && duckBtn.classList) {
          duckBtn.classList.add('is-active');
        }
        safeHelpers.playSfx('pop', 0);
        applyPuppetTransform();
      }

      function spawnObstacle() {
        var isAir = Math.random() < 0.42;
        var pool = isAir ? AIR_OBSTACLES : GROUND_OBSTACLES;
        var chosen = pool[Math.floor(Math.random() * pool.length)];
        obstacles.push({
          x: CANVAS_W + 40,
          y: isAir ? (GROUND_Y - 64) : (GROUND_Y - 22),
          width: 46,
          height: 40,
          kind: chosen.kind,
          spriteKind: chosen.spriteKind,
          icon: chosen.icon,
          name: chosen.name,
          badge: chosen.badge,
          passed: false
        });
      }

      function spawnItem() {
        var roll = Math.random();
        var itemType = 'sweet';
        var icon = SWEET_ICONS[Math.floor(Math.random() * SWEET_ICONS.length)];
        var pts = 15;

        if (roll < 0.14) {
          itemType = 'crown';
          icon = '👑';
          pts = 50;
        } else if (roll < 0.55) {
          itemType = 'season';
          icon = ctxChar.seasonEmoji || '🔑';
          pts = 20;
        }

        var highLane = Math.random() < 0.45;
        items.push({
          x: CANVAS_W + 30,
          y: highLane ? (GROUND_Y - 92) : (GROUND_Y - 30),
          radius: 18,
          type: itemType,
          icon: icon,
          points: pts,
          collected: false
        });
      }

      function finishGame() {
        if (isGameOver) return;
        isGameOver = true;
        if (rafId != null && typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        var best = Math.max(highScore, score);
        highScore = best;
        safeHelpers.playCry();
        safeHelpers.saveHighScore('runner', score);
        safeHelpers.rewardCharacter();
        updateHud();

        safeHelpers.showResultOverlay(stageEl, {
          gameId: 'runner',
          title: '샤랄라 구름길 달리기 완료!',
          score: score,
          highScore: best,
          charCtx: ctxChar,
          message: ctxChar.name + ' 친구가 무지개 구름길에서 ' + score + '점을 모았어요! 💖'
        });
      }

      function handleObstacleHit() {
        if (player.invincibleTimer > 0 || isGameOver) return;
        lives = Math.max(0, lives - 1);
        player.invincibleTimer = 90;
        safeHelpers.playSfx('hit', 0);
        showBubble('앗! 깜짝이야~ 츄!', 80);
        updateHud();

        if (lives <= 0) {
          finishGame();
        }
      }

      function stepFrame() {
        if (isGameOver || isCleanedUp) return getState();

        tick += 1;
        speed = Math.min(7.5, 4.6 + Math.floor(tick / 360) * 0.25);

        if (tick % 18 === 0) {
          score += 1;
        }

        if (player.isJumping) {
          player.y += player.vy;
          player.vy += player.gravity;
          var normalized = Math.min(1, Math.max(0.05, (player.vy + 12) / 24));
          player.jumpProgress = Number(normalized.toFixed(2));

          if (player.y >= 0) {
            player.y = 0;
            player.vy = 0;
            player.isJumping = false;
            player.jumpCount = 0;
            player.jumpProgress = 0;
            if (jumpBtn && jumpBtn.classList) {
              jumpBtn.classList.remove('is-active');
            }
            spawnFootParticles(4);
          }
        } else {
          player.y = 0;
          player.jumpProgress = 0;
          if (tick % 6 === 0) {
            spawnFootParticles(1);
          }
        }

        if (player.isDucking && !player.duckHold) {
          player.duckTimer -= 1;
          if (player.duckTimer <= 0) {
            player.isDucking = false;
            player.duckTimer = 0;
            if (duckBtn && duckBtn.classList) {
              duckBtn.classList.remove('is-active');
            }
          }
        }

        if (player.invincibleTimer > 0) {
          player.invincibleTimer -= 1;
        }
        if (player.bubbleTimer > 0) {
          player.bubbleTimer -= 1;
          if (player.bubbleTimer <= 0 && bubbleEl) {
            bubbleEl.style.display = 'none';
          }
        }

        if (tick >= nextObstacleTick) {
          spawnObstacle();
          nextObstacleTick = tick + Math.max(58, 95 - Math.floor(speed * 4));
        }
        if (tick >= nextItemTick) {
          spawnItem();
          nextItemTick = tick + 36 + Math.floor(Math.random() * 25);
        }

        var heroCenterY = GROUND_Y + player.y - (player.isDucking ? 18 : 34);
        for (var i = items.length - 1; i >= 0; i--) {
          var item = items[i];
          item.x -= speed;
          var dx = Math.abs(item.x - HERO_X);
          var dy = Math.abs(item.y - heroCenterY);

          if (!item.collected && dx < 38 && dy < 42) {
            item.collected = true;
            score += item.points;
            if (item.type === 'crown') {
              if (lives < maxLives) {
                lives += 1;
              }
              safeHelpers.playSfx('fanfare', 2);
              safeHelpers.createHeartExplosion(HERO_X, heroCenterY);
              showBubble('와아! 로열 왕관별! 💖+1', 55);
              floatingTexts.push({
                x: HERO_X,
                y: heroCenterY - 24,
                text: '+50점 👑하트회복!',
                color: '#FFE840',
                life: 36
              });
            } else {
              safeHelpers.playSfx('coin', 1);
              floatingTexts.push({
                x: HERO_X,
                y: heroCenterY - 20,
                text: '+' + item.points + '점!',
                color: '#FFFFFF',
                life: 28
              });
            }
            items.splice(i, 1);
            continue;
          }
          if (item.x < -50) {
            items.splice(i, 1);
          }
        }

        var nearestUpcoming = null;
        for (var j = obstacles.length - 1; j >= 0; j--) {
          var obs = obstacles[j];
          obs.x -= speed;

          if (obs.x + obs.width >= HERO_X - 24 && (!nearestUpcoming || obs.x < nearestUpcoming.x)) {
            nearestUpcoming = obs;
          }

          var horizOverlap = Math.abs(obs.x - HERO_X) < 30;
          if (horizOverlap) {
            if (obs.kind === 'ground') {
              var jumpedOver = Math.abs(player.y) >= 36;
              if (!jumpedOver) {
                handleObstacleHit(obs);
              }
            } else if (obs.kind === 'air') {
              var duckedUnder = player.isDucking && Math.abs(player.y) < 25;
              if (!duckedUnder) {
                handleObstacleHit(obs);
              }
            }
          }

          if (!obs.passed && obs.x < HERO_X - 34) {
            obs.passed = true;
            score += 10;
          }

          if (obs.x < -70) {
            obstacles.splice(j, 1);
          }
        }

        if (guideBadgeEl) {
          if (nearestUpcoming && nearestUpcoming.x - HERO_X < 260) {
            guideBadgeEl.textContent = nearestUpcoming.badge + ' (' + nearestUpcoming.name + ')';
            if (guideBadgeEl.classList) guideBadgeEl.classList.add('is-alert');
          } else {
            guideBadgeEl.textContent = '🌈 황금 열쇠와 열매를 모으며 달려요!';
            if (guideBadgeEl.classList) guideBadgeEl.classList.remove('is-alert');
          }
        }

        for (var p = particles.length - 1; p >= 0; p--) {
          var pt = particles[p];
          pt.x += pt.vx;
          pt.y += pt.vy;
          pt.alpha -= 0.04;
          if (pt.alpha <= 0) {
            particles.splice(p, 1);
          }
        }
        for (var f = floatingTexts.length - 1; f >= 0; f--) {
          var ft = floatingTexts[f];
          ft.y -= 1.1;
          ft.life -= 1;
          if (ft.life <= 0) {
            floatingTexts.splice(f, 1);
          }
        }

        applyPuppetTransform();
        updateHud();
        renderCanvas();

        return getState();
      }

      function renderCanvas() {
        if (!canvasCtx) return;
        try {
          canvasCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);

          // 1. 픽셀 블루 하늘 (#48B8F8)
          canvasCtx.fillStyle = '#48B8F8';
          canvasCtx.fillRect(0, 0, CANVAS_W, GROUND_Y);

          // 2. 원경 거대 흰색 계단형 구름산맥
          var mtnScroll = (tick * speed * 0.1) % 220;
          for (var mx = -mtnScroll - 110; mx < CANVAS_W + 220; mx += 220) {
            var bmx = Math.round(mx);
            canvasCtx.fillStyle = '#D8F0FF';
            canvasCtx.fillRect(bmx, GROUND_Y - 96, 220, 24);
            canvasCtx.fillStyle = '#FFFFFF';
            canvasCtx.fillRect(bmx + 14, GROUND_Y - 112, 192, 18);
            canvasCtx.fillRect(bmx + 34, GROUND_Y - 126, 148, 15);
            canvasCtx.fillRect(bmx + 60, GROUND_Y - 140, 92, 14);
            canvasCtx.fillRect(bmx + 82, GROUND_Y - 152, 46, 12);
          }

          // 3. 계단식 픽셀 구름
          for (var c = 0; c < clouds.length; c++) {
            var cl = clouds[c];
            cl.x -= cl.speed;
            if (cl.x < -60) cl.x = CANVAS_W + 60;
            drawPixelCloud(canvasCtx, cl.x, cl.y, cl.scale);
          }

          // 4. 민트색 원경 덤불 수관 (#98E898)
          var bushScroll = (tick * speed * 0.2) % 52;
          canvasCtx.fillStyle = '#78D080';
          canvasCtx.fillRect(0, GROUND_Y - 78, CANVAS_W, 22);
          canvasCtx.fillStyle = '#98E898';
          for (var bx = -bushScroll - 52; bx < CANVAS_W + 52; bx += 52) {
            var rbx = Math.round(bx);
            canvasCtx.fillRect(rbx + 4, GROUND_Y - 88, 44, 14);
            canvasCtx.fillRect(rbx + 10, GROUND_Y - 94, 32, 6);
            canvasCtx.fillStyle = '#68B870';
            canvasCtx.fillRect(rbx + 24, GROUND_Y - 86, 4, 8);
            canvasCtx.fillStyle = '#98E898';
          }

          // 5. 짙은 숲 배경띠 (#205848) & 초원 잔디밭 (#58B848)
          canvasCtx.fillStyle = '#205848';
          canvasCtx.fillRect(0, GROUND_Y - 58, CANVAS_W, 28);
          canvasCtx.fillStyle = '#307860';
          var darkTreeScroll = (tick * speed * 0.28) % 42;
          for (var dtx = -darkTreeScroll; dtx < CANVAS_W + 42; dtx += 42) {
            canvasCtx.fillRect(Math.round(dtx) + 8, GROUND_Y - 52, 22, 22);
          }
          canvasCtx.fillStyle = '#58B848';
          canvasCtx.fillRect(0, GROUND_Y - 30, CANVAS_W, 30);

          // 6. 둥근 픽셀 나무 행렬
          var treeSpacing = 120;
          var treeScroll = (tick * speed * 0.45) % treeSpacing;
          for (var tx = -treeScroll; tx < CANVAS_W + treeSpacing; tx += treeSpacing) {
            drawPixelTree(canvasCtx, tx + 30, GROUND_Y - 12, 0.9);
            drawPixelTree(canvasCtx, tx + 86, GROUND_Y - 6, 0.74);
          }

          // 7. 스테이지 랜드마크: 빨간 아치형 픽셀 골 도어
          var doorCycle = 640;
          var doorX = CANVAS_W - ((tick * speed * 0.65 + 140) % doorCycle) + 70;
          if (doorX > -40 && doorX < CANVAS_W + 40) {
            drawPixelGoalDoor(canvasCtx, doorX, GROUND_Y - 10);
          }

          // 8. 상단 천장 픽셀 가시열
          for (var sx = 26; sx < CANVAS_W - 38; sx += 22) {
            drawPixelSpikeDown(canvasCtx, sx, 0, 14, 14);
          }

          // 9. 테라코타 별무늬 흙 바닥 (#C07040) & 픽셀 잔디 캡 (#78C830)
          canvasCtx.fillStyle = '#C07040';
          canvasCtx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

          var groundPatternSpacing = 54;
          var groundScroll = Math.round((tick * speed) % groundPatternSpacing);
          for (var gx = -groundScroll - groundPatternSpacing; gx < CANVAS_W + groundPatternSpacing; gx += groundPatternSpacing) {
            drawPixelStarCross(canvasCtx, gx + 18, GROUND_Y + 24, '#FFFFFF');
            drawPixelStarCross(canvasCtx, gx + 44, GROUND_Y + 40, '#703818');
            canvasCtx.fillStyle = '#703818';
            canvasCtx.fillRect(gx + 32, GROUND_Y + 20, 4, 4);
          }

          canvasCtx.fillStyle = '#181818';
          canvasCtx.fillRect(0, GROUND_Y - 11, CANVAS_W, 15);
          canvasCtx.fillStyle = '#88E050';
          canvasCtx.fillRect(0, GROUND_Y - 9, CANVAS_W, 3);
          canvasCtx.fillStyle = '#78C830';
          canvasCtx.fillRect(0, GROUND_Y - 6, CANVAS_W, 5);
          canvasCtx.fillStyle = '#489818';
          var toothScroll = Math.round((tick * speed) % 12);
          for (var tgx = -toothScroll; tgx < CANVAS_W + 12; tgx += 12) {
            canvasCtx.fillRect(tgx, GROUND_Y - 2, 7, 4);
          }

          // 10. 좌우 테라코타 픽셀 기둥 프레임
          var pillarW = 20;
          canvasCtx.fillStyle = '#181818';
          canvasCtx.fillRect(0, 0, pillarW + 3, CANVAS_H);
          canvasCtx.fillRect(CANVAS_W - pillarW - 3, 0, pillarW + 3, CANVAS_H);
          canvasCtx.fillStyle = '#C07040';
          canvasCtx.fillRect(0, 0, pillarW, CANVAS_H);
          canvasCtx.fillRect(CANVAS_W - pillarW, 0, pillarW, CANVAS_H);
          for (var py = 24; py < CANVAS_H - 16; py += 46) {
            drawPixelStarCross(canvasCtx, 10, py, '#FFFFFF');
            drawPixelStarCross(canvasCtx, CANVAS_W - 10, py, '#FFFFFF');
            canvasCtx.fillStyle = '#703818';
            canvasCtx.fillRect(8, py + 22, 4, 4);
            canvasCtx.fillRect(CANVAS_W - 12, py + 22, 4, 4);
          }

          // 11. 발밑 픽셀 파티클
          for (var p = 0; p < particles.length; p++) {
            var pt = particles[p];
            canvasCtx.save();
            canvasCtx.globalAlpha = Math.max(0, pt.alpha);
            canvasCtx.fillStyle = '#181818';
            canvasCtx.fillRect(Math.round(pt.x) - 1, Math.round(pt.y) - 1, pt.size + 2, pt.size + 2);
            canvasCtx.fillStyle = pt.color;
            canvasCtx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
            canvasCtx.restore();
          }

          // 12. 픽셀아트 아이템 렌더링 (황금 열쇠 / 빨간 열매 / 왕관별)
          for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var bob = Math.round(Math.sin((tick + i * 10) * 0.15) * 4);
            if (item.type === 'crown') {
              drawPixelCrownStarItem(canvasCtx, item.x, item.y + bob);
            } else if (item.type === 'season') {
              drawPixelKeyItem(canvasCtx, item.x, item.y + bob);
            } else {
              drawPixelBerryItem(canvasCtx, item.x, item.y + bob);
            }
          }

          // 13. 픽셀아트 장애물 + 친절한 안내 배지(⬆️점프! / ⬇️숙이기!) 렌더링
          canvasCtx.textAlign = 'center';
          canvasCtx.textBaseline = 'middle';
          for (var j = 0; j < obstacles.length; j++) {
            var obs = obstacles[j];
            if (obs.kind === 'ground') {
              if (obs.spriteKind === 'spiked_block') {
                drawPixelFloatingIsland(canvasCtx, obs.x, GROUND_Y - 26, 46, 34, true);
              } else {
                drawPixelSpikeUp(canvasCtx, obs.x - 21, GROUND_Y - 10, 14, 21);
                drawPixelSpikeUp(canvasCtx, obs.x - 7, GROUND_Y - 10, 14, 23);
                drawPixelSpikeUp(canvasCtx, obs.x + 7, GROUND_Y - 10, 14, 21);
              }
            } else {
              drawPixelFloatingIsland(
                canvasCtx,
                obs.x,
                obs.y,
                48,
                38,
                obs.spriteKind === 'spiked_island'
              );
            }

            // 픽셀 스타일 안내 배지
            var badgeY = obs.y - 34;
            canvasCtx.fillStyle = '#181818';
            canvasCtx.fillRect(obs.x - 38, badgeY - 13, 76, 24);
            canvasCtx.fillStyle = obs.kind === 'ground' ? '#FF4081' : '#7B1FA2';
            canvasCtx.fillRect(obs.x - 36, badgeY - 11, 72, 20);
            canvasCtx.fillStyle = '#FFFFFF';
            canvasCtx.font = 'bold 12px sans-serif';
            canvasCtx.fillText(obs.badge, obs.x, badgeY);
          }

          // 14. 플로팅 텍스트
          for (var f = 0; f < floatingTexts.length; f++) {
            var ft = floatingTexts[f];
            canvasCtx.fillStyle = '#181818';
            canvasCtx.font = 'bold 15px sans-serif';
            canvasCtx.fillText(ft.text, ft.x + 1, ft.y + 1);
            canvasCtx.fillStyle = ft.color;
            canvasCtx.fillText(ft.text, ft.x, ft.y);
          }
        } catch (err) {
          // 캔버스 모킹 환경 안전 무시
        }
      }

      function loop() {
        if (isGameOver || isCleanedUp) return;
        stepFrame();
        if (!isGameOver && !isCleanedUp && typeof requestAnimationFrame === 'function') {
          rafId = requestAnimationFrame(loop);
        }
      }

      function onKeyDown(e) {
        if (isGameOver || isCleanedUp) return;
        var key = e && (e.code || e.key);
        if (key === 'Space' || key === ' ' || key === 'ArrowUp') {
          if (e.preventDefault) e.preventDefault();
          jump();
        } else if (key === 'ArrowDown') {
          if (e.preventDefault) e.preventDefault();
          duck(true);
        }
      }

      function onKeyUp(e) {
        if (isGameOver || isCleanedUp) return;
        var key = e && (e.code || e.key);
        if (key === 'ArrowDown') {
          duck(false);
        }
      }

      var lastJumpPointerTime = 0;
      var lastDuckPointerTime = 0;

      function onJumpPointerDown(e) {
        if (e && e.preventDefault) e.preventDefault();
        lastJumpPointerTime = Date.now();
        jump();
      }

      function onJumpButtonClick(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (Date.now() - lastJumpPointerTime < 450) return;
        jump();
      }

      function onDuckPointerDown(e) {
        if (e && e.preventDefault) e.preventDefault();
        lastDuckPointerTime = Date.now();
        tapDuck();
      }

      function onDuckButtonClick(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (Date.now() - lastDuckPointerTime < 450) return;
        tapDuck();
      }

      if (jumpBtn && jumpBtn.addEventListener) {
        jumpBtn.addEventListener('pointerdown', onJumpPointerDown);
        jumpBtn.addEventListener('click', onJumpButtonClick);
      }
      if (duckBtn && duckBtn.addEventListener) {
        duckBtn.addEventListener('pointerdown', onDuckPointerDown);
        duckBtn.addEventListener('click', onDuckButtonClick);
      }
      if (global.addEventListener) {
        global.addEventListener('keydown', onKeyDown);
        global.addEventListener('keyup', onKeyUp);
      }

      function getState() {
        return {
          score: score,
          highScore: Math.max(highScore, score),
          lives: lives,
          maxLives: maxLives,
          tick: tick,
          speed: speed,
          isJumping: player.isJumping,
          isDucking: player.isDucking,
          isHit: player.invincibleTimer > 0,
          invincibleTimer: player.invincibleTimer,
          jumpCount: player.jumpCount,
          jumpProgress: player.jumpProgress,
          y: player.y,
          yOffset: player.y,
          obstacles: obstacles.slice(),
          items: items.slice(),
          isGameOver: isGameOver,
          isCleanedUp: isCleanedUp
        };
      }

      // 테스트 훅 노출
      stageEl._tpRunnerGame = {
        jump: jump,
        duck: duck,
        stepFrame: stepFrame,
        getState: getState,
        spawnObstacle: spawnObstacle,
        spawnItem: spawnItem
      };

      applyPuppetTransform();
      updateHud();
      renderCanvas();

      if (typeof requestAnimationFrame === 'function') {
        rafId = requestAnimationFrame(loop);
      }

      return function cleanup() {
        isCleanedUp = true;
        isGameOver = true;
        if (rafId != null && typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        if (jumpBtn && jumpBtn.removeEventListener) {
          jumpBtn.removeEventListener('pointerdown', onJumpPointerDown);
          jumpBtn.removeEventListener('click', onJumpButtonClick);
        }
        if (duckBtn && duckBtn.removeEventListener) {
          duckBtn.removeEventListener('pointerdown', onDuckPointerDown);
          duckBtn.removeEventListener('click', onDuckButtonClick);
        }
        if (global.removeEventListener) {
          global.removeEventListener('keydown', onKeyDown);
          global.removeEventListener('keyup', onKeyUp);
        }
      };
    }
  };

  if (global.TpMiniGames && typeof global.TpMiniGames.register === 'function') {
    global.TpMiniGames.register(gameDef.id, gameDef);
  }
  global.TpGameRunner = gameDef;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = gameDef;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
