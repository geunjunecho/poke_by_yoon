/**
 * 티니핑 미니게임 T1: 샤랄라 구름길 점프런 (tp-runner.js)
 * - 6~7세 맞춤 하트 3개 무한 달리기 & 점프/숙이기 액션 게임 (숙이기 버튼 누르는 동안만 숙이기 유지)
 * - 주인공 티니핑 DOM 퍼펫(.tp-runner-hero + 양쪽 마법 날개 .tp-wing)과
 *   원경(파스텔 안개 배경)/전경(고대비 점프·숙이기 액션 레이어) 분리 캔버스 + 충돌 시 '팅! 팅!' 2단 넉백 바운스 물리 적용
 */
(function (global) {
  'use strict';

  var GROUND_OBSTACLES = [
    { icon: '⛈️', name: '뾰족 가시 함정', kind: 'ground', spriteKind: 'spikes' },
    { icon: '🍄', name: '위험 가시 블록', kind: 'ground', spriteKind: 'hazard_block' },
    { icon: '📦', name: '삼단 강철 가시', kind: 'ground', spriteKind: 'spikes_wide' }
  ];

  var AIR_OBSTACLES = [
    { icon: '☄️', name: '공중 마법 배리어', kind: 'air', spriteKind: 'sky_barricade' },
    { icon: '🦇', name: '하늘 가시 블록', kind: 'air', spriteKind: 'spiked_drone' },
    { icon: '🌪️', name: '공중 번개 배리어', kind: 'air', spriteKind: 'sky_barricade' }
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
      '  font-family: "Pretendard", "Malgun Gothic", sans-serif; user-select: none; -webkit-user-select: none;',
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
      '.tp-runner-score-box { text-align: right; font-weight: 800; color: #AD1457; font-size: 1rem; }',
      '.tp-runner-score-box small { display: block; font-size: 0.75rem; color: #8E24AA; font-weight: 700; }',
      '.tp-runner-viewport {',
      '  position: relative; width: 100%; height: 290px; aspect-ratio: 640 / 290; border-radius: 22px; overflow: hidden;',
      '  border: 4px solid #181818; background: #8AD4FF;',
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
      '  box-shadow: 0 6px 0 #181818; touch-action: none; user-select: none; -webkit-user-select: none;',
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
  // 원경(저채도 파스텔) vs 전경(고대비 블랙 아웃라인 액션 레이어) 픽셀 렌더러 헬퍼
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
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = '#D8F0FF';
    ctx.fillRect(bx - u * 5, by + u * 2, u * 11, u * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(bx - u * 4, by, u * 9, u * 2);
    ctx.fillRect(bx - u * 3, by - u * 2, u * 6, u * 2);
    ctx.fillRect(bx - u, by - u * 3, u * 3, u);
    ctx.restore();
  }

  function drawDistantPastelTree(ctx, cx, baseY, scale) {
    var s = scale || 1;
    var x = Math.round(cx);
    var y = Math.round(baseY);
    var tw = Math.round(10 * s);
    var th = Math.round(14 * s);
    var r = Math.round(17 * s);
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = '#7AA8B8';
    ctx.fillRect(x - Math.floor(tw * 0.5), y - th, tw, th);
    ctx.fillStyle = '#88C8B8';
    ctx.fillRect(x - r, y - th - Math.round(r * 0.85), r * 2, Math.round(r * 0.85));
    ctx.fillStyle = '#A4DEC8';
    ctx.fillRect(x - r + 2, y - th - Math.round(r * 1.4), (r - 2) * 2, Math.round(r * 1.1));
    ctx.restore();
  }

  function drawPixelSpikeUp(ctx, x, bottomY, w, h) {
    var bx = Math.round(x);
    var by = Math.round(bottomY);
    var sw = w || 15;
    var sh = h || 24;
    ctx.fillStyle = '#181818';
    ctx.fillRect(bx, by - 5, sw, 5);
    ctx.fillRect(bx + 2, by - 10, sw - 4, 5);
    ctx.fillRect(bx + 4, by - 16, sw - 8, 6);
    ctx.fillRect(bx + 6, by - sh, sw - 12, sh - 16);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(bx + 2, by - 5, Math.floor((sw - 4) * 0.5), 3);
    ctx.fillRect(bx + 4, by - 10, Math.floor((sw - 8) * 0.5), 5);
    ctx.fillRect(bx + 6, by - 16, 2, 6);
    ctx.fillStyle = '#FF3B30';
    ctx.fillRect(bx + Math.floor(sw * 0.5), by - 5, Math.floor((sw - 4) * 0.5), 3);
    ctx.fillRect(bx + Math.floor(sw * 0.5), by - 10, Math.floor((sw - 8) * 0.5), 5);
    ctx.fillRect(bx + Math.floor(sw * 0.5), by - 15, 2, 5);
  }

  function drawPixelSpikeDown(ctx, x, topY, w, h) {
    var bx = Math.round(x);
    var ty = Math.round(topY);
    var sw = w || 14;
    var sh = h || 14;
    ctx.fillStyle = '#181818';
    ctx.fillRect(bx, ty, sw, 4);
    ctx.fillRect(bx + 2, ty + 4, sw - 4, 4);
    ctx.fillRect(bx + 4, ty + 8, sw - 8, 4);
    ctx.fillRect(bx + 6, ty + 11, sw - 12, Math.max(2, sh - 11));
    ctx.fillStyle = '#FFE840';
    ctx.fillRect(bx + 2, ty + 2, Math.floor((sw - 4) * 0.5), 2);
    ctx.fillRect(bx + 4, ty + 4, Math.floor((sw - 8) * 0.5), 4);
    ctx.fillStyle = '#FF3B30';
    ctx.fillRect(bx + Math.floor(sw * 0.5), ty + 2, Math.floor((sw - 4) * 0.5), 2);
    ctx.fillRect(bx + Math.floor(sw * 0.5), ty + 4, Math.floor((sw - 8) * 0.5), 4);
  }

  function drawGroundHazardObstacle(ctx, obs, groundY) {
    var bw = Math.round(obs.width || 46);
    var bh = Math.round(obs.height || 38);
    var bx = Math.round(obs.x - bw * 0.5);
    var by = Math.round(groundY - bh);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(bx - 4, groundY - 3, bw + 8, 6);

    if (obs.spriteKind === 'hazard_block') {
      drawPixelSpikeUp(ctx, bx + 5, by + 10, 15, 16);
      drawPixelSpikeUp(ctx, bx + bw - 20, by + 10, 15, 16);

      ctx.fillStyle = '#181818';
      ctx.fillRect(bx, by + 8, bw, bh - 8);
      ctx.fillStyle = '#FF3B30';
      ctx.fillRect(bx + 3, by + 11, bw - 6, bh - 14);

      ctx.fillStyle = '#FFE840';
      ctx.fillRect(bx + 3, by + 11, bw - 6, 6);
      ctx.fillStyle = '#181818';
      for (var sx = bx + 6; sx < bx + bw - 8; sx += 10) {
        ctx.fillRect(sx, by + 11, 5, 6);
      }

      ctx.fillStyle = '#181818';
      ctx.fillRect(bx + 10, by + 20, bw - 20, 10);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(bx + 13, by + 22, 5, 5);
      ctx.fillRect(bx + bw - 18, by + 22, 5, 5);
    } else {
      ctx.fillStyle = '#181818';
      ctx.fillRect(bx, groundY - 11, bw, 11);
      ctx.fillStyle = '#FFE840';
      ctx.fillRect(bx + 3, groundY - 8, bw - 6, 5);
      ctx.fillStyle = '#181818';
      for (var k = bx + 6; k < bx + bw - 6; k += 10) {
        ctx.fillRect(k, groundY - 8, 5, 5);
      }
      drawPixelSpikeUp(ctx, bx + 1, groundY - 9, 15, 25);
      drawPixelSpikeUp(ctx, bx + 16, groundY - 9, 15, 29);
      drawPixelSpikeUp(ctx, bx + 31, groundY - 9, 15, 25);
    }
  }

  function drawAirHazardObstacle(ctx, obs, groundY, tick) {
    var bw = Math.round(obs.width || 50);
    var bh = Math.round(obs.height || 40);
    var bx = Math.round(obs.x - bw * 0.5);
    var hoverBob = Math.round(Math.sin((tick || 0) * 0.15) * 2);
    var by = Math.round(obs.y - bh * 0.5 + hoverBob);
    var bottomEdge = by + bh;

    // 아래쪽 숙이기 안전 통과 터널 영역 하이라이트
    ctx.save();
    ctx.fillStyle = 'rgba(142, 36, 170, 0.14)';
    ctx.fillRect(bx + 4, bottomEdge, bw - 8, groundY - bottomEdge);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fillRect(bx + 6, groundY - 2, bw - 12, 4);
    ctx.restore();

    // 천장 서포트 체인
    ctx.fillStyle = 'rgba(24, 24, 24, 0.35)';
    ctx.fillRect(bx + 9, 0, 4, by);
    ctx.fillRect(bx + bw - 13, 0, 4, by);

    ctx.fillStyle = '#181818';
    ctx.fillRect(bx, by, bw, bh - 10);

    ctx.fillStyle = '#8E24AA';
    ctx.fillRect(bx + 3, by + 3, bw - 6, bh - 16);
    ctx.fillStyle = '#EA80FC';
    ctx.fillRect(bx + 5, by + 5, bw - 10, 5);

    ctx.fillStyle = '#FFE840';
    ctx.fillRect(bx + 5, by + bh - 20, bw - 10, 6);
    ctx.fillStyle = '#181818';
    for (var sx = bx + 7; sx < bx + bw - 9; sx += 10) {
      ctx.fillRect(sx, by + bh - 20, 5, 6);
    }

    drawPixelSpikeDown(ctx, bx + 3, by + bh - 12, 13, 12);
    drawPixelSpikeDown(ctx, bx + Math.floor(bw * 0.5) - 6, by + bh - 12, 13, 14);
    drawPixelSpikeDown(ctx, bx + bw - 16, by + bh - 12, 13, 12);
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

    var bounceY = isJumping ? yOffset : (isDucking ? 10 : Math.sin(t * 0.35) * 4);
    var scaleX = isDucking ? 1.28 : (isJumping ? 0.94 : 1 + Math.sin(t * 0.35) * 0.04);
    var scaleY = isDucking ? 0.58 : (isJumping ? 1.08 : 1 - Math.sin(t * 0.35) * 0.04);
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
        '    <div class="tp-runner-guide-badge">🌈 ' + escapeHtml(ctxChar.name) + '과 구름길 달리기!</div>',
        '    <div class="tp-runner-score-box">',
        '      <span class="tp-runner-score-val">0점</span>',
        '      <small class="tp-runner-high-val">👑 최고 ' + highScore + '점</small>',
        '    </div>',
        '  </div>',
        '  <div class="tp-runner-viewport">',
        '    <canvas class="tp-runner-canvas" width="640" height="290"></canvas>',
        '    <div class="tp-runner-shadow"></div>',
        '    <div class="tp-runner-hero">',
        '      <div class="tp-runner-bubble" style="display:none;"></div>',
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
        '      <small>누르고 있는 동안 납작 숙여요!</small>',
        '    </button>',
        '  </div>',
        '</div>'
      ].join('\n');

      var heartsEl = stageEl.querySelector('.tp-runner-hearts');
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
      var KNOCKBACK_DURATION = 34;

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
        jumpCount: 0,
        maxJumpCount: 2,
        jumpProgress: 0,
        invincibleTimer: 0,
        knockbackTimer: 0,
        knockbackX: 0,
        knockbackBounceY: 0,
        knockbackTilt: 0,
        bubbleTimer: 0,
        bubbleText: ''
      };

      var obstacles = [];
      var items = [];
      var particles = [];
      var floatingTexts = [];
      var clouds = [
        { x: 95, y: 44, scale: 1.0, speed: 0.35 },
        { x: 290, y: 70, scale: 1.25, speed: 0.25 },
        { x: 495, y: 38, scale: 0.9, speed: 0.42 }
      ];

      var nextObstacleTick = 55;
      var nextItemTick = 28;

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

      function spawnFootParticles(count, customX, customColor) {
        var baseX = customX !== undefined ? customX : HERO_X + player.knockbackX - 14;
        for (var i = 0; i < count; i++) {
          particles.push({
            x: baseX + Math.random() * 18,
            y: GROUND_Y + player.y - 6 + Math.random() * 8,
            vx: -1.5 - Math.random() * 2.2,
            vy: -0.8 - Math.random() * 2.0,
            size: 4 + Math.floor(Math.random() * 4),
            alpha: 1,
            color: customColor || (i % 2 === 0 ? '#FFE840' : (ctxChar.color || '#FF69B4'))
          });
        }
        if (particles.length > 60) {
          particles.splice(0, particles.length - 60);
        }
      }

      function spawnHitBounceSparks(x, y) {
        var colors = ['#FF3B30', '#FFE840', '#FFFFFF', '#FF80AB'];
        for (var i = 0; i < 10; i++) {
          var angle = (Math.PI * 2 * i) / 10;
          var spd = 2.0 + Math.random() * 2.4;
          particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd - 1.0,
            size: 5 + (i % 3),
            alpha: 1,
            color: colors[i % colors.length]
          });
        }
      }

      function computeKnockbackKinematics() {
        if (player.knockbackTimer <= 0) {
          player.knockbackX = 0;
          player.knockbackBounceY = 0;
          player.knockbackTilt = 0;
          return;
        }
        var progress = 1 - player.knockbackTimer / KNOCKBACK_DURATION;
        var kx = 0;
        var ky = 0;
        var kt = 0;

        if (progress < 0.45) {
          var p1 = progress / 0.45;
          kx = -30 * p1;
          ky = -Math.sin(p1 * Math.PI) * 26;
          kt = -Math.sin(p1 * Math.PI) * 18;
        } else if (progress < 0.80) {
          var p2 = (progress - 0.45) / 0.35;
          kx = -30 - 12 * p2;
          ky = -Math.sin(p2 * Math.PI) * 14;
          kt = -Math.sin(p2 * Math.PI) * 12;
        } else {
          var p3 = (progress - 0.80) / 0.20;
          kx = -42 * (1 - p3);
          ky = 0;
          kt = 6 * (1 - p3);
        }

        player.knockbackX = Number(kx.toFixed(2));
        player.knockbackBounceY = Number(ky.toFixed(2));
        player.knockbackTilt = Number(kt.toFixed(2));
      }

      function applyPuppetTransform() {
        computeKnockbackKinematics();
        var effectiveY = player.y + player.knockbackBounceY;

        var statePayload = {
          yOffset: effectiveY,
          isJumping: player.isJumping || player.knockbackBounceY < -2,
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

        var knockbackSuffix =
          player.knockbackTimer > 0
            ? ' translateX(' +
              Math.round(player.knockbackX) +
              'px) translateY(' +
              Math.round(player.knockbackBounceY) +
              'px) rotate(' +
              player.knockbackTilt.toFixed(1) +
              'deg)'
            : '';

        if (heroEl && heroEl.style) {
          heroEl.style.transform = bodyTransform + knockbackSuffix;
          heroEl.style.filter = bodyFilter;
          heroEl.style.opacity = (player.invincibleTimer > 0 && Math.floor(tick / 4) % 2 === 1) ? '0.6' : '1';
        }
        if (shadowEl && shadowEl.style) {
          var shadowScale = Math.max(0.45, 1 - Math.abs(effectiveY) / 135);
          shadowEl.style.transform =
            'translateX(' +
            Math.round(player.knockbackX) +
            'px) scale(' +
            shadowScale.toFixed(2) +
            ', ' +
            shadowScale.toFixed(2) +
            ')';
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
        spawnFootParticles(5);
        applyPuppetTransform();
        return true;
      }

      // 숙이기: 누르고 있는 동안(active === true)만 숙이고, 떼면(active === false) 즉시 일어남
      function duck(active) {
        if (isGameOver || isCleanedUp) return false;
        var shouldDuck = active === undefined ? true : Boolean(active);

        if (shouldDuck) {
          var wasDucking = player.isDucking;
          player.isDucking = true;
          player.duckHold = true;
          player.y = 0;
          player.vy = 0;
          player.isJumping = false;
          player.jumpCount = 0;
          player.jumpProgress = 0;
          if (duckBtn && duckBtn.classList) {
            duckBtn.classList.add('is-active');
          }
          if (!wasDucking) {
            safeHelpers.playSfx('pop', 0);
          }
        } else {
          player.duckHold = false;
          player.isDucking = false;
          if (duckBtn && duckBtn.classList) {
            duckBtn.classList.remove('is-active');
          }
        }
        applyPuppetTransform();
        return player.isDucking;
      }

      function spawnObstacle(forcedKind) {
        var isAir = forcedKind ? forcedKind === 'air' : Math.random() < 0.42;
        var pool = isAir ? AIR_OBSTACLES : GROUND_OBSTACLES;
        var chosen = pool[Math.floor(Math.random() * pool.length)];
        obstacles.push({
          x: CANVAS_W + 40,
          y: isAir ? (GROUND_Y - 68) : (GROUND_Y - 22),
          width: isAir ? 52 : 46,
          height: isAir ? 42 : 38,
          kind: chosen.kind,
          spriteKind: chosen.spriteKind,
          icon: chosen.icon,
          name: chosen.name,
          passed: false,
          hitPlayer: false
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
          y: highLane ? (GROUND_Y - 94) : (GROUND_Y - 32),
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

      function handleObstacleHit(obs) {
        if (player.invincibleTimer > 0 || isGameOver) return;
        if (obs) {
          obs.hitPlayer = true;
        }
        lives = Math.max(0, lives - 1);
        player.invincibleTimer = 76;
        player.knockbackTimer = KNOCKBACK_DURATION;
        player.y = 0;
        player.vy = 0;
        player.isJumping = false;
        player.jumpCount = 0;
        player.jumpProgress = 0;

        spawnHitBounceSparks(HERO_X + 10, GROUND_Y - 30);
        spawnFootParticles(6, HERO_X, '#FF4081');
        safeHelpers.playSfx('hit', 0);
        updateHud();
        applyPuppetTransform();

        if (lives <= 0) {
          finishGame();
        }
      }

      function stepFrame() {
        if (isGameOver || isCleanedUp) return getState();

        tick += 1;
        var baseSpeed = Math.min(7.2, 4.6 + Math.floor(tick / 360) * 0.25);
        speed =
          player.knockbackTimer > KNOCKBACK_DURATION - 14
            ? baseSpeed * 0.35
            : baseSpeed;

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
          if (tick % 6 === 0 && player.knockbackTimer === 0) {
            spawnFootParticles(1);
          }
        }

        if (player.invincibleTimer > 0) {
          player.invincibleTimer -= 1;
        }

        if (player.knockbackTimer > 0) {
          player.knockbackTimer -= 1;
          if (player.knockbackTimer === Math.round(KNOCKBACK_DURATION * 0.55)) {
            spawnFootParticles(4, HERO_X + player.knockbackX, '#FFE840');
          }
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

        var heroCenterX = HERO_X + player.knockbackX;
        var heroCenterY = GROUND_Y + player.y - (player.isDucking ? 18 : 34);
        for (var i = items.length - 1; i >= 0; i--) {
          var item = items[i];
          item.x -= speed;
          var dx = Math.abs(item.x - heroCenterX);
          var dy = Math.abs(item.y - heroCenterY);

          if (!item.collected && dx < 38 && dy < 42) {
            item.collected = true;
            score += item.points;
            if (item.type === 'crown') {
              if (lives < maxLives) {
                lives += 1;
              }
              safeHelpers.playSfx('fanfare', 2);
              safeHelpers.createHeartExplosion(heroCenterX, heroCenterY);
              floatingTexts.push({
                x: heroCenterX,
                y: heroCenterY - 24,
                text: '+' + item.points,
                color: '#FFE840',
                life: 28
              });
            } else {
              safeHelpers.playSfx('coin', 1);
              floatingTexts.push({
                x: heroCenterX,
                y: heroCenterY - 20,
                text: '+' + item.points,
                color: '#FFFFFF',
                life: 24
              });
            }
            items.splice(i, 1);
            continue;
          }
          if (item.x < -50) {
            items.splice(i, 1);
          }
        }

        for (var j = obstacles.length - 1; j >= 0; j--) {
          var obs = obstacles[j];
          obs.x -= speed;

          var horizOverlap = !obs.hitPlayer && Math.abs(obs.x - heroCenterX) < 30;
          if (horizOverlap) {
            if (obs.kind === 'ground') {
              var jumpedOver = Math.abs(player.y) >= 34;
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

        for (var p = particles.length - 1; p >= 0; p--) {
          var pt = particles[p];
          pt.x += pt.vx;
          pt.y += pt.vy;
          pt.alpha -= 0.045;
          if (pt.alpha <= 0) {
            particles.splice(p, 1);
          }
        }
        for (var f = floatingTexts.length - 1; f >= 0; f--) {
          var ft = floatingTexts[f];
          ft.y -= 1.0;
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

          // ==================================================================
          // [LAYER 1: 원경 배경 (파스텔 저채도·무외곽선·안개 처리로 전경과 완벽 분리)]
          // ==================================================================
          canvasCtx.fillStyle = '#7CC8F8';
          canvasCtx.fillRect(0, 0, CANVAS_W, GROUND_Y);
          canvasCtx.fillStyle = '#A8DEFF';
          canvasCtx.fillRect(0, Math.round(GROUND_Y * 0.42), CANVAS_W, Math.round(GROUND_Y * 0.58));

          var mtnScroll = (tick * speed * 0.08) % 220;
          for (var mx = -mtnScroll - 110; mx < CANVAS_W + 220; mx += 220) {
            var bmx = Math.round(mx);
            canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            canvasCtx.fillRect(bmx, GROUND_Y - 100, 220, 30);
            canvasCtx.fillRect(bmx + 16, GROUND_Y - 116, 184, 18);
            canvasCtx.fillRect(bmx + 42, GROUND_Y - 130, 132, 15);
            canvasCtx.fillRect(bmx + 68, GROUND_Y - 142, 76, 12);
          }

          for (var c = 0; c < clouds.length; c++) {
            var cl = clouds[c];
            cl.x -= cl.speed;
            if (cl.x < -60) cl.x = CANVAS_W + 60;
            drawPixelCloud(canvasCtx, cl.x, cl.y, cl.scale);
          }

          canvasCtx.fillStyle = '#B8E8D8';
          canvasCtx.fillRect(0, GROUND_Y - 58, CANVAS_W, 58);
          var bushScroll = (tick * speed * 0.16) % 58;
          for (var bx = -bushScroll - 58; bx < CANVAS_W + 58; bx += 58) {
            var rbx = Math.round(bx);
            canvasCtx.fillRect(rbx + 6, GROUND_Y - 68, 46, 12);
            canvasCtx.fillRect(rbx + 14, GROUND_Y - 74, 30, 7);
          }

          var treeSpacing = 128;
          var treeScroll = (tick * speed * 0.25) % treeSpacing;
          for (var tx = -treeScroll; tx < CANVAS_W + treeSpacing; tx += treeSpacing) {
            drawDistantPastelTree(canvasCtx, tx + 32, GROUND_Y - 16, 0.82);
            drawDistantPastelTree(canvasCtx, tx + 96, GROUND_Y - 12, 0.68);
          }

          // 대기 원근 안개층 (원경과 전경 액션 레인을 명확히 분리)
          canvasCtx.fillStyle = 'rgba(235, 248, 255, 0.58)';
          canvasCtx.fillRect(0, GROUND_Y - 102, CANVAS_W, 102);

          // ==================================================================
          // [LAYER 2: 전경 주행 트랙 & 액션 레인 (선명한 블랙 외곽선 + 고대비 컬러)]
          // ==================================================================
          canvasCtx.save();
          canvasCtx.fillStyle = 'rgba(142, 36, 170, 0.22)';
          for (var lx = 0; lx < CANVAS_W; lx += 28) {
            canvasCtx.fillRect(lx, GROUND_Y - 46, 14, 2);
          }
          canvasCtx.restore();

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

          // ==================================================================
          // [LAYER 3: 전경 인터랙티브 오브젝트 (파티클 · 아이템 · 점프/숙이기 장애물)]
          // ==================================================================
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

          // 전경 장애물 렌더링 (텍스트 배지 완전 제거)
          for (var j = 0; j < obstacles.length; j++) {
            var obs = obstacles[j];
            if (obs.kind === 'ground') {
              drawGroundHazardObstacle(canvasCtx, obs, GROUND_Y);
            } else {
              drawAirHazardObstacle(canvasCtx, obs, GROUND_Y, tick);
            }
          }

          canvasCtx.textAlign = 'center';
          canvasCtx.textBaseline = 'middle';
          for (var f = 0; f < floatingTexts.length; f++) {
            var ft = floatingTexts[f];
            canvasCtx.fillStyle = '#181818';
            canvasCtx.font = 'bold 14px sans-serif';
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

      function onDuckStart(e) {
        if (e && e.preventDefault) e.preventDefault();
        duck(true);
      }

      function onDuckEnd(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (player.isDucking) {
          duck(false);
        }
      }

      if (jumpBtn && jumpBtn.addEventListener) {
        jumpBtn.addEventListener('pointerdown', onJumpPointerDown);
        jumpBtn.addEventListener('click', onJumpButtonClick);
      }
      if (duckBtn && duckBtn.addEventListener) {
        duckBtn.addEventListener('pointerdown', onDuckStart);
        duckBtn.addEventListener('pointerup', onDuckEnd);
        duckBtn.addEventListener('pointercancel', onDuckEnd);
        duckBtn.addEventListener('pointerleave', onDuckEnd);
        duckBtn.addEventListener('touchstart', onDuckStart);
        duckBtn.addEventListener('touchend', onDuckEnd);
        duckBtn.addEventListener('mousedown', onDuckStart);
        duckBtn.addEventListener('mouseup', onDuckEnd);
      }
      if (global.addEventListener) {
        global.addEventListener('keydown', onKeyDown);
        global.addEventListener('keyup', onKeyUp);
        global.addEventListener('pointerup', onDuckEnd);
        global.addEventListener('touchend', onDuckEnd);
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
          knockbackTimer: player.knockbackTimer,
          knockbackX: player.knockbackX,
          knockbackBounceY: player.knockbackBounceY,
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
        spawnItem: spawnItem,
        triggerObstacleHit: handleObstacleHit
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
          duckBtn.removeEventListener('pointerdown', onDuckStart);
          duckBtn.removeEventListener('pointerup', onDuckEnd);
          duckBtn.removeEventListener('pointercancel', onDuckEnd);
          duckBtn.removeEventListener('pointerleave', onDuckEnd);
          duckBtn.removeEventListener('touchstart', onDuckStart);
          duckBtn.removeEventListener('touchend', onDuckEnd);
          duckBtn.removeEventListener('mousedown', onDuckStart);
          duckBtn.removeEventListener('mouseup', onDuckEnd);
        }
        if (global.removeEventListener) {
          global.removeEventListener('keydown', onKeyDown);
          global.removeEventListener('keyup', onKeyUp);
          global.removeEventListener('pointerup', onDuckEnd);
          global.removeEventListener('touchend', onDuckEnd);
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
