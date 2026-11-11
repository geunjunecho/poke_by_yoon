/**
 * 포켓몬 도감 미니게임 P1: 달려라! 포켓몬 점프런 (poke-runner.js)
 * - 6~7세 눈높이 맞춤 클래식 무한 러너 (하트 3개 + 더블 점프 + 누르는 동안만 숙이기)
 * - 주인공 포켓몬은 움직이는 GIF(runnerSpriteUrl)가 멈추지 않도록 DOM 오버레이(.poke-runner-hero)로 렌더링
 * - 원경(파스텔 안개 배경)과 전경(점프/숙이기 액션 레이어) 완벽 분리 + 충돌 시 '팅! 팅!' 2단 넉백 바운스 물리 적용
 */
(function (global) {
  'use strict';

  var GROUND_OBSTACLES = [
    { emoji: '🌲', label: '강철 가시 함정', spriteKind: 'spikes', width: 48, height: 38 },
    { emoji: '🪨', label: '위험 가시 블록', spriteKind: 'hazard_block', width: 46, height: 46 },
    { emoji: '🌵', label: '쌍둥이 강철 가시', spriteKind: 'spikes_wide', width: 54, height: 40 }
  ];

  var AIR_OBSTACLES = [
    { emoji: '🦇', label: '공중 레이저 배리어', spriteKind: 'sky_barricade', width: 56, height: 44 },
    { emoji: '🌩️', label: '하늘 가시 드론', spriteKind: 'spiked_drone', width: 56, height: 46 },
    { emoji: '🌀', label: '공중 전기 블록', spriteKind: 'sky_barricade', width: 52, height: 44 }
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
          bobY = 10;
          sx = 1.34;
          sy = 0.54;
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
            ? 'brightness(2.0) saturate(0.4) drop-shadow(0 0 8px rgba(255,60,60,0.8))'
            : 'opacity(0.6)'
          : 'drop-shadow(0 6px 8px rgba(0,0,0,0.45))';
        return {
          transform: transform,
          filter: filter,
          shadowScale: shadowScale,
          scaleY: sy,
          opacity: s.isHit && t % 6 < 3 ? '0.65' : '1'
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
      '  position: relative; max-width: 960px; width: 100%; height: 100%; min-height: 0; margin: 0 auto;',
      '  display: flex; flex-direction: column; justify-content: space-between;',
      '  background: #8AD4FF;',
      '  border-radius: 20px; border: 4px solid #181818; box-shadow: 0 12px 32px rgba(0,0,0,0.5);',
      '  overflow: hidden; user-select: none; -webkit-user-select: none; box-sizing: border-box;',
      '  font-family: "Noto Sans KR", "Outfit", sans-serif;',
      '}',
      '.poke-runner-hud {',
      '  position: relative; z-index: 5; display: flex; align-items: center; justify-content: space-between;',
      '  padding: clamp(6px, 1.2vh, 10px) clamp(10px, 2vw, 16px); background: rgba(255,255,255,0.94); backdrop-filter: blur(8px);',
      '  border-bottom: 3px solid #181818; font-weight: 900; gap: 8px; flex-wrap: wrap; flex-shrink: 0;',
      '}',
      '.poke-runner-hearts { font-size: clamp(1.1rem, 2.2vh, 1.4rem); letter-spacing: 2px; }',
      '.poke-runner-score-box {',
      '  display: flex; align-items: center; gap: 8px; font-size: clamp(0.88rem, 1.8vh, 1.05rem); color: #1b3a4b;',
      '}',
      '.poke-runner-score-pill {',
      '  background: #fff3e0; border: 2px solid #181818; border-radius: 999px; padding: 3px 12px; color: #e65100;',
      '}',
      '.poke-runner-best-pill {',
      '  background: #ede7f6; border: 2px solid #181818; border-radius: 999px; padding: 3px 10px; color: #4527a0; font-size: clamp(0.8rem, 1.6vh, 0.92rem);',
      '}',
      '.poke-runner-stage-area {',
      '  position: relative; flex: 1; width: 100%; min-height: 140px; overflow: hidden;',
      '}',
      '.poke-runner-canvas {',
      '  position: absolute; inset: 0; width: 100%; height: 100%; display: block;',
      '  image-rendering: pixelated; image-rendering: crisp-edges;',
      '}',
      '.poke-runner-hero {',
      '  position: absolute; left: 14.5833%; bottom: 21.25%; width: 88px; height: 88px;',
      '  transform: translateX(-50%); z-index: 3; pointer-events: none;',
      '  display: flex; align-items: flex-end; justify-content: center; will-change: transform;',
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
      '  position: relative; z-index: 5; display: grid; grid-template-columns: 1fr 1fr; gap: clamp(8px, 1.6vw, 14px);',
      '  padding: clamp(6px, 1.2vh, 10px) clamp(10px, 2vw, 16px) clamp(8px, 1.5vh, 14px); background: rgba(255,255,255,0.96); border-top: 3px solid #181818; flex-shrink: 0;',
      '}',
      '.poke-runner-btn {',
      '  appearance: none; border: 3px solid #181818; border-radius: 16px; padding: clamp(8px, 1.4vh, 14px) 10px;',
      '  font-size: clamp(0.96rem, 2vh, 1.18rem); font-weight: 900; color: #fff; cursor: pointer;',
      '  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;',
      '  box-shadow: 0 5px 0 #181818; transition: transform 0.08s ease;',
      '  touch-action: none; user-select: none; -webkit-user-select: none;',
      '}',
      '.poke-runner-btn:active, .poke-runner-btn.active { transform: translateY(3px); box-shadow: 0 2px 0 #181818; }',
      '.poke-runner-btn-jump { background: linear-gradient(180deg, #ff7043 0%, #f4511e 100%); }',
      '.poke-runner-btn-duck { background: linear-gradient(180deg, #29b6f6 0%, #0288d1 100%); }',
      '.poke-runner-btn-sub { font-size: clamp(0.68rem, 1.3vh, 0.78rem); font-weight: 700; opacity: 0.95; }'
    ].join('\n');
    document.head.appendChild(style);
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

  // 원경 나무: 전경 장애물과 절대 헷갈리지 않도록 검은 외곽선 없이 부드러운 파스텔 실루엣으로만 렌더링
  function drawDistantPastelTree(ctx, cx, baseY, scale) {
    var s = scale || 1;
    var x = Math.round(cx);
    var y = Math.round(baseY);
    var tw = Math.round(10 * s);
    var th = Math.round(14 * s);
    var r = Math.round(18 * s);
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

  // 전경 바닥 가시 (고대비 블랙 외곽선 + 레드/실버 경고 가시)
  function drawPixelSpikeUp(ctx, x, bottomY, w, h) {
    var bx = Math.round(x);
    var by = Math.round(bottomY);
    var sw = w || 16;
    var sh = h || 26;
    ctx.fillStyle = '#181818';
    ctx.fillRect(bx, by - 5, sw, 5);
    ctx.fillRect(bx + 2, by - 11, sw - 4, 6);
    ctx.fillRect(bx + 4, by - 18, sw - 8, 7);
    ctx.fillRect(bx + 6, by - sh, sw - 12, sh - 18);
    // 좌측 밝은 실버 하이라이트
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(bx + 2, by - 5, Math.floor((sw - 4) * 0.5), 3);
    ctx.fillRect(bx + 4, by - 11, Math.floor((sw - 8) * 0.5), 6);
    ctx.fillRect(bx + 6, by - 18, 2, 7);
    // 우측 레드 해저드 포인트
    ctx.fillStyle = '#FF3B30';
    ctx.fillRect(bx + Math.floor(sw * 0.5), by - 5, Math.floor((sw - 4) * 0.5), 3);
    ctx.fillRect(bx + Math.floor(sw * 0.5), by - 11, Math.floor((sw - 8) * 0.5), 6);
    ctx.fillRect(bx + Math.floor(sw * 0.5), by - 17, 2, 6);
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

  // 전경 지상 장애물: 바닥 트랙 위에 확실히 솟아오른 크림슨 해저드 가시 블록
  function drawGroundHazardObstacle(ctx, obs, groundY) {
    var bx = Math.round(obs.x);
    var bw = Math.round(obs.width);
    var bh = Math.round(obs.height);
    var by = Math.round(groundY - bh);

    // 바닥 접지 그림자
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(bx - 4, groundY - 3, bw + 8, 6);

    if (obs.spriteKind === 'hazard_block') {
      // 상단 가시 2개
      drawPixelSpikeUp(ctx, bx + 5, by + 12, 16, 18);
      drawPixelSpikeUp(ctx, bx + bw - 21, by + 12, 16, 18);

      // 검은 외곽선 박스
      ctx.fillStyle = '#181818';
      ctx.fillRect(bx, by + 10, bw, bh - 10);

      // 강렬한 레드-오렌지 경고 블록 본체
      ctx.fillStyle = '#FF3B30';
      ctx.fillRect(bx + 3, by + 13, bw - 6, bh - 16);

      // 상단 노란 경고 스트라이프 바
      ctx.fillStyle = '#FFE840';
      ctx.fillRect(bx + 3, by + 13, bw - 6, 7);
      ctx.fillStyle = '#181818';
      for (var sx = bx + 6; sx < bx + bw - 8; sx += 10) {
        ctx.fillRect(sx, by + 13, 5, 7);
      }

      // 중앙 해저드 코어 눈 장식
      ctx.fillStyle = '#181818';
      ctx.fillRect(bx + 10, by + 24, bw - 20, 12);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(bx + 13, by + 26, 6, 6);
      ctx.fillRect(bx + bw - 19, by + 26, 6, 6);
    } else {
      // 강철 가시 받침대 + 3연속 대형 스파이크
      ctx.fillStyle = '#181818';
      ctx.fillRect(bx, groundY - 12, bw, 12);
      ctx.fillStyle = '#FFE840';
      ctx.fillRect(bx + 3, groundY - 9, bw - 6, 6);
      ctx.fillStyle = '#181818';
      for (var k = bx + 6; k < bx + bw - 6; k += 10) {
        ctx.fillRect(k, groundY - 9, 5, 6);
      }
      drawPixelSpikeUp(ctx, bx + 1, groundY - 10, 16, 28);
      drawPixelSpikeUp(ctx, bx + 17, groundY - 10, 16, 32);
      drawPixelSpikeUp(ctx, bx + 33, groundY - 10, 16, 28);
    }
  }

  // 전경 공중 장애물 (숙이기 전용 레이어): 천장부터 머리 높이까지 내려오는 상단 차단 게이트 (점프 불가, 아래 터널로만 통과)
  function drawAirHazardObstacle(ctx, obs, groundY, tick) {
    var bx = Math.round(obs.x);
    var bw = Math.round(obs.width);
    var bh = Math.round(obs.height);
    var hoverBob = Math.round(Math.sin((tick || 0) * 0.15) * 1.5);
    var by = Math.round(obs.y + hoverBob);
    var bottomEdge = by + bh;
    var pillarTop = 0;
    var pillarH = Math.max(0, by - pillarTop);

    // 1. 천장(y=0)부터 게이트 본체(by)까지 상공을 완전히 가로막는 이중 강철 기둥 & 레이저 배리어 필드 (점프로 절대 넘을 수 없음을 직관화)
    if (pillarH > 0) {
      ctx.save();
      // 기둥 사이 반투명 레이저 차단막
      ctx.fillStyle = 'rgba(21, 101, 192, 0.28)';
      ctx.fillRect(bx + 8, pillarTop, bw - 16, pillarH);

      // 가로 레이저 격자선
      for (var ly = by - 16; ly >= 8; ly -= 22) {
        ctx.fillStyle = '#0D47A1';
        ctx.fillRect(bx + 10, ly - 1, bw - 20, 5);
        ctx.fillStyle = '#80D8FF';
        ctx.fillRect(bx + 10, ly, bw - 20, 3);
      }

      // 좌우 수직 강철 기둥 (외곽선 + 네온 코어)
      ctx.fillStyle = '#181818';
      ctx.fillRect(bx + 3, pillarTop, 11, pillarH);
      ctx.fillRect(bx + bw - 14, pillarTop, 11, pillarH);
      ctx.fillStyle = '#1E88E5';
      ctx.fillRect(bx + 5, pillarTop, 7, pillarH);
      ctx.fillRect(bx + bw - 12, pillarTop, 7, pillarH);
      ctx.fillStyle = '#80D8FF';
      ctx.fillRect(bx + 7, pillarTop, 3, pillarH);
      ctx.fillRect(bx + bw - 10, pillarTop, 3, pillarH);
      ctx.restore();
    }

    // 2. 아래쪽 통과 가능 구역(숙이기 안전 터널) 가이드 표시: 바닥 그림자와 통과 영역
    ctx.save();
    ctx.fillStyle = 'rgba(2, 136, 209, 0.13)';
    ctx.fillRect(bx + 4, bottomEdge, bw - 8, groundY - bottomEdge);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fillRect(bx + 6, groundY - 2, bw - 12, 4);
    ctx.restore();

    // 3. 게이트 하단 헤드 블록 외곽선 본체
    ctx.fillStyle = '#181818';
    ctx.fillRect(bx, by, bw, bh - 10);

    // 네온 블루 상단 차단 게이트 본체
    ctx.fillStyle = '#1E88E5';
    ctx.fillRect(bx + 3, by + 3, bw - 6, bh - 16);
    ctx.fillStyle = '#80D8FF';
    ctx.fillRect(bx + 5, by + 5, bw - 10, 4);

    // 게이트 중앙 아래 방향 픽셀 화살표(▼) 표시 (숙이기 유도)
    var midX = bx + Math.floor(bw * 0.5);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(midX - 6, by + 10, 12, 2);
    ctx.fillRect(midX - 4, by + 12, 8, 2);
    ctx.fillRect(midX - 2, by + 14, 4, 2);

    // 하단 노란색-검은색 주의 줄무늬
    ctx.fillStyle = '#FFE840';
    ctx.fillRect(bx + 5, by + bh - 21, bw - 10, 6);
    ctx.fillStyle = '#181818';
    for (var sx = bx + 7; sx < bx + bw - 9; sx += 10) {
      ctx.fillRect(sx, by + bh - 21, 5, 6);
    }

    // 4. 하단 아래쪽으로 뾰족하게 돋아난 가시 (서서 지나가거나 점프하면 부딪히고, 납작 숙여야만 통과)
    drawPixelSpikeDown(ctx, bx + 4, by + bh - 12, 14, 13);
    drawPixelSpikeDown(ctx, bx + Math.floor(bw * 0.5) - 7, by + bh - 12, 14, 15);
    drawPixelSpikeDown(ctx, bx + bw - 18, by + bh - 12, 14, 13);
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
    var GROUND_DEPTH = 68;
    var H = 320;
    var GROUND_Y = H - GROUND_DEPTH;
    var PLAYER_X = 105;
    var HERO_LEFT_PCT = (PLAYER_X / W) * 100;
    var HERO_BOTTOM_PCT = ((H - GROUND_Y) / H) * 100;
    var GRAVITY = 0.66;
    var JUMP_VELOCITY_1 = -12.2;
    var JUMP_VELOCITY_2 = -11.2;
    var KNOCKBACK_DURATION = 34; // '팅! 팅!' 2단 백스텝 바운스 프레임
    var renderScaleX = 1;
    var renderScaleY = 1;

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
      jumpCount: 0,
      maxJumps: 2,
      invincibleTimer: 0,
      knockbackTimer: 0,
      knockbackX: 0,
      knockbackBounceY: 0,
      knockbackTilt: 0
    };

    var obstacles = [];
    var items = [];
    var particles = [];
    var popups = [];
    var clouds = [
      { x: 110, y: 46, scale: 1.0, speed: 0.35 },
      { x: 350, y: 76, scale: 1.25, speed: 0.25 },
      { x: 580, y: 40, scale: 0.9, speed: 0.42 }
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
      '<span>⬇️ 납작 숙이기!</span><span class="poke-runner-btn-sub">누르고 있는 동안 납작 숙여요!</span>';

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
      bubbleTimer = frames || 40;
      if (!text) {
        bubbleEl.classList.remove('visible');
        return;
      }
      bubbleEl.textContent = text;
      bubbleEl.classList.add('visible');
    }

    // 충돌 시 뒤로 '팅! 팅!' 두 번 튀어오르며 밀려나는 오프셋 계산
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
        // 1번째 '팅!' 바운스: 0 -> -30px 후퇴 + 26px 점프 아크
        var p1 = progress / 0.45;
        kx = -30 * p1;
        ky = -Math.sin(p1 * Math.PI) * 26;
        kt = Math.sin(p1 * Math.PI) * 18;
      } else if (progress < 0.80) {
        // 2번째 '팅!' 바운스: -30px -> -42px 추가 후퇴 + 14px 작은 점프 아크
        var p2 = (progress - 0.45) / 0.35;
        kx = -30 - 12 * p2;
        ky = -Math.sin(p2 * Math.PI) * 14;
        kt = Math.sin(p2 * Math.PI) * 12;
      } else {
        // 원위치 복귀 대시: -42px -> 0px
        var p3 = (progress - 0.80) / 0.20;
        kx = -42 * (1 - p3);
        ky = 0;
        kt = -6 * (1 - p3);
      }

      player.knockbackX = Number(kx.toFixed(2));
      player.knockbackBounceY = Number(ky.toFixed(2));
      player.knockbackTilt = Number(kt.toFixed(2));
    }

    function syncViewportMetrics() {
      var cw = Number(stageArea && stageArea.clientWidth) || 0;
      var ch = Number(stageArea && stageArea.clientHeight) || 0;
      if (cw > 0 && ch > 0) {
        var targetW = cw < 540 ? 480 : 720;
        var targetH = Math.max(240, Math.min(1150, Math.round(targetW * (ch / cw))));
        if (targetW !== W || targetH !== H) {
          var prevGroundY = GROUND_Y;
          W = targetW;
          H = targetH;
          GROUND_Y = H - GROUND_DEPTH;
          PLAYER_X = Math.round(W * 0.145833);
          player.x = PLAYER_X;
          var deltaGroundY = GROUND_Y - prevGroundY;
          canvas.width = Math.round(W * dpr);
          canvas.height = Math.round(H * dpr);
          for (var oi = 0; oi < obstacles.length; oi++) {
            obstacles[oi].y += deltaGroundY;
          }
          for (var ii = 0; ii < items.length; ii++) {
            items[ii].y += deltaGroundY;
          }
          for (var pi = 0; pi < particles.length; pi++) {
            particles[pi].y += deltaGroundY;
          }
          for (var ppi = 0; ppi < popups.length; ppi++) {
            popups[ppi].y += deltaGroundY;
          }
        }
        renderScaleX = Number((cw / W).toFixed(4));
        renderScaleY = Number((ch / H).toFixed(4));
      } else {
        renderScaleX = 1;
        renderScaleY = 1;
      }
      HERO_LEFT_PCT = (PLAYER_X / W) * 100;
      HERO_BOTTOM_PCT = ((H - GROUND_Y) / H) * 100;
      heroEl.style.left = HERO_LEFT_PCT.toFixed(4) + '%';
      heroEl.style.bottom = HERO_BOTTOM_PCT.toFixed(4) + '%';
      var heroSizePx = Math.round(Math.max(56, Math.min(108, 82 * renderScaleY)));
      heroEl.style.width = heroSizePx + 'px';
      heroEl.style.height = heroSizePx + 'px';
      heroImg.style.width = heroSizePx + 'px';
      heroImg.style.height = heroSizePx + 'px';
      shadowEl.style.width = Math.round(heroSizePx * 0.72) + 'px';
    }

    function syncHeroTransform() {
      syncViewportMetrics();
      computeKnockbackKinematics();
      var effectiveY = player.y + player.knockbackBounceY;
      var scaledYOffset = Number((effectiveY * renderScaleY).toFixed(2));
      var scaledKnockbackX = Math.round(player.knockbackX * renderScaleX);

      var tf = helpers.computeRunTransform(
        {
          yOffset: scaledYOffset,
          isJumping: player.isJumping || player.knockbackBounceY < -2,
          isDucking: player.isDucking,
          isHit: player.invincibleTimer > 0,
          flipX: true
        },
        tick
      );
      var shadowScale =
        player.isJumping || player.knockbackBounceY < -2
          ? Math.max(0.35, 1 - Math.abs(effectiveY) / 175)
          : player.isDucking
          ? 1.25
          : 0.95;

      // 주인공 컨테이너(.poke-runner-hero)에 화면 스케일이 반영된 넉백 X 오프셋 적용
      heroEl.style.transform =
        'translateX(calc(-50% + ' + scaledKnockbackX + 'px))';

      var extraKnockbackTransform =
        player.knockbackTimer > 0
          ? ' rotate(' + player.knockbackTilt.toFixed(1) + 'deg)'
          : '';

      if (typeof tf === 'string') {
        heroImg.style.transform = tf + extraKnockbackTransform;
        heroImg.style.filter =
          player.invincibleTimer > 0
            ? 'drop-shadow(0 0 10px #ff5252) brightness(1.5)'
            : 'drop-shadow(0 6px 8px rgba(0,0,0,0.35))';
      } else if (tf && typeof tf === 'object') {
        if (tf.transform !== undefined) {
          heroImg.style.transform = tf.transform + extraKnockbackTransform;
        }
        if (tf.filter !== undefined) heroImg.style.filter = tf.filter;
        if (tf.opacity !== undefined) heroImg.style.opacity = tf.opacity;
      }

      shadowEl.style.transform =
        'translateX(-50%) scale(' + shadowScale.toFixed(2) + ')';
      shadowEl.style.opacity = Math.max(0.22, Math.min(1, shadowScale * 0.85)).toFixed(2);
    }

    function spawnFootstepDust(count, customX, customColor) {
      var n = count || 1;
      var baseX = customX !== undefined ? customX : player.x + player.knockbackX - 12;
      for (var i = 0; i < n; i++) {
        particles.push({
          x: baseX + (Math.random() * 16 - 8),
          y: GROUND_Y - 4 + (Math.random() * 6 - 3),
          vx: -speed * (0.35 + Math.random() * 0.4),
          vy: -(0.8 + Math.random() * 2.0),
          size: 4 + Math.floor(Math.random() * 4),
          life: 16 + Math.floor(Math.random() * 10),
          maxLife: 26,
          color:
            customColor ||
            (i % 2 === 0 ? '#FFE840' : ctxData.typeColor || '#88E050')
        });
      }
    }

    function spawnHitBounceSparks(x, y) {
      var colors = ['#FF3B30', '#FFE840', '#FFFFFF', '#FF9800'];
      for (var i = 0; i < 10; i++) {
        var angle = (Math.PI * 2 * i) / 10;
        var spd = 2.0 + Math.random() * 2.6;
        particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd - 1.2,
          size: 5 + (i % 3),
          life: 20,
          maxLife: 20,
          color: colors[i % colors.length]
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
      duckBtn.classList.remove('active');

      if (player.jumpCount === 1) {
        player.vy = JUMP_VELOCITY_1;
        if (player.y >= 0) {
          player.y = -12;
        }
      } else {
        // 2단 점프: 버튼을 빠르게 연타하든 정점에서 누르든 항상 시원한 고공 궤적(-172 ~ -195)까지 올라가도록 보정
        player.y -= 6;
        var maxCeiling = -Math.max(175, Math.min(215, GROUND_Y - 64));
        var targetPeakY = Math.max(maxCeiling, Math.min(player.y - 72, -174));
        var riseNeeded = Math.max(52, player.y - targetPeakY);
        player.vy = -Math.sqrt(2 * GRAVITY * riseNeeded);
      }

      spawnFootstepDust(4);
      helpers.playSfx('jump', player.jumpCount);
      syncHeroTransform();
      return true;
    }

    // 숙이기: 누르고 있는 동안(active === true)에만 숙이고, 떼면(active === false) 즉시 일어남
    function duck(active) {
      if (isGameOver) return false;
      var shouldDuck = active === undefined ? true : Boolean(active);
      if (shouldDuck) {
        var wasDucking = player.isDucking;
        player.isDucking = true;
        player.duckKeyHeld = true;
        player.y = 0;
        player.vy = 0;
        player.isJumping = false;
        player.jumpCount = 0;
        duckBtn.classList.add('active');
        if (!wasDucking) {
          helpers.playSfx('duck', 0);
        }
      } else {
        player.duckKeyHeld = false;
        player.isDucking = false;
        duckBtn.classList.remove('active');
      }
      syncHeroTransform();
      return player.isDucking;
    }

    function spawnObstacle(forcedCategory) {
      var category =
        forcedCategory || (Math.random() < 0.56 ? 'ground' : 'air');
      var pool = category === 'ground' ? GROUND_OBSTACLES : AIR_OBSTACLES;
      var tpl = pool[Math.floor(Math.random() * pool.length)];
      var spawnX = W + 44;
      var obsCenter = spawnX + tpl.width * 0.5;

      // 새로 생성되는 장애물과 겹치거나 너무 가까운 기존 아이템(145px 이내)은 제거하여 장애물에 아이템이 걸리지 않게 보장
      for (var i = items.length - 1; i >= 0; i--) {
        if (Math.abs(items[i].x - obsCenter) < 145) {
          items.splice(i, 1);
        }
      }

      obstacles.push({
        category: category,
        spriteKind: tpl.spriteKind,
        emoji: tpl.emoji,
        label: tpl.label,
        x: spawnX,
        y: category === 'ground' ? GROUND_Y - tpl.height : GROUND_Y - 76,
        width: tpl.width,
        height: tpl.height,
        passed: false,
        hitPlayer: false
      });
    }

    function spawnItem(forcedKind) {
      var spawnX = W + 34;

      // 주변 145px 이내에 장애물이 있으면 아이템 스폰을 보류하여 장애물과 아이템이 절대 겹치지 않도록 처리
      if (!forcedKind) {
        for (var i = 0; i < obstacles.length; i++) {
          var obs = obstacles[i];
          var obsCenter = obs.x + obs.width * 0.5;
          if (Math.abs(obsCenter - spawnX) < 145) {
            nextItemIn = 18;
            return;
          }
        }
        for (var j = 0; j < items.length; j++) {
          if (Math.abs(items[j].x - spawnX) < 84) {
            nextItemIn = 16;
            return;
          }
        }
      }

      var roll = Math.random();
      var kind = forcedKind || (roll < 0.14 ? 'star' : roll < 0.45 ? 'orb' : 'berry');
      var emoji =
        kind === 'star'
          ? '🌟'
          : kind === 'orb'
          ? ctxData.typeEmoji || '🔑'
          : BERRY_EMOJIS[Math.floor(Math.random() * BERRY_EMOJIS.length)];
      var pts = kind === 'star' ? 50 : kind === 'orb' ? 30 : 15;
      var laneRoll = Math.random();
      var itemY =
        kind === 'star' || laneRoll < 0.22
          ? GROUND_Y - 162 // 2단 점프 보너스 레인
          : laneRoll < 0.65
          ? GROUND_Y - 104 // 1단 점프 메인 레인
          : GROUND_Y - 38; // 지상 달리기 레인
      items.push({
        kind: kind,
        emoji: emoji,
        points: pts,
        x: spawnX,
        y: itemY,
        radius: 22,
        collected: false
      });
    }

    function handleGameOver() {
      isGameOver = true;
      running = false;
      player.isDucking = false;
      player.duckKeyHeld = false;
      if (duckBtn && duckBtn.classList) {
        duckBtn.classList.remove('active');
      }
      if (wrap && wrap.style) {
        wrap.style.pointerEvents = 'none';
      }
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
        onReplay: function () {
          resetGame();
        },
        onRetry: function () {
          resetGame();
        },
        onRestart: function () {
          resetGame();
        }
      });
    }

    function triggerObstacleHit(obs) {
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

      spawnHitBounceSparks(player.x + 12, GROUND_Y - 32);
      spawnFootstepDust(6, player.x, '#FF5252');
      helpers.playSfx('hit');
      updateHud();
      syncHeroTransform();
      if (lives <= 0) {
        handleGameOver();
      }
    }

    function checkCollisions() {
      var pLeft = player.x + player.knockbackX - 18;
      var pRight = player.x + player.knockbackX + 18;
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
          } else if (it.kind === 'orb') {
            helpers.playSfx('coin', 2);
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
            text: '+' + it.points,
            color: it.kind === 'star' ? '#FFE840' : '#FFFFFF',
            life: 24
          });
          items.splice(i, 1);
          updateHud();
        }
      }

      if (player.invincibleTimer > 0) return;

      for (var j = 0; j < obstacles.length; j++) {
        var obs = obstacles[j];
        if (obs.hitPlayer) continue;
        var oLeft = obs.x + 8;
        var oRight = obs.x + obs.width - 8;
        if (pRight < oLeft || pLeft > oRight) continue;

        if (obs.category === 'ground') {
          if (player.y < -(obs.height - 12)) continue;
          triggerObstacleHit(obs);
          break;
        } else if (obs.category === 'air') {
          // 공중(숙이기) 게이트 장애물은 반드시 납작 숙이기(isDucking && 지상 근처)로만 통과 가능! (점프하거나 서 있으면 충돌)
          if (player.isDucking && player.y > -20) continue;
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

      // ========================================================================
      // [LAYER 1: 원경 배경 (파스텔 저채도·무외곽선·안개 처리로 전경과 완벽 분리)]
      // ========================================================================
      gCtx.fillStyle = '#7CC8F8';
      gCtx.fillRect(0, 0, W, GROUND_Y);
      gCtx.fillStyle = '#A8DEFF';
      gCtx.fillRect(0, Math.round(GROUND_Y * 0.42), W, Math.round(GROUND_Y * 0.58));

      // 원경 파스텔 구름 산맥
      var mtnScroll = (tick * speed * 0.08) % 240;
      for (var mx = -mtnScroll - 120; mx < W + 240; mx += 240) {
        var bmx = Math.round(mx);
        gCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        gCtx.fillRect(bmx, GROUND_Y - 108, 240, 34);
        gCtx.fillRect(bmx + 20, GROUND_Y - 126, 196, 20);
        gCtx.fillRect(bmx + 48, GROUND_Y - 142, 136, 16);
        gCtx.fillRect(bmx + 76, GROUND_Y - 156, 78, 14);
      }

      // 상공 구름
      for (var c = 0; c < clouds.length; c++) {
        drawPixelCloud(gCtx, clouds[c].x, clouds[c].y, clouds[c].scale);
      }

      // 원경 파스텔 언덕과 나무 실루엣 (검은 테두리 없음)
      gCtx.fillStyle = '#B8E8D8';
      gCtx.fillRect(0, GROUND_Y - 64, W, 64);
      var bushScroll = (tick * speed * 0.16) % 64;
      for (var bx = -bushScroll - 64; bx < W + 64; bx += 64) {
        var rbx = Math.round(bx);
        gCtx.fillRect(rbx + 6, GROUND_Y - 76, 50, 14);
        gCtx.fillRect(rbx + 14, GROUND_Y - 82, 34, 8);
      }

      var treeSpacing = 140;
      var treeScroll = (tick * speed * 0.25) % treeSpacing;
      for (var tx = -treeScroll; tx < W + treeSpacing; tx += treeSpacing) {
        drawDistantPastelTree(gCtx, tx + 36, GROUND_Y - 18, 0.85);
        drawDistantPastelTree(gCtx, tx + 104, GROUND_Y - 14, 0.7);
      }

      // 원경과 전경 액션 레인을 시각적으로 분리하는 대기 원근 안개층(Atmospheric Veil)
      gCtx.fillStyle = 'rgba(235, 248, 255, 0.58)';
      gCtx.fillRect(0, GROUND_Y - 110, W, 110);

      // ========================================================================
      // [LAYER 2: 전경 주행 트랙 & 액션 레인 (선명한 블랙 외곽선 + 고대비 컬러)]
      // ========================================================================
      // 공중 장애물(숙이기 레인)과 지상(점프 레인) 경계 가이드 라인 (은은한 점선)
      gCtx.save();
      gCtx.fillStyle = 'rgba(2, 136, 209, 0.22)';
      for (var lx = 0; lx < W; lx += 28) {
        gCtx.fillRect(lx, GROUND_Y - 46, 14, 2);
      }
      gCtx.restore();

      // 전경 테라코타 흙 바닥 (#C07040) & 픽셀 잔디 캡 (#78C830)
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

      // 전경 잔디 상단 3px 블랙 라인 + 고채도 잔디 캡
      gCtx.fillStyle = '#181818';
      gCtx.fillRect(0, GROUND_Y - 12, W, 16);
      gCtx.fillStyle = '#88E050';
      gCtx.fillRect(0, GROUND_Y - 9, W, 3);
      gCtx.fillStyle = '#78C830';
      gCtx.fillRect(0, GROUND_Y - 6, W, 6);
      gCtx.fillStyle = '#489818';
      var toothScroll = Math.round((tick * speed) % 12);
      for (var tgx = -toothScroll; tgx < W + 12; tgx += 12) {
        gCtx.fillRect(tgx, GROUND_Y - 1, 7, 4);
      }

      // ========================================================================
      // [LAYER 3: 전경 인터랙티브 오브젝트 (파티클 · 아이템 · 점프/숙이기 장애물)]
      // ========================================================================
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

      // 전경 장애물 렌더링 (텍스트 배지 완전 제거 - 직관적인 2레인 실루엣)
      for (var j = 0; j < obstacles.length; j++) {
        var obs = obstacles[j];
        if (obs.category === 'ground') {
          drawGroundHazardObstacle(gCtx, obs, GROUND_Y);
        } else {
          drawAirHazardObstacle(gCtx, obs, GROUND_Y, tick);
        }
      }

      // 아이템 획득 숫자 팝업
      gCtx.textAlign = 'center';
      gCtx.textBaseline = 'middle';
      for (var k = 0; k < popups.length; k++) {
        var pop = popups[k];
        gCtx.save();
        gCtx.fillStyle = '#181818';
        gCtx.font = '900 14px "Noto Sans KR", sans-serif';
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
      var baseSpeed = Math.min(6.8, 4.6 + Math.floor(tick / 360) * 0.22);
      // 넉백 중에는 순간적으로 월드 스크롤이 반동으로 감속되었다가 회복되는 타격감 부여
      speed =
        player.knockbackTimer > KNOCKBACK_DURATION - 14
          ? baseSpeed * 0.35
          : baseSpeed;

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

      if (player.knockbackTimer > 0) {
        player.knockbackTimer -= 1;
        // 1번째 바운스 착지 시점(19프레임 부근)에 '팅!' 착지 먼지 생성
        if (player.knockbackTimer === Math.round(KNOCKBACK_DURATION * 0.55)) {
          spawnFootstepDust(4, player.x + player.knockbackX, '#FFE840');
        }
      }

      if (bubbleTimer > 0) {
        bubbleTimer -= 1;
        if (bubbleTimer === 0) {
          bubbleEl.classList.remove('visible');
        }
      }

      if (player.isJumping || player.y < 0 || player.vy !== 0) {
        player.y += player.vy;
        player.vy += GRAVITY;
        var ceilingLimit = -Math.max(185, GROUND_Y - 56);
        if (player.y < ceilingLimit) {
          player.y = ceilingLimit;
          if (player.vy < 0) player.vy = 0;
        }
        if (player.y >= 0) {
          player.y = 0;
          player.vy = 0;
          player.isJumping = false;
          player.jumpCount = 0;
          spawnFootstepDust(3);
        }
      } else if (tick % 4 === 0 && player.knockbackTimer === 0) {
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
      if (wrap && wrap.style) {
        wrap.style.pointerEvents = 'auto';
      }
      player.y = 0;
      player.vy = 0;
      player.isJumping = false;
      player.isDucking = false;
      player.duckKeyHeld = false;
      player.jumpCount = 0;
      player.invincibleTimer = 0;
      player.knockbackTimer = 0;
      player.knockbackX = 0;
      player.knockbackBounceY = 0;
      player.knockbackTilt = 0;
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
        knockbackTimer: player.knockbackTimer,
        knockbackX: player.knockbackX,
        knockbackBounceY: player.knockbackBounceY,
        y: player.y,
        vy: player.vy,
        renderScaleX: renderScaleX,
        renderScaleY: renderScaleY,
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

    function onJumpPointerDown(e) {
      if (!running || isGameOver) return;
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      lastJumpPointerTime = Date.now();
      jump();
    }

    function onJumpClick(e) {
      if (!running || isGameOver) return;
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      if (Date.now() - lastJumpPointerTime < 300) return;
      jump();
    }

    function onDuckStart(e) {
      if (!running || isGameOver) return;
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      duck(true);
    }

    function onDuckEnd(e) {
      if (!running || isGameOver) return;
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      if (player.isDucking) {
        duck(false);
      }
    }

    // window 전역 pointerup/touchend 리스너: 절대 e.preventDefault()를 호출하지 않아야 결과 오버레이 버튼(한 번 더 놀기 / 다른 게임 고르기) 클릭이 막히지 않음
    function onWindowDuckEnd() {
      if (!running || isGameOver) return;
      if (player.isDucking) {
        duck(false);
      }
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
      if (!running || isGameOver) return;
      var code = e.code || e.key;
      if (code === 'ArrowDown') {
        duck(false);
      }
    }

    jumpBtn.addEventListener('pointerdown', onJumpPointerDown);
    jumpBtn.addEventListener('click', onJumpClick);

    // 숙이기 버튼: 누르고 있는 동안만 숙이고, 손을 떼거나 영역을 벗어나면 즉시 일어남
    duckBtn.addEventListener('pointerdown', onDuckStart);
    duckBtn.addEventListener('pointerup', onDuckEnd);
    duckBtn.addEventListener('pointercancel', onDuckEnd);
    duckBtn.addEventListener('pointerleave', onDuckEnd);
    duckBtn.addEventListener('touchstart', onDuckStart);
    duckBtn.addEventListener('touchend', onDuckEnd);
    duckBtn.addEventListener('mousedown', onDuckStart);
    duckBtn.addEventListener('mouseup', onDuckEnd);

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('pointerup', onWindowDuckEnd);
      window.addEventListener('touchend', onWindowDuckEnd);
    }

    stageEl._runnerGame = {
      jump: jump,
      duck: duck,
      stepFrame: stepFrame,
      getState: getState,
      spawnObstacle: spawnObstacle,
      spawnItem: spawnItem,
      triggerObstacleHit: triggerObstacleHit,
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
      duckBtn.removeEventListener('pointerdown', onDuckStart);
      duckBtn.removeEventListener('pointerup', onDuckEnd);
      duckBtn.removeEventListener('pointercancel', onDuckEnd);
      duckBtn.removeEventListener('pointerleave', onDuckEnd);
      duckBtn.removeEventListener('touchstart', onDuckStart);
      duckBtn.removeEventListener('touchend', onDuckEnd);
      duckBtn.removeEventListener('mousedown', onDuckStart);
      duckBtn.removeEventListener('mouseup', onDuckEnd);
      if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('pointerup', onWindowDuckEnd);
        window.removeEventListener('touchend', onWindowDuckEnd);
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
