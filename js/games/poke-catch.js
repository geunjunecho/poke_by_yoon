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
   * 라운드별 링 수축 속도 반환 (라운드가 올라갈수록 빨라짐)
   */
  function getRingSpeedForRound(roundIdx) {
    var r = Math.max(1, Math.min(TOTAL_ROUNDS, Number(roundIdx) || 1));
    return Number((0.022 + (r - 1) * 0.0045).toFixed(4));
  }

  /**
   * 라운드별 배틀 타이밍 게이지 이동 속도 반환
   */
  function getBattleSpeedForRound(roundIdx) {
    var r = Math.max(1, Math.min(TOTAL_ROUNDS, Number(roundIdx) || 1));
    return Number((0.022 + (r - 1) * 0.0055).toFixed(4));
  }

  /**
   * 배틀 페이즈 커서 위치(0.0 ~ 1.0, 중앙 0.5)에 따른 공격 판정
   */
  function evaluateBattleAttack(cursorPos, roundIdx, charInfo) {
    var c = typeof cursorPos === 'number' && !isNaN(cursorPos) ? cursorPos : 0.5;
    var r = Math.max(1, Math.min(TOTAL_ROUNDS, Number(roundIdx) || 1));
    var dist = Math.abs(c - 0.5);
    var critHalf = Math.max(0.08, 0.13 - (r - 1) * 0.01);
    var hitHalf = Math.max(0.19, 0.27 - (r - 1) * 0.015);
    var typeEmoji = (charInfo && charInfo.typeEmoji) || '⚡';
    var typeNameKr = (charInfo && charInfo.typeNameKr) || '전기';

    if (dist <= critHalf) {
      var critDmg = r === 1 ? 100 : (r <= 3 ? 55 : 50);
      return {
        tier: 'critical',
        damage: critDmg,
        sparkText: typeEmoji + ' 크리티컬! -' + critDmg,
        message: '💥 ' + typeEmoji + typeNameKr + ' 크리티컬 히트!! 체력이 크게 깎였어요!',
        subMessage: '정확한 타이밍이에요! 포켓몬이 어지러워하면 볼을 던져요!'
      };
    }

    if (dist <= hitHalf) {
      var hitDmg = r === 1 ? 55 : (r <= 3 ? 40 : 35);
      return {
        tier: 'hit',
        damage: hitDmg,
        sparkText: '💥 명중! -' + hitDmg,
        message: '⚡ ' + typeNameKr + ' 공격 명중! 야생 포켓몬의 힘이 빠지고 있어요!',
        subMessage: '조금만 더 공격해서 체력을 0으로 만들어 주세요!'
      };
    }

    var grazeDmg = 25;
    return {
      tier: 'graze',
      damage: grazeDmg,
      sparkText: '💨 스침 -' + grazeDmg,
      message: '💨 살짝 스쳤어요! 게이지 가운데 노란 칸을 노려보세요!',
      subMessage: '가운데 ⚡크리티컬 구간에 맞춰 누르면 단번에 힘을 뺄 수 있어요!'
    };
  }

  /**
   * 링 스케일 값에 따른 판정 계산
   * - 황금 링 구간 (0.78 <= ringScale <= 0.98): +100점
   * - 초록 링 구간 (0.58 <= ringScale <= 라운드별 상한 1.08~1.02): +70점
   * - 노란 링 구간 (그 외 구간): +30점 (빗맞음 튕김)
   */
  function evaluateRingScale(scale, roundIdx) {
    var s = typeof scale === 'number' && !isNaN(scale) ? scale : 1.5;
    var r = Math.max(1, Math.min(TOTAL_ROUNDS, Number(roundIdx) || 1));
    var isMasterRound = r === TOTAL_ROUNDS;
    var greenMax = Number((1.08 - (r - 1) * 0.015).toFixed(3));

    if (s >= 0.78 && s <= 0.98) {
      return {
        tier: 'excellent',
        zone: 'gold',
        points: 100,
        shakes: 1,
        caught: true,
        action: 'captured',
        rainbowBurst: true,
        ringColor: '#FFD54F',
        ringGlow: 'rgba(255, 213, 79, 0.85)',
        hintText: '🌟 황금 찬스! 지금 던져요!!',
        message: '✨ 엑설런트 캐치!! 볼이 열리며 딱 잡혔어요! (+100점)',
        subMessage: isMasterRound ? '🟣 마스터볼 보너스 대성공!! 완벽해요!' : '🌈 무지개 별폭발! 볼이 활짝 열리고 단번에 찰칵 잡았어요!'
      };
    }

    if (s >= 0.58 && s <= greenMax) {
      return {
        tier: 'nice',
        zone: 'green',
        points: 70,
        shakes: 3,
        caught: true,
        action: 'captured',
        rainbowBurst: false,
        ringColor: '#66BB6A',
        ringGlow: 'rgba(102, 187, 106, 0.8)',
        hintText: '💚 초록 링! 지금 던져요!',
        message: '👍 나이스 캐치! 볼이 열리며 포켓몬이 쏙! (+70점)',
        subMessage: isMasterRound ? '🟣 마스터볼 대성공! 흔들흔들 찰칵!' : '볼이 열려 포켓몬이 들어간 뒤 흔들... 흔들... 찰칵!'
      };
    }

    return {
      tier: 'good',
      zone: 'yellow',
      points: 30,
      shakes: 0,
      caught: false,
      action: 'deflected',
      rainbowBurst: false,
      ringColor: '#FFEE58',
      ringGlow: 'rgba(255, 238, 88, 0.75)',
      hintText: '💛 동그라미가 더 작아질 때까지 기다려요!',
      message: '💥 틱! 포켓몬에 부딪혀 볼이 땅에 떨어졌어요! (+30점)',
      subMessage: '동그라미가 포켓몬 몸 크기로 줄어들어 초록·황금색일 때 던져야 잡혀요!'
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
      '<div class="catch-ball-core" data-role="flying-ball-core"></div>' +
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
          'position: relative; width: 100%; max-width: 920px; height: 100%; min-height: 0;' +
          'margin: 0 auto;' +
          'display: flex; flex-direction: column; justify-content: space-between; gap: clamp(4px, 1vh, 8px);' +
          'background: ' +
            'radial-gradient(circle at 50% 18%, rgba(255, 253, 231, 0.72) 0%, rgba(255, 253, 231, 0) 46%),' +
            'linear-gradient(180deg, #38bdf8 0%, #bae6fd 38%, #86efac 39%, #22c55e 68%, #15803d 100%);' +
          'border-radius: 18px; overflow: hidden; padding: clamp(8px, 1.5vh, 12px) clamp(10px, 2vw, 16px); box-sizing: border-box;' +
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
          'display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-shrink: 0;' +
          'background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(241, 245, 249, 0.94) 100%);' +
          'border: 3px solid #cbd5e1; border-radius: 16px; padding: clamp(5px, 1vh, 8px) 12px;' +
          'box-shadow: 0 5px 0 rgba(15, 23, 42, 0.16), 0 8px 16px rgba(0,0,0,0.16); z-index: 3; flex-wrap: wrap;' +
        '}' +
        '.catch-ball-slots {' +
          'display: flex; align-items: center; gap: 5px;' +
          'background: linear-gradient(180deg, #1e293b 0%, #334155 100%);' +
          'padding: 4px 7px; border-radius: 12px; border: 2px solid #475569;' +
          'box-shadow: inset 0 3px 6px rgba(0, 0, 0, 0.48);' +
        '}' +
        '.catch-ball-slot {' +
          'display: flex; flex-direction: column; align-items: center; justify-content: center;' +
          'width: clamp(36px, 5vw, 42px); height: clamp(38px, 5vh, 44px); border-radius: 10px; background: rgba(255, 255, 255, 0.12);' +
          'border: 2px solid rgba(255, 255, 255, 0.18); transition: transform 0.2s, border-color 0.2s, background 0.2s;' +
          'font-size: 11px; font-weight: 900; color: #cbd5e1;' +
        '}' +
        '.catch-ball-slot .slot-emoji { font-size: 15px; line-height: 1.1; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.35)); }' +
        '.catch-ball-slot.is-current {' +
          'background: linear-gradient(180deg, #fffbeb 0%, #fde68a 100%); border-color: #f59e0b; transform: scale(1.08); color: #b45309;' +
          'box-shadow: 0 0 12px rgba(251, 191, 36, 0.8), 0 3px 0 #b45309;' +
        '}' +
        '.catch-ball-slot.is-done {' +
          'background: linear-gradient(180deg, #dcfce7 0%, #86efac 100%); border-color: #22c55e; color: #166534;' +
        '}' +
        '.catch-score-box {' +
          'display: flex; align-items: center; gap: 8px; font-weight: 900;' +
        '}' +
        '.catch-current-ball-badge {' +
          'background: linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%); color: #c2410c; border: 2px solid #fb923c;' +
          'border-radius: 999px; padding: 4px 10px; font-size: 12.5px; font-weight: 900;' +
          'box-shadow: 0 3px 0 rgba(194, 65, 12, 0.2);' +
        '}' +
        '.catch-score-pill {' +
          'background: linear-gradient(180deg, #166534 0%, #14532d 100%); color: #ffffff; border-radius: 999px;' +
          'border: 2.5px solid #86efac; padding: 3px 14px; font-size: clamp(20px, 3.2vw, 28px); line-height: 1.05; font-weight: 900;' +
          'letter-spacing: -0.5px; -webkit-text-stroke: 1px #14532d;' +
          'text-shadow: 0 2px 0 #14532d, 0 4px 8px rgba(0,0,0,0.35);' +
          'box-shadow: 0 4px 0 #052e16, inset 0 2px 4px rgba(255,255,255,0.35);' +
        '}' +
        '.catch-meadow-stage {' +
          'position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column;' +
          'align-items: center; justify-content: center; cursor: pointer; z-index: 2;' +
          'touch-action: manipulation;' +
        '}' +
        '.catch-zone-hint {' +
          'margin-bottom: clamp(2px, 0.6vh, 6px); padding: 3px 14px; border-radius: 999px; flex-shrink: 0;' +
          'background: rgba(15, 23, 42, 0.76); border: 2px solid rgba(255,255,255,0.35);' +
          'color: #FFF; font-size: clamp(12px, 1.8vw, 14px); font-weight: 800;' +
          'text-align: center; transition: background 0.2s, transform 0.2s;' +
          'box-shadow: 0 4px 12px rgba(0,0,0,0.22);' +
        '}' +
        '.catch-target-container {' +
          'position: relative; width: clamp(136px, 21vh, 188px); height: clamp(132px, 20vh, 182px);' +
          'display: flex; align-items: center; justify-content: center; flex-shrink: 0;' +
        '}' +
        '.catch-pedestal {' +
          'position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);' +
          'width: clamp(136px, 20vh, 168px); height: clamp(34px, 5vh, 44px); border-radius: 50%; z-index: 1; pointer-events: none;' +
          'background: radial-gradient(ellipse at 50% 38%, #bef264 0%, #84cc16 58%, #4d7c0f 100%);' +
          'border: 3.5px solid #ecfccb;' +
          'box-shadow: 0 8px 0 #365314, 0 14px 24px rgba(0, 0, 0, 0.38), inset 0 4px 10px rgba(255, 255, 255, 0.65);' +
        '}' +
        '.catch-pedestal::after {' +
          'content: ""; position: absolute; inset: 5px 14px; border-radius: 50%;' +
          'border: 2px dashed rgba(255, 255, 255, 0.55);' +
        '}' +
        '.catch-guide-ring {' +
          'position: absolute; width: clamp(116px, 17.5vh, 142px); height: clamp(116px, 17.5vh, 142px); border-radius: 50%; z-index: 3;' +
          'border: 3.5px dashed rgba(255, 255, 255, 0.92); pointer-events: none;' +
          'box-shadow: inset 0 0 14px rgba(255,255,255,0.48), 0 0 10px rgba(0,0,0,0.2);' +
        '}' +
        '.catch-target-ring {' +
          'position: absolute; width: clamp(116px, 17.5vh, 142px); height: clamp(116px, 17.5vh, 142px); border-radius: 50%; z-index: 3;' +
          'border: 6px solid #FFEE58; pointer-events: none; box-sizing: border-box;' +
          'box-shadow: 0 0 20px rgba(255, 238, 88, 0.88);' +
          'transition: border-color 0.08s ease, box-shadow 0.08s ease;' +
        '}' +
        '.catch-pokemon-sprite {' +
          'width: clamp(104px, 16vh, 128px); height: clamp(104px, 16vh, 128px); object-fit: contain; z-index: 2;' +
          'filter: drop-shadow(0 12px 10px rgba(0,0,0,0.38));' +
          'transition: opacity 0.2s ease, transform 0.15s ease;' +
        '}' +
        '.catch-pokemon-sprite.is-captured {' +
          'animation: catchPokemonSuckIn 0.88s cubic-bezier(0.3, 0.05, 0.2, 1) forwards !important;' +
        '}' +
        '.catch-pokemon-sprite.is-deflecting {' +
          'animation: catchPokemonDeflect 0.68s ease-out !important;' +
        '}' +
        '.catch-capture-beam {' +
          'position: absolute; width: 158px; height: 158px; border-radius: 50%; z-index: 3; pointer-events: none;' +
          'background: radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(251,113,133,0.72) 42%, rgba(250,204,21,0.35) 68%, transparent 78%);' +
          'opacity: 0; transform: scale(0.3);' +
        '}' +
        '.catch-capture-beam.is-active {' +
          'animation: catchBeamFlash 0.88s ease-out forwards;' +
        '}' +
        '.catch-impact-spark {' +
          'position: absolute; top: 34px; right: 20px; z-index: 6; pointer-events: none;' +
          'background: linear-gradient(180deg, #FEF08A 0%, #F97316 100%); color: #7C2D12;' +
          'border: 2.5px solid #FFFFFF; border-radius: 999px; padding: 3px 10px;' +
          'font-size: 13px; font-weight: 900; box-shadow: 0 4px 12px rgba(0,0,0,0.35);' +
          'opacity: 0; transform: scale(0.4);' +
        '}' +
        '.catch-impact-spark.is-active {' +
          'animation: catchImpactPop 0.72s ease-out forwards;' +
        '}' +
        '.catch-flying-ball {' +
          '--ball-top: #EF5350; --ball-bottom: #FFFFFF; --ball-accent: #EF5350;' +
          'position: absolute; z-index: 5; width: 60px; height: 60px; border-radius: 50%;' +
          'box-sizing: border-box; overflow: visible;' +
          'display: flex; align-items: center; justify-content: center;' +
          'opacity: 0.96; transform: translate3d(0, 126px, 0) scale(1.18); pointer-events: none;' +
          'animation: catchBallReadyBob 1.35s ease-in-out infinite;' +
        '}' +
        '.catch-flying-ball.is-active.is-catch-success {' +
          'opacity: 1;' +
          'animation: catchBallThrowCapture 0.88s cubic-bezier(0.22, 0.8, 0.26, 1) forwards;' +
        '}' +
        '.catch-flying-ball.is-active.is-catch-fail {' +
          'opacity: 1;' +
          'animation: catchBallThrowDeflect 0.82s cubic-bezier(0.25, 0.7, 0.35, 1) forwards;' +
        '}' +
        '.catch-ball-core {' +
          'position: absolute; inset: 4px; border-radius: 50%; z-index: 1; pointer-events: none;' +
          'background: radial-gradient(circle, #FFFFFF 0%, #FDE047 38%, #FB7185 72%, transparent 100%);' +
          'box-shadow: 0 0 26px rgba(255, 255, 255, 0.95), 0 0 42px rgba(251, 113, 133, 0.85);' +
          'opacity: 0; transform: scale(0.4);' +
        '}' +
        '.catch-flying-ball.is-opening .catch-ball-core {' +
          'animation: catchCoreGlow 0.88s ease-out forwards;' +
        '}' +
        '.catch-ball-3d {' +
          'position: relative; width: 100%; height: 100%; border-radius: 50%; z-index: 2;' +
          'overflow: visible; box-sizing: border-box;' +
          'filter: drop-shadow(0 8px 14px rgba(0,0,0,0.42));' +
        '}' +
        '.catch-ball-3d-top {' +
          'width: 100%; height: 50%; background: var(--ball-top, #EF5350);' +
          'border-radius: 60px 60px 0 0; border: 3.5px solid #1e293b; border-bottom: 2px solid #1e293b;' +
          'box-sizing: border-box; transform-origin: 15% 100%;' +
          'box-shadow: inset 3px 4px 8px rgba(255,255,255,0.45);' +
          'transition: background 0.2s ease;' +
        '}' +
        '.catch-ball-3d-bottom {' +
          'width: 100%; height: 50%; background: var(--ball-bottom, #FFFFFF);' +
          'border-radius: 0 0 60px 60px; border: 3.5px solid #1e293b; border-top: 2px solid #1e293b;' +
          'box-sizing: border-box; transform-origin: 15% 0%;' +
          'box-shadow: inset -4px -6px 10px rgba(0,0,0,0.25);' +
          'transition: background 0.2s ease;' +
        '}' +
        '.catch-flying-ball.is-opening .catch-ball-3d-top {' +
          'animation: catchLidTopOpen 0.88s ease-in-out forwards;' +
        '}' +
        '.catch-flying-ball.is-opening .catch-ball-3d-bottom {' +
          'animation: catchLidBottomOpen 0.88s ease-in-out forwards;' +
        '}' +
        '.catch-ball-3d-belt {' +
          'position: absolute; top: 50%; left: 2px; right: 2px; height: 7px;' +
          'background: #1E293B; transform: translateY(-50%); z-index: 3;' +
          'display: flex; align-items: center; justify-content: center;' +
        '}' +
        '.catch-flying-ball.is-opening .catch-ball-3d-belt {' +
          'animation: catchBeltHideOnOpen 0.88s ease-in-out forwards;' +
        '}' +
        '.catch-ball-3d-btn {' +
          'width: 18px; height: 18px; border-radius: 50%;' +
          'background: radial-gradient(circle at 35% 35%, #ffffff 0%, #f1f5f9 70%, #cbd5e1 100%);' +
          'border: 3.5px solid #1E293B;' +
          'box-shadow: 0 0 0 2px rgba(255,255,255,0.9), 0 0 10px var(--ball-accent, #EF5350), 0 2px 4px rgba(0,0,0,0.35);' +
          'box-sizing: border-box;' +
        '}' +
        '.catch-ball-3d-shine {' +
          'position: absolute; top: 7px; left: 10px; width: 15px; height: 8px; z-index: 4;' +
          'border-radius: 50%; background: rgba(255, 255, 255, 0.78);' +
          'transform: rotate(-28deg); pointer-events: none;' +
        '}' +
        '@keyframes catchBallReadyBob {' +
          '0%, 100% { transform: translate3d(0, 126px, 0) scale(1.18); }' +
          '50% { transform: translate3d(0, 119px, 0) scale(1.22); }' +
        '}' +
        '@keyframes catchBallThrowCapture {' +
          '0% { transform: translate3d(0, 126px, 0) scale(1.24) rotate(0deg); }' +
          '18% { transform: translate3d(0, -48px, 0) scale(0.92) rotate(360deg); }' +
          '28% { transform: translate3d(0, -14px, 0) scale(1.14) rotate(360deg); }' +
          '54% { transform: translate3d(0, -14px, 0) scale(1.18) rotate(360deg); }' +
          '64% { transform: translate3d(0, 18px, 0) scale(1.08) rotate(360deg); }' +
          '73% { transform: translate3d(-9px, 18px, 0) scale(1.08) rotate(340deg); }' +
          '82% { transform: translate3d(9px, 18px, 0) scale(1.08) rotate(380deg); }' +
          '91% { transform: translate3d(-5px, 18px, 0) scale(1.08) rotate(350deg); }' +
          '100% { transform: translate3d(0, 18px, 0) scale(1.12) rotate(360deg); }' +
        '}' +
        '@keyframes catchLidTopOpen {' +
          '0%, 22% { transform: translateY(0) rotate(0deg); }' +
          '30%, 52% { transform: translateY(-16px) rotate(-38deg); }' +
          '60%, 100% { transform: translateY(0) rotate(0deg); }' +
        '}' +
        '@keyframes catchLidBottomOpen {' +
          '0%, 22% { transform: translateY(0) rotate(0deg); }' +
          '30%, 52% { transform: translateY(12px) rotate(24deg); }' +
          '60%, 100% { transform: translateY(0) rotate(0deg); }' +
        '}' +
        '@keyframes catchBeltHideOnOpen {' +
          '0%, 22% { opacity: 1; }' +
          '28%, 52% { opacity: 0.25; transform: translateY(-50%) scale(0.85); }' +
          '60%, 100% { opacity: 1; transform: translateY(-50%) scale(1); }' +
        '}' +
        '@keyframes catchCoreGlow {' +
          '0%, 22% { opacity: 0; transform: scale(0.3); }' +
          '30%, 52% { opacity: 1; transform: scale(1.45); }' +
          '62%, 100% { opacity: 0; transform: scale(0.2); }' +
        '}' +
        '@keyframes catchBeamFlash {' +
          '0%, 20% { opacity: 0; transform: scale(0.35); }' +
          '30% { opacity: 0.96; transform: scale(1.22); }' +
          '52% { opacity: 0.85; transform: scale(0.45); }' +
          '62%, 100% { opacity: 0; transform: scale(0.15); }' +
        '}' +
        '@keyframes catchPokemonSuckIn {' +
          '0%, 20% { opacity: 1; transform: translateY(0) scale(1); filter: brightness(1) drop-shadow(0 12px 10px rgba(0,0,0,0.38)); }' +
          '28% { opacity: 1; transform: translateY(-8px) scale(1.08); filter: brightness(2.5) saturate(1.8) drop-shadow(0 0 22px #FFFFFF); }' +
          '54%, 100% { opacity: 0; transform: translateY(-16px) scale(0.06) rotate(220deg); filter: brightness(3) drop-shadow(0 0 24px #FDE047); }' +
        '}' +
        '@keyframes catchBallThrowDeflect {' +
          '0% { transform: translate3d(0, 126px, 0) scale(1.24) rotate(0deg); opacity: 1; }' +
          '20% { transform: translate3d(0, -34px, 0) scale(0.96) rotate(280deg); opacity: 1; }' +
          '30% { transform: translate3d(6px, -6px, 0) scale(1.05) rotate(370deg); opacity: 1; }' +
          '54% { transform: translate3d(52px, 58px, 0) scale(0.88) rotate(540deg); opacity: 1; }' +
          '70% { transform: translate3d(68px, 40px, 0) scale(0.84) rotate(630deg); opacity: 0.96; }' +
          '86% { transform: translate3d(82px, 62px, 0) scale(0.80) rotate(705deg); opacity: 0.92; }' +
          '100% { transform: translate3d(90px, 64px, 0) scale(0.78) rotate(750deg); opacity: 0.84; }' +
        '}' +
        '@keyframes catchPokemonDeflect {' +
          '0%, 22% { transform: translate3d(0, 0, 0) scale(1); }' +
          '32% { transform: translate3d(-12px, -5px, 0) rotate(-9deg) scale(1.05); filter: brightness(1.35) drop-shadow(0 12px 10px rgba(0,0,0,0.38)); }' +
          '56% { transform: translate3d(6px, 0, 0) rotate(4deg) scale(0.98); }' +
          '100% { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }' +
        '}' +
        '@keyframes catchImpactPop {' +
          '0%, 22% { opacity: 0; transform: scale(0.3) translateY(8px); }' +
          '32% { opacity: 1; transform: scale(1.15) translateY(-4px); }' +
          '65% { opacity: 1; transform: scale(1) translateY(-8px); }' +
          '100% { opacity: 0; transform: scale(0.7) translateY(-14px); }' +
        '}' +
        '.catch-rainbow-burst {' +
          'position: absolute; inset: -16px; pointer-events: none; z-index: 5;' +
          'display: flex; align-items: center; justify-content: center;' +
          'font-size: 30px; opacity: 0; transform: scale(0.4);' +
          'transition: opacity 0.25s ease, transform 0.35s cubic-bezier(0.18, 0.89, 0.32, 1.28);' +
        '}' +
        '.catch-rainbow-burst.is-bursting { opacity: 1; transform: scale(1.28); }' +
        '.catch-feedback-banner {' +
          'margin-top: 4px; min-height: 48px; width: 94%; max-width: 500px;' +
          'background: rgba(255, 255, 255, 0.96); border: 2.5px solid #bbf7d0; border-radius: 16px; padding: 5px 12px;' +
          'display: flex; flex-direction: column; align-items: center; justify-content: center;' +
          'box-shadow: 0 6px 14px rgba(0,0,0,0.16); text-align: center;' +
        '}' +
        '.catch-feedback-main { font-size: clamp(13px, 2vw, 15.5px); font-weight: 900; color: #1B5E20; word-break: keep-all; }' +
        '.catch-feedback-sub { font-size: clamp(11px, 1.6vw, 12px); font-weight: 700; color: #546E7A; margin-top: 2px; word-break: keep-all; }' +
        '.catch-hp-bar-wrap {' +
          'width: 92%; max-width: 390px; background: rgba(15, 23, 42, 0.86);' +
          'border: 2.5px solid #e2e8f0; border-radius: 14px; padding: 5px 10px;' +
          'margin-bottom: clamp(3px, 0.8vh, 6px); flex-shrink: 0;' +
          'box-shadow: 0 5px 12px rgba(0,0,0,0.28); z-index: 4;' +
        '}' +
        '.catch-hp-top {' +
          'display: flex; align-items: center; justify-content: space-between; gap: 6px;' +
          'font-size: 12px; font-weight: 900; color: #f8fafc; margin-bottom: 4px;' +
        '}' +
        '.catch-phase-badge {' +
          'padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 900;' +
          'background: linear-gradient(180deg, #f97316 0%, #ea580c 100%); color: #fff;' +
          'border: 1.5px solid #fed7aa;' +
        '}' +
        '.catch-phase-badge.is-catch-phase {' +
          'background: linear-gradient(180deg, #10b981 0%, #059669 100%); border-color: #a7f3d0;' +
        '}' +
        '.catch-hp-track {' +
          'width: 100%; height: 12px; border-radius: 999px; background: #1e293b;' +
          'border: 1.5px solid #475569; overflow: hidden; position: relative;' +
        '}' +
        '.catch-hp-fill {' +
          'height: 100%; width: 100%; border-radius: 999px;' +
          'background: linear-gradient(90deg, #22c55e 0%, #4ade80 100%);' +
          'transition: width 0.22s ease, background 0.22s ease;' +
        '}' +
        '.catch-hp-fill.is-mid { background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%); }' +
        '.catch-hp-fill.is-low { background: linear-gradient(90deg, #ef4444 0%, #f87171 100%); }' +
        '.catch-dizzy-stars {' +
          'position: absolute; top: 4px; left: 50%; transform: translateX(-50%);' +
          'font-size: 22px; font-weight: 900; z-index: 6; pointer-events: none;' +
          'opacity: 0; transition: opacity 0.2s ease;' +
          'filter: drop-shadow(0 2px 4px rgba(0,0,0,0.45));' +
        '}' +
        '.catch-dizzy-stars.is-active {' +
          'opacity: 1; animation: catchDizzySpin 1.1s ease-in-out infinite;' +
        '}' +
        '@keyframes catchDizzySpin {' +
          '0%, 100% { transform: translateX(-50%) translateY(0) scale(1); }' +
          '50% { transform: translateX(-50%) translateY(-5px) scale(1.12); }' +
        '}' +
        '.catch-pokemon-sprite.is-battle-hit {' +
          'animation: catchBattleRecoil 0.42s ease-out !important;' +
        '}' +
        '@keyframes catchBattleRecoil {' +
          '0% { transform: translate3d(0, 0, 0) scale(1); filter: brightness(2.6) saturate(1.8); }' +
          '25% { transform: translate3d(-14px, -6px, 0) rotate(-10deg) scale(0.92); filter: brightness(2.2) drop-shadow(0 0 18px #facc15); }' +
          '55% { transform: translate3d(12px, 2px, 0) rotate(8deg) scale(1.04); }' +
          '100% { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }' +
        '}' +
        '.catch-battle-gauge {' +
          'width: 92%; max-width: 390px; margin-top: 4px; padding: 6px 10px;' +
          'background: rgba(15, 23, 42, 0.88); border: 2.5px solid #fbbf24; border-radius: 14px;' +
          'box-shadow: 0 6px 14px rgba(0,0,0,0.28); z-index: 4; flex-shrink: 0;' +
        '}' +
        '.catch-battle-gauge.is-hidden { display: none; }' +
        '.catch-battle-gauge-label {' +
          'font-size: 11.5px; font-weight: 900; color: #fef08a; text-align: center; margin-bottom: 4px;' +
        '}' +
        '.catch-battle-track {' +
          'position: relative; width: 100%; height: 18px; border-radius: 999px; overflow: hidden;' +
          'background: linear-gradient(90deg, #475569 0%, #475569 23%, #22c55e 23%, #22c55e 38%, #facc15 38%, #f59e0b 62%, #22c55e 62%, #22c55e 77%, #475569 77%, #475569 100%);' +
          'border: 2px solid #f8fafc; box-shadow: inset 0 2px 4px rgba(0,0,0,0.45);' +
        '}' +
        '.catch-battle-cursor {' +
          'position: absolute; top: -2px; bottom: -2px; width: 12px; left: 50%;' +
          'transform: translateX(-50%); border-radius: 6px; background: #ffffff;' +
          'border: 2.5px solid #dc2626; box-shadow: 0 0 10px #fef08a, 0 0 4px #000;' +
        '}' +
        '.catch-target-ring.is-battle-phase, .catch-guide-ring.is-battle-phase {' +
          'opacity: 0.18;' +
        '}' +
        '.catch-flying-ball.is-battle-phase {' +
          'opacity: 0.35; transform: translate3d(0, 134px, 0) scale(0.92); animation: none;' +
        '}' +
        '.catch-controls {' +
          'display: flex; justify-content: center; align-items: center; z-index: 3; margin-top: 4px;' +
        '}' +
        '.catch-throw-btn {' +
          'width: 100%; max-width: 460px; min-height: clamp(50px, 7.5vh, 60px); border: 3px solid #fecaca; border-radius: 999px;' +
          'background: linear-gradient(180deg, #ff6b6b 0%, #ef4444 48%, #dc2626 100%); color: #FFFFFF;' +
          'font-size: clamp(16px, 2.4vw, 20px); font-weight: 900; letter-spacing: -0.3px; cursor: pointer;' +
          'box-shadow: 0 6px 0 #991b1b, 0 10px 20px rgba(0,0,0,0.28), inset 0 2px 0 rgba(255,255,255,0.45);' +
          'transition: transform 0.1s ease, filter 0.15s ease; white-space: nowrap;' +
          'display: flex; align-items: center; justify-content: center; gap: 10px;' +
          'touch-action: manipulation;' +
        '}' +
        '.catch-throw-btn.is-battle-mode {' +
          'border-color: #fde68a;' +
          'background: linear-gradient(180deg, #f59e0b 0%, #ea580c 52%, #c2410c 100%);' +
          'box-shadow: 0 6px 0 #7c2d12, 0 10px 20px rgba(0,0,0,0.28), inset 0 2px 0 rgba(255,255,255,0.45);' +
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
        '<div class="catch-meadow-stage" data-role="meadow-stage" title="화면을 터치해 배틀 공격 및 몬스터볼 투척을 할 수 있어요!">' +
          '<div class="catch-hp-bar-wrap" data-role="hp-bar-wrap">' +
            '<div class="catch-hp-top">' +
              '<span data-role="phase-badge" class="catch-phase-badge">⚔️ STEP 1 배틀로 힘 빼기</span>' +
              '<span data-role="hp-text">야생 체력 100%</span>' +
            '</div>' +
            '<div class="catch-hp-track">' +
              '<div class="catch-hp-fill" data-role="hp-fill" style="width: 100%;"></div>' +
            '</div>' +
          '</div>' +
          '<div class="catch-zone-hint" data-role="zone-hint">⚡ 게이지가 가운데 황금 칸에 올 때 공격해요!</div>' +
          '<div class="catch-target-container">' +
            '<div class="catch-pedestal" data-role="catch-pedestal"></div>' +
            '<div class="catch-guide-ring is-battle-phase" data-role="guide-ring"></div>' +
            '<div class="catch-target-ring is-battle-phase" data-role="target-ring"></div>' +
            '<div class="catch-capture-beam" data-role="capture-beam"></div>' +
            '<div class="catch-dizzy-stars" data-role="dizzy-stars">💫 ⭐ 💫</div>' +
            '<img class="catch-pokemon-sprite" data-role="pokemon-sprite" src="' + charInfo.runnerSpriteUrl + '" alt="' + charInfo.nameKr + '" width="132" height="132" draggable="false" />' +
            '<div class="catch-impact-spark" data-role="impact-spark">💥 틱!</div>' +
            '<div class="catch-flying-ball is-battle-phase" data-role="flying-ball" data-ball-emoji="' + initialBall.emoji + '" style="--ball-top: ' + initialBall.topColor + '; --ball-bottom: ' + initialBall.bottomColor + '; --ball-accent: ' + initialBall.accentColor + ';">' + buildFlyingBallInnerMarkup(initialBall) + '</div>' +
            '<div class="catch-rainbow-burst" data-role="rainbow-burst">🌈✨🌟✨🌈</div>' +
          '</div>' +
          '<div class="catch-battle-gauge" data-role="battle-gauge">' +
            '<div class="catch-battle-gauge-label" data-role="battle-gauge-label">⚡ 타이밍 어택 게이지 (가운데 황금 칸 = 크리티컬!)</div>' +
            '<div class="catch-battle-track">' +
              '<div class="catch-battle-cursor" data-role="battle-cursor" style="left: 50%;"></div>' +
            '</div>' +
          '</div>' +
          '<div class="catch-feedback-banner" data-role="feedback-banner">' +
            '<div class="catch-feedback-main" data-role="feedback-main">야생의 ' + charInfo.nameKr + ' 등장! 먼저 배틀로 힘을 빼주세요!</div>' +
            '<div class="catch-feedback-sub" data-role="feedback-sub">체력을 0%로 만들면 ' + initialBall.name + '을 던질 수 있어요!</div>' +
          '</div>' +
        '</div>' +
        '<div class="catch-controls">' +
          '<button type="button" class="catch-throw-btn is-battle-mode" data-role="throw-btn">' +
            '<span data-role="throw-btn-Icon">' + charInfo.typeEmoji + '</span>' +
            '<span data-role="throw-btn-text">[' + charInfo.typeEmoji + ' 타이밍 맞춰 ' + charInfo.typeNameKr + ' 공격!]</span>' +
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
      phase: 'battle',
      hp: 100,
      maxHp: 100,
      battleCursor: 0.5,
      battleDirection: 1,
      pokemonOffsetX: 0,
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
    var elGuideRing = queryRole('guide-ring');
    var elTargetRing = queryRole('target-ring');
    var elCaptureBeam = queryRole('capture-beam');
    var elDizzyStars = queryRole('dizzy-stars');
    var elPokemonSprite = queryRole('pokemon-sprite');
    var elImpactSpark = queryRole('impact-spark');
    var elFlyingBall = queryRole('flying-ball');
    var elFlyingBallEmoji = queryRole('flying-ball-emoji');
    var elFlyingBallTop = queryRole('flying-ball-top');
    var elFlyingBallBottom = queryRole('flying-ball-bottom');
    var elFlyingBallBtn = queryRole('flying-ball-btn');
    var elRainbowBurst = queryRole('rainbow-burst');
    var elPhaseBadge = queryRole('phase-badge');
    var elHpText = queryRole('hp-text');
    var elHpFill = queryRole('hp-fill');
    var elBattleGauge = queryRole('battle-gauge');
    var elBattleCursor = queryRole('battle-cursor');
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

    function updatePhaseUI() {
      var isBattle = state.phase === 'battle';
      var hpPct = Math.max(0, Math.min(100, Math.round((state.hp / state.maxHp) * 100)));
      var ball = state.currentBall;

      if (elPhaseBadge) {
        elPhaseBadge.textContent = isBattle ? '⚔️ STEP 1 배틀로 힘 빼기' : '🔴 STEP 2 포획 찬스!';
        elPhaseBadge.className = isBattle ? 'catch-phase-badge' : 'catch-phase-badge is-catch-phase';
      }
      if (elHpText) {
        elHpText.textContent = isBattle
          ? ('야생 체력 ' + hpPct + '%')
          : '💫 헤롱헤롱! (체력 0%)';
      }
      if (elHpFill) {
        if (elHpFill.style) {
          elHpFill.style.width = hpPct + '%';
        }
        var fillCls = 'catch-hp-fill';
        if (hpPct <= 25) fillCls += ' is-low';
        else if (hpPct <= 55) fillCls += ' is-mid';
        elHpFill.className = fillCls;
      }
      if (elDizzyStars) {
        elDizzyStars.className = isBattle ? 'catch-dizzy-stars' : 'catch-dizzy-stars is-active';
      }
      if (elBattleGauge) {
        elBattleGauge.className = isBattle ? 'catch-battle-gauge' : 'catch-battle-gauge is-hidden';
      }
      if (elGuideRing) {
        elGuideRing.className = isBattle ? 'catch-guide-ring is-battle-phase' : 'catch-guide-ring';
      }
      if (elTargetRing) {
        elTargetRing.className = isBattle ? 'catch-target-ring is-battle-phase' : 'catch-target-ring';
      }
      if (elFlyingBall && !state.uiLocked) {
        elFlyingBall.className = isBattle ? 'catch-flying-ball is-battle-phase' : 'catch-flying-ball';
      }
      if (elThrowBtn) {
        elThrowBtn.className = isBattle ? 'catch-throw-btn is-battle-mode' : 'catch-throw-btn';
      }
      if (elThrowBtnIcon) {
        elThrowBtnIcon.textContent = isBattle ? charInfo.typeEmoji : ball.emoji;
      }
      if (elThrowBtnText) {
        elThrowBtnText.textContent = isBattle
          ? ('[' + charInfo.typeEmoji + ' 타이밍 맞춰 ' + charInfo.typeNameKr + ' 공격!]')
          : ('[' + ball.emoji + ' 지금이야! ' + ball.name + ' 던지기!]');
      }
      if (elZoneHint && isBattle && !state.uiLocked) {
        elZoneHint.textContent = '⚡ 게이지가 가운데 황금 칸에 올 때 공격해요!';
      }
    }

    function updateBattleCursorVisual() {
      if (elBattleCursor && elBattleCursor.style) {
        var pct = Math.max(4, Math.min(96, state.battleCursor * 100));
        elBattleCursor.style.left = pct.toFixed(1) + '%';
      }
    }

    function updateRingVisual(scale) {
      var preview = evaluateRingScale(scale, state.round);
      if (elTargetRing && elTargetRing.style) {
        elTargetRing.style.transform = 'scale(' + scale.toFixed(3) + ')';
        elTargetRing.style.borderColor = preview.ringColor;
        elTargetRing.style.boxShadow = '0 0 20px ' + preview.ringGlow;
      }
      if (elZoneHint && !state.uiLocked && state.phase === 'catch') {
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
      updatePhaseUI();
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
        charInfo.nameKr + ' 친구와 5번의 배틀 & 몬스터볼 캐치를 모두 마쳤어요! (엑설런트 ' + excellentCount + '회)';

      safeHelpers.showResultOverlay(stageEl, {
        gameId: 'catch',
        title: '🎉 ' + charInfo.nameKr + ' 배틀 & 캐치 완료!',
        score: state.score,
        highScore: Math.max(prevHigh, state.score),
        maxScore: TOTAL_ROUNDS * 100,
        summary: summaryText,
        badges: BALL_UPGRADES.map(function (b) { return b.emoji + ' ' + b.name; })
      });
    }

    /**
     * STEP 1 배틀 페이즈 공격 수행
     */
    function attackAtCursor(explicitCursor) {
      if (state.cleanedUp || state.finished) {
        return null;
      }
      var cursorVal = (typeof explicitCursor === 'number' && !isNaN(explicitCursor))
        ? explicitCursor
        : state.battleCursor;

      var atk = evaluateBattleAttack(cursorVal, state.round, charInfo);
      state.hp = Math.max(0, state.hp - atk.damage);

      if (atk.tier === 'critical') {
        safeHelpers.playSfx('excellent', 3);
      } else if (atk.tier === 'hit') {
        safeHelpers.playSfx('hit', 2);
      } else {
        safeHelpers.playSfx('tap', 1);
      }

      if (elPokemonSprite) {
        elPokemonSprite.className = 'catch-pokemon-sprite is-battle-hit';
      }
      if (elImpactSpark) {
        elImpactSpark.textContent = atk.sparkText;
        elImpactSpark.className = 'catch-impact-spark is-active';
      }

      if (state.hp <= 0) {
        state.hp = 0;
        state.phase = 'catch';
        state.ringScale = RING_MAX;
        safeHelpers.playCry();
        if (elFeedbackMain) {
          elFeedbackMain.textContent = '💫 ' + charInfo.nameKr + ' 친구가 어지러워해요! 지금 포획 찬스!';
        }
        if (elFeedbackSub) {
          elFeedbackSub.textContent = '동그라미가 작아져서 초록·황금색일 때 ' + state.currentBall.name + '을 던져요!';
        }
        updateRingVisual(state.ringScale);
      } else {
        if (elFeedbackMain) {
          elFeedbackMain.textContent = atk.message;
        }
        if (elFeedbackSub) {
          elFeedbackSub.textContent = atk.subMessage + ' (남은 체력 ' + state.hp + '%)';
        }
      }

      updateHudUI();

      addTimer(function () {
        if (!state.uiLocked && elPokemonSprite) {
          elPokemonSprite.className = 'catch-pokemon-sprite';
        }
        if (!state.uiLocked && elImpactSpark) {
          elImpactSpark.className = 'catch-impact-spark';
        }
      }, 380);

      return {
        tier: atk.tier,
        damage: atk.damage,
        remainingHp: state.hp,
        phase: state.phase
      };
    }

    /**
     * 핵심 판정 및 라운드 진행 함수
     * @param {number} [explicitScale] 테스트 또는 지정 스케일. 생략 시 현재 state.ringScale 사용
     */
    function throwBallAtScale(explicitScale) {
      if (state.cleanedUp || state.finished) {
        return state.lastResult;
      }

      // 직접 호출 시에도 현재 라운드 포획 단계로 동기 전환
      state.hp = 0;
      state.phase = 'catch';

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
        caught: Boolean(judgment.caught),
        action: judgment.action || (judgment.caught ? 'captured' : 'deflected'),
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
        // 다음 라운드 시작 시 다시 배틀 페이즈(HP 100)로 초기화
        state.phase = 'battle';
        state.hp = 100;
        state.battleCursor = 0.5;
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
      if (judgment.caught) {
        if (elFlyingBall) {
          elFlyingBall.className = 'catch-flying-ball is-active is-catch-success is-opening is-shaking';
        }
        if (elPokemonSprite) {
          elPokemonSprite.className = 'catch-pokemon-sprite is-captured';
        }
        if (elCaptureBeam) {
          elCaptureBeam.className = 'catch-capture-beam is-active';
        }
        if (elImpactSpark) {
          elImpactSpark.className = 'catch-impact-spark';
        }
      } else {
        if (elFlyingBall) {
          elFlyingBall.className = 'catch-flying-ball is-active is-catch-fail is-deflected';
        }
        if (elPokemonSprite) {
          elPokemonSprite.className = 'catch-pokemon-sprite is-deflected-recoil is-deflecting';
        }
        if (elCaptureBeam) {
          elCaptureBeam.className = 'catch-capture-beam';
        }
        if (elImpactSpark) {
          elImpactSpark.textContent = '💥 틱!';
          elImpactSpark.className = 'catch-impact-spark is-active';
        }
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
        // 다음 라운드 배틀 & 볼 준비 연출
        var nextBall = state.currentBall;
        addTimer(function () {
          state.uiLocked = false;
          state.ringScale = RING_MAX;
          updateFlyingBallVisual(nextBall);
          updateHudUI();
          if (elPokemonSprite) {
            elPokemonSprite.className = 'catch-pokemon-sprite';
          }
          if (elCaptureBeam) {
            elCaptureBeam.className = 'catch-capture-beam';
          }
          if (elImpactSpark) {
            elImpactSpark.className = 'catch-impact-spark';
          }
          if (elRainbowBurst) {
            elRainbowBurst.className = 'catch-rainbow-burst';
          }
          if (elFeedbackMain) {
            elFeedbackMain.textContent = nextBall.label + ' 라운드! 먼저 배틀로 힘을 빼요!';
          }
          if (elFeedbackSub) {
            elFeedbackSub.textContent = '야생 포켓몬이 더 빨라졌어요! 게이지 중앙에 맞춰 공격해요!';
          }
          updateRingVisual(state.ringScale);
        }, 900);
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
      if (state.phase === 'battle') {
        attackAtCursor(state.battleCursor);
      } else {
        throwBallAtScale(state.ringScale);
      }
    }

    // 애니메이션 루프: 배틀 게이지 왕복 / 타깃 링 수축(1.8 -> 0.4) 및 포켓몬 좌우 회피 점프
    function stepAnimation() {
      if (state.cleanedUp) return;

      state.tick += 1;

      if (!state.uiLocked && !state.finished) {
        if (state.phase === 'battle') {
          var bSpeed = getBattleSpeedForRound(state.round);
          state.battleCursor += bSpeed * state.battleDirection;
          if (state.battleCursor >= 0.96) {
            state.battleCursor = 0.96;
            state.battleDirection = -1;
          } else if (state.battleCursor <= 0.04) {
            state.battleCursor = 0.04;
            state.battleDirection = 1;
          }
          updateBattleCursorVisual();
        } else {
          var rSpeed = getRingSpeedForRound(state.round);
          state.ringScale -= rSpeed;
          if (state.ringScale < RING_MIN) {
            state.ringScale = RING_MAX;
          }
          updateRingVisual(state.ringScale);
        }
      }

      if (elPokemonSprite && elPokemonSprite.style && !state.uiLocked) {
        var swayAmp = 12 + (state.round - 1) * 7;
        var swayFreq = 0.055 + (state.round - 1) * 0.012;
        state.pokemonOffsetX = Math.sin(state.tick * swayFreq) * swayAmp;
        var baseRun = safeHelpers.computeRunTransform('run', state.tick);
        elPokemonSprite.style.transform =
          'translateX(' + state.pokemonOffsetX.toFixed(1) + 'px) ' + baseRun;
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
    updateBattleCursorVisual();
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
      attackAtCursor: attackAtCursor,
      getState: function () {
        return {
          round: state.round,
          completedRounds: state.completedRounds,
          maxRounds: state.maxRounds,
          score: state.score,
          phase: state.phase,
          hp: state.hp,
          maxHp: state.maxHp,
          battleCursor: state.battleCursor,
          pokemonOffsetX: state.pokemonOffsetX,
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
    subtitle: '먼저 배틀로 힘을 빼고 동그라미가 초록·황금색일 때 던져요!',
    icon: '🔴',
    badgeColor: '#FFCA28',
    BALL_UPGRADES: BALL_UPGRADES,
    evaluateRingScale: evaluateRingScale,
    evaluateBattleAttack: evaluateBattleAttack,
    getRingSpeedForRound: getRingSpeedForRound,
    getBattleSpeedForRound: getBattleSpeedForRound,
    mount: mountCatchGame
  };

  global.PokeGameCatch = gameDef;
  if (global.PokeMiniGames && typeof global.PokeMiniGames.register === 'function') {
    global.PokeMiniGames.register(gameDef.id, gameDef);
  }
})(typeof window !== 'undefined' ? window : globalThis);
