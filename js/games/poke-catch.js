/**
 * 포켓몬 미니게임 P3: 흔들흔들! 몬스터볼 캐치 (poke-catch.js)
 * 6~7세 맞춤 5라운드 원터치 타이밍 캐치 게임
 */
(function (global) {
  'use strict';

  var TOTAL_ROUNDS = 5;
  var RING_MAX = 1.8;
  var RING_MIN = 0.4;

  // 라운드별 업그레이드 몬스터볼 정의 (1R -> 5R)
  var BALL_UPGRADES = [
    {
      round: 1,
      id: 'pokeball',
      name: '몬스터볼',
      emoji: '🔴',
      label: '1R 🔴 몬스터볼',
      topColor: '#EF5350',
      bottomColor: '#FFFFFF',
      accentColor: '#EF5350',
      desc: '기본 몬스터볼로 첫 캐치에 도전해요!'
    },
    {
      round: 2,
      id: 'superball',
      name: '슈퍼볼',
      emoji: '🔵',
      label: '2R 🔵 슈퍼볼',
      topColor: '#1E88E5',
      bottomColor: '#FFFFFF',
      accentColor: '#42A5F5',
      desc: '멋진 파란색 슈퍼볼로 업그레이드!'
    },
    {
      round: 3,
      id: 'hyperball',
      name: '하이퍼볼',
      emoji: '🟡',
      label: '3R 🟡 하이퍼볼',
      topColor: '#FDD835',
      bottomColor: '#212121',
      accentColor: '#FFCA28',
      desc: '반짝반짝 황금빛 하이퍼볼 등장!'
    },
    {
      round: 4,
      id: 'loveball',
      name: '러브볼',
      emoji: '💖',
      label: '4R 💖 러브볼',
      topColor: '#EC407A',
      bottomColor: '#F8BBD0',
      accentColor: '#EC407A',
      desc: '하트가 뿅뿅! 사랑스러운 러브볼!'
    },
    {
      round: 5,
      id: 'masterball',
      name: '마스터볼',
      emoji: '🟣',
      label: '5R 🟣 마스터볼',
      topColor: '#8E24AA',
      bottomColor: '#FFFFFF',
      accentColor: '#AB47BC',
      desc: '마지막 라운드! 전설의 마스터볼 보너스 대성공!'
    }
  ];

  /**
   * 링 스케일 값에 따른 판정 계산
   * - 황금 링 구간 (0.75 <= ringScale <= 1.05): +100점
   * - 초록 링 구간 (0.55 <= ringScale <= 1.30): +70점
   * - 노란 링 구간 (그 외 구간): +30점
   */
  function evaluateRingScale(scale, roundIdx) {
    var s = typeof scale === 'number' && !isNaN(scale) ? scale : 1.5;
    var isMasterRound = roundIdx === TOTAL_ROUNDS;

    if (s >= 0.75 && s <= 1.05) {
      return {
        tier: 'excellent',
        zone: 'gold',
        points: 100,
        shakes: 1,
        rainbowBurst: true,
        ringColor: '#FFD54F',
        ringGlow: 'rgba(255, 213, 79, 0.85)',
        hintText: '🌟 황금 찬스! 지금 던져요!!',
        message: '✨ 엑설런트 캐치!! (+100점)',
        subMessage: isMasterRound ? '🟣 마스터볼 보너스 대성공!! 완벽해요!' : '🌈 무지개 별폭발! 단번에 찰칵 잡았어요!'
      };
    }

    if (s >= 0.55 && s <= 1.30) {
      return {
        tier: 'nice',
        zone: 'green',
        points: 70,
        shakes: 3,
        rainbowBurst: false,
        ringColor: '#66BB6A',
        ringGlow: 'rgba(102, 187, 106, 0.8)',
        hintText: '💚 초록 링! 지금 던져요!',
        message: '👍 나이스 캐치! (+70점)',
        subMessage: isMasterRound ? '🟣 마스터볼 대성공! 흔들흔들 찰칵!' : '흔들... 흔들... 흔들... 찰칵! 캐치 성공!'
      };
    }

    return {
      tier: 'good',
      zone: 'yellow',
      points: 30,
      shakes: 1,
      rainbowBurst: false,
      ringColor: '#FFEE58',
      ringGlow: 'rgba(255, 238, 88, 0.75)',
      hintText: '💛 초록색이 될 때까지 기다려요!',
      message: '😊 아깝다! 조금 더 초록색일 때 던져보자! (+30점)',
      subMessage: isMasterRound ? '🟣 마스터볼이 도와줘서 찰칵 성공했어요!' : '괜찮아요! 다음 볼로 더 잘 던질 수 있어요!'
    };
  }

  function getBallForRound(roundNum) {
    var idx = Math.max(0, Math.min(BALL_UPGRADES.length - 1, (roundNum || 1) - 1));
    return BALL_UPGRADES[idx];
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
      computeRunTransform: function (state, tick) {
        if (typeof h.computeRunTransform === 'function') {
          try { return h.computeRunTransform(state, tick); } catch (e) {}
        }
        var bounceY = Math.abs(Math.sin((tick || 0) * 0.12)) * -14;
        var tilt = Math.sin((tick || 0) * 0.08) * 6;
        return 'translateY(' + bounceY.toFixed(1) + 'px) rotate(' + tilt.toFixed(1) + 'deg)';
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

  function normalizeCharCtx(charCtx) {
    var c = charCtx || {};
    var id = c.id || 25;
    var defaultArt = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/' + id + '.png';
    return {
      id: id,
      nameKr: c.nameKr || '피카츄',
      nameEn: c.nameEn || 'pikachu',
      artworkUrl: c.artworkUrl || defaultArt,
      spriteUrl: c.spriteUrl || defaultArt,
      runnerSpriteUrl: c.runnerSpriteUrl || c.artworkUrl || c.spriteUrl || defaultArt,
      isAnimatedGif: Boolean(c.isAnimatedGif),
      primaryType: c.primaryType || 'electric',
      typeNameKr: c.typeNameKr || '전기',
      typeColor: c.typeColor || '#FFCA28',
      typeEmoji: c.typeEmoji || '⚡',
      height: c.height || 4,
      weight: c.weight || 60,
      cryUrl: c.cryUrl || ''
    };
  }

  function buildFlyingBallInnerMarkup(ball) {
    var b = ball || BALL_UPGRADES[0];
    return (
      '<span class="sr-only" data-role="flying-ball-emoji">' + b.emoji + '</span>' +
      '<div class="catch-ball-3d" data-ball-id="' + b.id + '">' +
        '<div class="catch-ball-3d-top" data-role="flying-ball-top" style="background: ' + b.topColor + ';"></div>' +
        '<div class="catch-ball-3d-bottom" data-role="flying-ball-bottom" style="background: ' + b.bottomColor + ';"></div>' +
        '<div class="catch-ball-3d-belt">' +
          '<div class="catch-ball-3d-btn" data-role="flying-ball-btn" style="border-color: ' + b.accentColor + ';"></div>' +
        '</div>' +
        '<div class="catch-ball-3d-shine"></div>' +
      '</div>'
    );
  }

  function buildStageMarkup(charInfo, initialBall) {
    var slotsHtml = BALL_UPGRADES.map(function (b, idx) {
      var activeClass = idx === 0 ? ' is-current' : '';
      return (
        '<div class="catch-ball-slot' + activeClass + '" data-ball-slot="' + b.round + '" title="' + b.label + '">' +
          '<span class="slot-emoji">' + b.emoji + '</span>' +
          '<span class="slot-round">' + b.round + 'R</span>' +
        '</div>'
      );
    }).join('');

    return (
      '<style>' +
        '.poke-catch-root {' +
          'position: relative; width: 100%; max-width: 900px; height: 100%; min-height: 360px;' +
          'margin: 0 auto;' +
          'display: flex; flex-direction: column; justify-content: space-between;' +
          'background: ' +
            'radial-gradient(circle at 50% 18%, rgba(255, 253, 231, 0.72) 0%, rgba(255, 253, 231, 0) 46%),' +
            'linear-gradient(180deg, #38bdf8 0%, #bae6fd 38%, #86efac 39%, #22c55e 68%, #15803d 100%);' +
          'border-radius: 18px; overflow: hidden; padding: 12px 16px; box-sizing: border-box;' +
          'font-family: "Noto Sans KR", "Outfit", sans-serif; user-select: none;' +
          'color: #1B3B1A;' +
          'box-shadow: 0 12px 32px rgba(0, 0, 0, 0.38), inset 0 2px 0 rgba(255, 255, 255, 0.55);' +
        '}' +
        '.poke-catch-root::before {' +
          'content: ""; position: absolute; top: -18px; left: -4%; right: -4%; height: 86px;' +
          'background: ' +
            'radial-gradient(circle at 12% 20%, #166534 0%, #166534 46px, transparent 48px),' +
            'radial-gradient(circle at 32% 10%, #15803d 0%, #15803d 54px, transparent 56px),' +
            'radial-gradient(circle at 68% 12%, #15803d 0%, #15803d 54px, transparent 56px),' +
            'radial-gradient(circle at 88% 20%, #166534 0%, #166534 46px, transparent 48px);' +
          'opacity: 0.42; pointer-events: none; z-index: 1;' +
        '}' +
        '.poke-catch-root::after {' +
          'content: ""; position: absolute; top: 31%; left: -6%; right: -6%; height: 68px;' +
          'background: ' +
            'radial-gradient(ellipse at 18% 100%, #16a34a 0%, #16a34a 62%, transparent 64%),' +
            'radial-gradient(ellipse at 50% 100%, #15803d 0%, #15803d 65%, transparent 67%),' +
            'radial-gradient(ellipse at 82% 100%, #16a34a 0%, #16a34a 62%, transparent 64%);' +
          'opacity: 0.65; pointer-events: none; z-index: 1;' +
        '}' +
        '.sr-only {' +
          'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;' +
          'overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;' +
        '}' +
        '.catch-hud {' +
          'display: flex; align-items: center; justify-content: space-between; gap: 10px;' +
          'background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(241, 245, 249, 0.94) 100%);' +
          'border: 3px solid #cbd5e1; border-radius: 18px; padding: 8px 14px;' +
          'box-shadow: 0 6px 0 rgba(15, 23, 42, 0.16), 0 10px 20px rgba(0,0,0,0.16); z-index: 3; flex-wrap: wrap;' +
        '}' +
        '.catch-ball-slots {' +
          'display: flex; align-items: center; gap: 6px;' +
          'background: linear-gradient(180deg, #1e293b 0%, #334155 100%);' +
          'padding: 5px 8px; border-radius: 14px; border: 2px solid #475569;' +
          'box-shadow: inset 0 3px 6px rgba(0, 0, 0, 0.48);' +
        '}' +
        '.catch-ball-slot {' +
          'display: flex; flex-direction: column; align-items: center; justify-content: center;' +
          'width: 42px; height: 44px; border-radius: 10px; background: rgba(255, 255, 255, 0.12);' +
          'border: 2px solid rgba(255, 255, 255, 0.18); transition: transform 0.2s, border-color 0.2s, background 0.2s;' +
          'font-size: 11px; font-weight: 900; color: #cbd5e1;' +
        '}' +
        '.catch-ball-slot .slot-emoji { font-size: 16px; line-height: 1.1; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.35)); }' +
        '.catch-ball-slot.is-current {' +
          'background: linear-gradient(180deg, #fffbeb 0%, #fde68a 100%); border-color: #f59e0b; transform: scale(1.1); color: #b45309;' +
          'box-shadow: 0 0 12px rgba(251, 191, 36, 0.8), 0 3px 0 #b45309;' +
        '}' +
        '.catch-ball-slot.is-done {' +
          'background: linear-gradient(180deg, #dcfce7 0%, #86efac 100%); border-color: #22c55e; color: #166534;' +
        '}' +
        '.catch-score-box {' +
          'display: flex; align-items: center; gap: 10px; font-weight: 900;' +
        '}' +
        '.catch-current-ball-badge {' +
          'background: linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%); color: #c2410c; border: 2.5px solid #fb923c;' +
          'border-radius: 999px; padding: 5px 12px; font-size: 13px; font-weight: 900;' +
          'box-shadow: 0 3px 0 rgba(194, 65, 12, 0.2);' +
        '}' +
        '.catch-score-pill {' +
          'background: linear-gradient(180deg, #166534 0%, #14532d 100%); color: #ffffff; border-radius: 999px;' +
          'border: 3px solid #86efac; padding: 4px 16px; font-size: 32px; line-height: 1.05; font-weight: 900;' +
          'letter-spacing: -0.5px; -webkit-text-stroke: 1.2px #14532d;' +
          'text-shadow: 0 2px 0 #14532d, 0 4px 8px rgba(0,0,0,0.35);' +
          'box-shadow: 0 4px 0 #052e16, inset 0 2px 4px rgba(255,255,255,0.35);' +
        '}' +
        '.catch-meadow-stage {' +
          'position: relative; flex: 1; display: flex; flex-direction: column;' +
          'align-items: center; justify-content: center; cursor: pointer; z-index: 2;' +
          'min-height: 210px; touch-action: manipulation;' +
        '}' +
        '.catch-zone-hint {' +
          'margin-bottom: 10px; padding: 6px 18px; border-radius: 999px;' +
          'background: rgba(15, 23, 42, 0.76); border: 2px solid rgba(255,255,255,0.35);' +
          'color: #FFF; font-size: 15px; font-weight: 800;' +
          'text-align: center; transition: background 0.2s, transform 0.2s;' +
          'box-shadow: 0 4px 12px rgba(0,0,0,0.22);' +
        '}' +
        '.catch-target-container {' +
          'position: relative; width: 220px; height: 214px;' +
          'display: flex; align-items: center; justify-content: center;' +
        '}' +
        '.catch-pedestal {' +
          'position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);' +
          'width: 174px; height: 46px; border-radius: 50%; z-index: 1; pointer-events: none;' +
          'background: radial-gradient(ellipse at 50% 38%, #bef264 0%, #84cc16 58%, #4d7c0f 100%);' +
          'border: 3.5px solid #ecfccb;' +
          'box-shadow: 0 8px 0 #365314, 0 14px 24px rgba(0, 0, 0, 0.38), inset 0 4px 10px rgba(255, 255, 255, 0.65);' +
        '}' +
        '.catch-pedestal::after {' +
          'content: ""; position: absolute; inset: 5px 14px; border-radius: 50%;' +
          'border: 2px dashed rgba(255, 255, 255, 0.55);' +
        '}' +
        '.catch-guide-ring {' +
          'position: absolute; width: 146px; height: 146px; border-radius: 50%; z-index: 3;' +
          'border: 3.5px dashed rgba(255, 255, 255, 0.92); pointer-events: none;' +
          'box-shadow: inset 0 0 14px rgba(255,255,255,0.48), 0 0 10px rgba(0,0,0,0.2);' +
        '}' +
        '.catch-target-ring {' +
          'position: absolute; width: 146px; height: 146px; border-radius: 50%; z-index: 3;' +
          'border: 6px solid #FFEE58; pointer-events: none; box-sizing: border-box;' +
          'box-shadow: 0 0 20px rgba(255, 238, 88, 0.88);' +
          'transition: border-color 0.08s ease, box-shadow 0.08s ease;' +
        '}' +
        '.catch-pokemon-sprite {' +
          'width: 132px; height: 132px; object-fit: contain; z-index: 2;' +
          'filter: drop-shadow(0 12px 10px rgba(0,0,0,0.38));' +
          'transition: opacity 0.2s ease, transform 0.15s ease;' +
        '}' +
        '.catch-pokemon-sprite.is-captured { opacity: 0.12; transform: scale(0.28) !important; }' +
        '.catch-flying-ball {' +
          '--ball-top: #EF5350; --ball-bottom: #FFFFFF; --ball-accent: #EF5350;' +
          'position: absolute; z-index: 4; width: 58px; height: 58px; border-radius: 50%;' +
          'border: 3.5px solid #1e293b; box-sizing: border-box; overflow: hidden;' +
          'background: linear-gradient(180deg, var(--ball-top) 0%, var(--ball-top) 48%, #1e293b 48%, #1e293b 52%, var(--ball-bottom) 52%, var(--ball-bottom) 100%);' +
          'box-shadow: 0 8px 16px rgba(0,0,0,0.42), inset -4px -6px 10px rgba(0,0,0,0.28), inset 3px 4px 8px rgba(255,255,255,0.45);' +
          'display: flex; align-items: center; justify-content: center;' +
          'opacity: 0; transform: translateY(64px) scale(0.55); pointer-events: none;' +
          'transition: transform 0.26s cubic-bezier(0.2, 0.9, 0.3, 1.2), opacity 0.2s;' +
        '}' +
        '.catch-flying-ball.is-active { opacity: 1; transform: translateY(0px) scale(1.12); }' +
        '.catch-flying-ball.is-shaking {' +
          'animation: catchBallShake 0.26s ease-in-out infinite alternate;' +
        '}' +
        '.catch-ball-3d {' +
          'position: relative; width: 100%; height: 100%; border-radius: 50%;' +
          'overflow: hidden; box-sizing: border-box;' +
        '}' +
        '.catch-ball-3d-top {' +
          'width: 100%; height: 50%; background: var(--ball-top, #EF5350);' +
          'transition: background 0.2s ease;' +
        '}' +
        '.catch-ball-3d-bottom {' +
          'width: 100%; height: 50%; background: var(--ball-bottom, #FFFFFF);' +
          'transition: background 0.2s ease;' +
        '}' +
        '.catch-ball-3d-belt {' +
          'position: absolute; top: 50%; left: 0; right: 0; height: 7px;' +
          'background: #1E293B; transform: translateY(-50%);' +
          'display: flex; align-items: center; justify-content: center;' +
        '}' +
        '.catch-ball-3d-btn {' +
          'width: 18px; height: 18px; border-radius: 50%;' +
          'background: radial-gradient(circle at 35% 35%, #ffffff 0%, #f1f5f9 70%, #cbd5e1 100%);' +
          'border: 3.5px solid #1E293B;' +
          'box-shadow: 0 0 0 2px rgba(255,255,255,0.9), 0 0 10px var(--ball-accent, #EF5350), 0 2px 4px rgba(0,0,0,0.35);' +
          'box-sizing: border-box;' +
        '}' +
        '.catch-ball-3d-shine {' +
          'position: absolute; top: 6px; left: 9px; width: 16px; height: 9px;' +
          'border-radius: 50%; background: rgba(255, 255, 255, 0.78);' +
          'transform: rotate(-28deg); pointer-events: none;' +
        '}' +
        '@keyframes catchBallShake {' +
          '0% { transform: translateY(0px) rotate(-18deg) scale(1.12); }' +
          '100% { transform: translateY(0px) rotate(18deg) scale(1.12); }' +
        '}' +
        '.catch-rainbow-burst {' +
          'position: absolute; inset: -16px; pointer-events: none; z-index: 5;' +
          'display: flex; align-items: center; justify-content: center;' +
          'font-size: 30px; opacity: 0; transform: scale(0.4);' +
          'transition: opacity 0.25s ease, transform 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28);' +
        '}' +
        '.catch-rainbow-burst.is-bursting { opacity: 1; transform: scale(1.28); }' +
        '.catch-feedback-banner {' +
          'margin-top: 8px; min-height: 54px; width: 94%; max-width: 500px;' +
          'background: rgba(255, 255, 255, 0.96); border: 2.5px solid #bbf7d0; border-radius: 16px; padding: 6px 14px;' +
          'display: flex; flex-direction: column; align-items: center; justify-content: center;' +
          'box-shadow: 0 6px 14px rgba(0,0,0,0.16); text-align: center;' +
        '}' +
        '.catch-feedback-main { font-size: 16px; font-weight: 900; color: #1B5E20; }' +
        '.catch-feedback-sub { font-size: 12px; font-weight: 700; color: #546E7A; margin-top: 2px; }' +
        '.catch-controls {' +
          'display: flex; justify-content: center; align-items: center; z-index: 3; margin-top: 6px;' +
        '}' +
        '.catch-throw-btn {' +
          'width: 100%; max-width: 460px; min-height: 60px; border: 3px solid #fecaca; border-radius: 999px;' +
          'background: linear-gradient(180deg, #ff6b6b 0%, #ef4444 48%, #dc2626 100%); color: #FFFFFF;' +
          'font-size: 20px; font-weight: 900; letter-spacing: -0.3px; cursor: pointer;' +
          'box-shadow: 0 6px 0 #991b1b, 0 10px 20px rgba(0,0,0,0.28), inset 0 2px 0 rgba(255,255,255,0.45);' +
          'transition: transform 0.1s ease, filter 0.15s ease;' +
          'display: flex; align-items: center; justify-content: center; gap: 10px;' +
          'touch-action: manipulation;' +
        '}' +
        '.catch-throw-btn:active { transform: translateY(4px); box-shadow: 0 2px 0 #991b1b; }' +
      '</style>' +
      '<div class="poke-catch-root">' +
        '<div class="catch-hud">' +
          '<div class="catch-ball-slots">' + slotsHtml + '</div>' +
          '<div class="catch-score-box">' +
            '<span class="catch-current-ball-badge" data-role="ball-badge">' + initialBall.label + '</span>' +
            '<span class="catch-score-pill" data-role="score-pill">점수 0점</span>' +
          '</div>' +
        '</div>' +
        '<div class="catch-meadow-stage" data-role="meadow-stage" title="화면을 터치해도 볼을 던질 수 있어요!">' +
          '<div class="catch-zone-hint" data-role="zone-hint">💚 동그라미가 초록색·황금색일 때 던져요!</div>' +
          '<div class="catch-target-container">' +
            '<div class="catch-pedestal" data-role="catch-pedestal"></div>' +
            '<div class="catch-guide-ring"></div>' +
            '<div class="catch-target-ring" data-role="target-ring"></div>' +
            '<img class="catch-pokemon-sprite" data-role="pokemon-sprite" src="' + charInfo.runnerSpriteUrl + '" alt="' + charInfo.nameKr + '" width="132" height="132" draggable="false" />' +
            '<div class="catch-flying-ball" data-role="flying-ball" data-ball-emoji="' + initialBall.emoji + '" style="--ball-top: ' + initialBall.topColor + '; --ball-bottom: ' + initialBall.bottomColor + '; --ball-accent: ' + initialBall.accentColor + ';">' + buildFlyingBallInnerMarkup(initialBall) + '</div>' +
            '<div class="catch-rainbow-burst" data-role="rainbow-burst">🌈✨🌟✨🌈</div>' +
          '</div>' +
          '<div class="catch-feedback-banner" data-role="feedback-banner">' +
            '<div class="catch-feedback-main" data-role="feedback-main">야생의 ' + charInfo.nameKr + ' 친구가 나타났어요!</div>' +
            '<div class="catch-feedback-sub" data-role="feedback-sub">' + initialBall.desc + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="catch-controls">' +
          '<button type="button" class="catch-throw-btn" data-role="throw-btn">' +
            '<span data-role="throw-btn-Icon">' + initialBall.emoji + '</span>' +
            '<span data-role="throw-btn-text">[🔴 지금이야! 볼 던지기!]</span>' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function mountCatchGame(stageEl, charCtx, helpers) {
    if (!stageEl) {
      return function noopCleanup() {};
    }

    var safeHelpers = createSafeHelpers(helpers);
    var charInfo = normalizeCharCtx(charCtx);

    var state = {
      gameId: 'catch',
      round: 1,
      completedRounds: 0,
      maxRounds: TOTAL_ROUNDS,
      score: 0,
      ringScale: RING_MAX,
      ringDirection: -1,
      tick: 0,
      currentBall: getBallForRound(1),
      lastResult: null,
      history: [],
      finished: false,
      cleanedUp: false,
      uiLocked: false
    };

    var rafId = null;
    var timers = [];
    var lastPointerTriggerAt = 0;

    function addTimer(fn, delay) {
      var id = setTimeout(function () {
        var idx = timers.indexOf(id);
        if (idx !== -1) timers.splice(idx, 1);
        if (!state.cleanedUp) fn();
      }, delay);
      timers.push(id);
      return id;
    }

    function clearAllTimers() {
      while (timers.length > 0) {
        clearTimeout(timers.pop());
      }
      if (rafId !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    // 초기 마크업 렌더링
    stageEl.innerHTML = buildStageMarkup(charInfo, state.currentBall);

    function queryRole(role) {
      if (typeof stageEl.querySelector === 'function') {
        return stageEl.querySelector('[data-role="' + role + '"]');
      }
      return null;
    }

    var elBallBadge = queryRole('ball-badge');
    var elScorePill = queryRole('score-pill');
    var elZoneHint = queryRole('zone-hint');
    var elTargetRing = queryRole('target-ring');
    var elPokemonSprite = queryRole('pokemon-sprite');
    var elFlyingBall = queryRole('flying-ball');
    var elFlyingBallEmoji = queryRole('flying-ball-emoji');
    var elFlyingBallTop = queryRole('flying-ball-top');
    var elFlyingBallBottom = queryRole('flying-ball-bottom');
    var elFlyingBallBtn = queryRole('flying-ball-btn');
    var elRainbowBurst = queryRole('rainbow-burst');
    var elFeedbackMain = queryRole('feedback-main');
    var elFeedbackSub = queryRole('feedback-sub');
    var elThrowBtn = queryRole('throw-btn');
    var elThrowBtnIcon = queryRole('throw-btn-Icon');
    var elThrowBtnText = queryRole('throw-btn-text');
    var elMeadowStage = queryRole('meadow-stage');

    function updateFlyingBallVisual(ball) {
      var b = ball || state.currentBall || BALL_UPGRADES[0];
      if (elFlyingBall) {
        if (typeof elFlyingBall.setAttribute === 'function') {
          elFlyingBall.setAttribute('data-ball-emoji', b.emoji);
        }
        if (elFlyingBall.style && typeof elFlyingBall.style.setProperty === 'function') {
          elFlyingBall.style.setProperty('--ball-top', b.topColor);
          elFlyingBall.style.setProperty('--ball-bottom', b.bottomColor);
          elFlyingBall.style.setProperty('--ball-accent', b.accentColor);
        }
      }
      if (elFlyingBallEmoji) {
        elFlyingBallEmoji.textContent = b.emoji;
      }
      if (elFlyingBallTop && elFlyingBallTop.style) {
        elFlyingBallTop.style.background = b.topColor;
      }
      if (elFlyingBallBottom && elFlyingBallBottom.style) {
        elFlyingBallBottom.style.background = b.bottomColor;
      }
      if (elFlyingBallBtn && elFlyingBallBtn.style) {
        elFlyingBallBtn.style.borderColor = b.accentColor;
      }
    }

    function updateRingVisual(scale) {
      var preview = evaluateRingScale(scale, state.round);
      if (elTargetRing && elTargetRing.style) {
        elTargetRing.style.transform = 'scale(' + scale.toFixed(3) + ')';
        elTargetRing.style.borderColor = preview.ringColor;
        elTargetRing.style.boxShadow = '0 0 20px ' + preview.ringGlow;
      }
      if (elZoneHint && !state.uiLocked) {
        elZoneHint.textContent = preview.hintText;
      }
    }

    function updateHudUI() {
      var ball = state.currentBall;
      if (elScorePill) {
        elScorePill.textContent = '점수 ' + state.score + '점';
      }
      if (elBallBadge) {
        elBallBadge.textContent = ball.label;
      }
      if (elThrowBtnIcon) {
        elThrowBtnIcon.textContent = ball.emoji;
      }
      if (elThrowBtnText) {
        elThrowBtnText.textContent = '[' + ball.emoji + ' 지금이야! 볼 던지기!]';
      }
      if (typeof stageEl.querySelectorAll === 'function') {
        var slots = stageEl.querySelectorAll('[data-ball-slot]');
        if (slots && slots.length) {
          for (var i = 0; i < slots.length; i++) {
            var slotEl = slots[i];
            var r = Number(slotEl.getAttribute('data-ball-slot'));
            var cls = 'catch-ball-slot';
            if (r <= state.completedRounds) {
              cls += ' is-done';
            } else if (r === state.round && !state.finished) {
              cls += ' is-current';
            }
            slotEl.className = cls;
          }
        }
      }
    }

    function finishGame() {
      var prevHigh = safeHelpers.getHighScore('catch');
      safeHelpers.saveHighScore('catch', state.score);
      safeHelpers.rewardCharacter();
      safeHelpers.playCry();

      var excellentCount = state.history.filter(function (h) { return h.tier === 'excellent'; }).length;
      var summaryText =
        charInfo.nameKr + ' 친구와 5번의 몬스터볼 캐치를 모두 마쳤어요! (엑설런트 ' + excellentCount + '회)';

      safeHelpers.showResultOverlay(stageEl, {
        gameId: 'catch',
        title: '🎉 ' + charInfo.nameKr + ' 캐치 대성공!',
        score: state.score,
        highScore: Math.max(prevHigh, state.score),
        maxScore: TOTAL_ROUNDS * 100,
        summary: summaryText,
        badges: BALL_UPGRADES.map(function (b) { return b.emoji + ' ' + b.name; })
      });
    }

    /**
     * 핵심 판정 및 라운드 진행 함수
     * @param {number} [explicitScale] 테스트 또는 지정 스케일. 생략 시 현재 state.ringScale 사용
     */
    function throwBallAtScale(explicitScale) {
      if (state.cleanedUp || state.finished) {
        return state.lastResult;
      }

      var usedScale = (typeof explicitScale === 'number' && !isNaN(explicitScale))
        ? explicitScale
        : state.ringScale;

      var activeRound = state.round;
      var activeBall = getBallForRound(activeRound);
      var judgment = evaluateRingScale(usedScale, activeRound);

      // 점수 및 라운드 상태 즉시(동기적) 반영
      state.score += judgment.points;
      state.completedRounds += 1;

      var resultRecord = {
        round: activeRound,
        scale: usedScale,
        tier: judgment.tier,
        zone: judgment.zone,
        points: judgment.points,
        shakes: judgment.shakes,
        rainbowBurst: judgment.rainbowBurst,
        message: judgment.message,
        subMessage: judgment.subMessage,
        ball: activeBall,
        totalScore: state.score
      };

      state.lastResult = resultRecord;
      state.history.push(resultRecord);

      if (state.completedRounds >= TOTAL_ROUNDS) {
        state.finished = true;
        state.round = TOTAL_ROUNDS;
      } else {
        state.round = state.completedRounds + 1;
        state.currentBall = getBallForRound(state.round);
      }

      // 효과음 재생
      if (judgment.tier === 'excellent') {
        safeHelpers.playSfx('excellent', 4);
      } else if (judgment.tier === 'nice') {
        safeHelpers.playSfx('hit', 2);
      } else {
        safeHelpers.playSfx('tap', 1);
      }

      // 피드백 및 HUD 즉시 갱신
      updateRingVisual(usedScale);
      updateHudUI();
      updateFlyingBallVisual(activeBall);

      if (elFeedbackMain) {
        elFeedbackMain.textContent = judgment.message;
      }
      if (elFeedbackSub) {
        elFeedbackSub.textContent = judgment.subMessage;
      }
      if (elFlyingBall) {
        elFlyingBall.className = 'catch-flying-ball is-active is-shaking';
      }
      if (elPokemonSprite) {
        elPokemonSprite.className = 'catch-pokemon-sprite is-captured';
      }
      if (elRainbowBurst) {
        elRainbowBurst.className = judgment.rainbowBurst
          ? 'catch-rainbow-burst is-bursting'
          : 'catch-rainbow-burst';
      }

      state.uiLocked = true;

      if (state.finished) {
        finishGame();
      } else {
        // 다음 라운드 볼 준비 연출
        var nextBall = state.currentBall;
        addTimer(function () {
          state.uiLocked = false;
          state.ringScale = RING_MAX;
          updateFlyingBallVisual(nextBall);
          if (elFlyingBall) {
            elFlyingBall.className = 'catch-flying-ball';
          }
          if (elPokemonSprite) {
            elPokemonSprite.className = 'catch-pokemon-sprite';
          }
          if (elRainbowBurst) {
            elRainbowBurst.className = 'catch-rainbow-burst';
          }
          if (elFeedbackMain) {
            elFeedbackMain.textContent = nextBall.label + ' 준비 완료!';
          }
          if (elFeedbackSub) {
            elFeedbackSub.textContent = nextBall.desc;
          }
          updateRingVisual(state.ringScale);
        }, 750);
      }

      return resultRecord;
    }

    function handleUserThrowTrigger(e) {
      if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      if (e && typeof e.stopPropagation === 'function') {
        e.stopPropagation();
      }
      var now = Date.now();
      if (e && e.type === 'pointerdown') {
        lastPointerTriggerAt = now;
      } else if (e && e.type === 'click' && lastPointerTriggerAt && (now - lastPointerTriggerAt < 350)) {
        return;
      }
      if (state.cleanedUp || state.finished || state.uiLocked) {
        return;
      }
      throwBallAtScale(state.ringScale);
    }

    // 애니메이션 루프: 타깃 링 수축(1.8 -> 0.4) 및 포켓몬 통통 점프
    function stepAnimation() {
      if (state.cleanedUp) return;

      state.tick += 1;

      if (!state.uiLocked && !state.finished) {
        state.ringScale -= 0.018;
        if (state.ringScale < RING_MIN) {
          state.ringScale = RING_MAX;
        }
        updateRingVisual(state.ringScale);
      }

      if (elPokemonSprite && elPokemonSprite.style && !state.uiLocked) {
        elPokemonSprite.style.transform = safeHelpers.computeRunTransform('run', state.tick);
      }

      if (typeof requestAnimationFrame === 'function') {
        rafId = requestAnimationFrame(stepAnimation);
      }
    }

    // 이벤트 바인딩 (pointerdown + click 중복 방지 처리)
    if (elThrowBtn && typeof elThrowBtn.addEventListener === 'function') {
      elThrowBtn.addEventListener('pointerdown', handleUserThrowTrigger);
      elThrowBtn.addEventListener('click', handleUserThrowTrigger);
    }
    if (elMeadowStage && typeof elMeadowStage.addEventListener === 'function') {
      elMeadowStage.addEventListener('pointerdown', handleUserThrowTrigger);
      elMeadowStage.addEventListener('click', handleUserThrowTrigger);
    }

    function onKeyDown(e) {
      if (state.cleanedUp || state.finished) return;
      if (!e) return;
      if (e.code === 'Space' || e.key === ' ' || e.code === 'Enter' || e.key === 'Enter') {
        handleUserThrowTrigger(e);
      }
    }

    if (typeof global.addEventListener === 'function') {
      global.addEventListener('keydown', onKeyDown);
    }

    // 초기 비주얼 업데이트 및 루프 시작
    updateRingVisual(state.ringScale);
    updateHudUI();
    updateFlyingBallVisual(state.currentBall);
    if (typeof requestAnimationFrame === 'function') {
      rafId = requestAnimationFrame(stepAnimation);
    }

    // 테스트 및 외부 제어용 훅 노출
    var gameInstance = {
      throwBall: throwBallAtScale,
      throwBallAtScale: throwBallAtScale,
      getState: function () {
        return {
          round: state.round,
          completedRounds: state.completedRounds,
          maxRounds: state.maxRounds,
          score: state.score,
          ringScale: state.ringScale,
          currentBall: state.currentBall,
          lastResult: state.lastResult,
          history: state.history.slice(),
          finished: state.finished
        };
      }
    };

    stageEl._catchGame = gameInstance;

    return function cleanup() {
      if (state.cleanedUp) return;
      state.cleanedUp = true;
      clearAllTimers();
      if (typeof global.removeEventListener === 'function') {
        global.removeEventListener('keydown', onKeyDown);
      }
      if (elThrowBtn && typeof elThrowBtn.removeEventListener === 'function') {
        elThrowBtn.removeEventListener('pointerdown', handleUserThrowTrigger);
        elThrowBtn.removeEventListener('click', handleUserThrowTrigger);
      }
      if (elMeadowStage && typeof elMeadowStage.removeEventListener === 'function') {
        elMeadowStage.removeEventListener('pointerdown', handleUserThrowTrigger);
        elMeadowStage.removeEventListener('click', handleUserThrowTrigger);
      }
      if (stageEl._catchGame === gameInstance) {
        stageEl._catchGame = null;
      }
    };
  }

  var gameDef = {
    id: 'catch',
    title: '흔들흔들! 몬스터볼 캐치',
    subtitle: '동그라미가 초록색일 때 몬스터볼을 던져요!',
    icon: '🔴',
    badgeColor: '#FFCA28',
    BALL_UPGRADES: BALL_UPGRADES,
    evaluateRingScale: evaluateRingScale,
    mount: mountCatchGame
  };

  global.PokeGameCatch = gameDef;
  if (global.PokeMiniGames && typeof global.PokeMiniGames.register === 'function') {
    global.PokeMiniGames.register(gameDef.id, gameDef);
  }
})(typeof window !== 'undefined' ? window : globalThis);
