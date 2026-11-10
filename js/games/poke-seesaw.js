/**
 * 포켓몬 미니게임 P4: 누가누가 더 클까? 시소 대결 (poke-seesaw.js)
 * 6~7세 맞춤 5라운드 직관적 크기·무게 비교 시소 놀이
 */
(function (global) {
  'use strict';

  var TOTAL_ROUNDS = 5;

  function artworkUrlById(id) {
    return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/' + id + '.png';
  }

  // 오프라인/즉시 반응용 대표 비교 포켓몬 20종 내장 풀 (weight: 0.1kg 단위, height: 0.1m 단위)
  var OPPONENT_POOL = [
    { id: 143, nameKr: '잠만보',   weight: 4600, height: 21,  artworkUrl: artworkUrlById(143) },
    { id: 321, nameKr: '고래왕',   weight: 3980, height: 145, artworkUrl: artworkUrlById(321) },
    { id: 50,  nameKr: '디그다',   weight: 8,    height: 2,   artworkUrl: artworkUrlById(50)  },
    { id: 25,  nameKr: '피카츄',   weight: 60,   height: 4,   artworkUrl: artworkUrlById(25)  },
    { id: 6,   nameKr: '리자몽',   weight: 905,  height: 17,  artworkUrl: artworkUrlById(6)   },
    { id: 9,   nameKr: '거북왕',   weight: 855,  height: 16,  artworkUrl: artworkUrlById(9)   },
    { id: 1,   nameKr: '이상해씨', weight: 69,   height: 7,   artworkUrl: artworkUrlById(1)   },
    { id: 39,  nameKr: '푸린',     weight: 55,   height: 5,   artworkUrl: artworkUrlById(39)  },
    { id: 95,  nameKr: '롱스톤',   weight: 2100, height: 88,  artworkUrl: artworkUrlById(95)  },
    { id: 130, nameKr: '갸라도스', weight: 2350, height: 65,  artworkUrl: artworkUrlById(130) },
    { id: 133, nameKr: '이브이',   weight: 65,   height: 3,   artworkUrl: artworkUrlById(133) },
    { id: 151, nameKr: '뮤',       weight: 40,   height: 4,   artworkUrl: artworkUrlById(151) },
    { id: 149, nameKr: '망나뇽',   weight: 2100, height: 22,  artworkUrl: artworkUrlById(149) },
    { id: 68,  nameKr: '괴력몬',   weight: 1300, height: 16,  artworkUrl: artworkUrlById(68)  },
    { id: 81,  nameKr: '코일',     weight: 60,   height: 3,   artworkUrl: artworkUrlById(81)  },
    { id: 448, nameKr: '루카리오', weight: 540,  height: 12,  artworkUrl: artworkUrlById(448) },
    { id: 658, nameKr: '개굴닌자', weight: 400,  height: 15,  artworkUrl: artworkUrlById(658) },
    { id: 175, nameKr: '토게피',   weight: 15,   height: 3,   artworkUrl: artworkUrlById(175) },
    { id: 132, nameKr: '메타몽',   weight: 40,   height: 3,   artworkUrl: artworkUrlById(132) },
    { id: 94,  nameKr: '팬텀',     weight: 405,  height: 15,  artworkUrl: artworkUrlById(94)  }
  ];

  function formatMetric(value, mode) {
    var num = Number(value) || 0;
    var converted = (num / 10).toFixed(1);
    return mode === 'height' ? converted + 'm' : converted + 'kg';
  }

  var ROUND_DIFFICULTY_META = {
    1: { level: 1, badge: 'Lv.1 워밍업 1:1', desc: '누가 더 클지 한눈에 비교해 봐요!' },
    2: { level: 2, badge: 'Lv.2 박빙 라이벌!', desc: '비슷한 체급끼리 만났어요! 잘 생각해 봐요!' },
    3: { level: 3, badge: 'Lv.3 협동 시소 대결!', desc: '여러 마리가 함께 탔어요! 합치면 누가 이길까요?' },
    4: { level: 4, badge: 'Lv.4 아슬아슬 합산 추리!', desc: '마릿수까지 계산해야 맞힐 수 있는 고수 문제!' },
    5: { level: 5, badge: 'Lv.5 챔피언 초박빙 매치!', desc: '마지막 최고 난이도! 시소 챔피언에 도전해요!' }
  };

  function getQuestionBannerText(mode, roundNum, leftCount, rightCount) {
    var isTeam = (leftCount || 1) > 1 || (rightCount || 1) > 1;
    if (mode === 'height') {
      return isTeam
        ? '📏 협동 키 대결! 위로 차곡차곡 쌓으면 어느 쪽이 더 높을까?'
        : '📏 누가누가 키가 더 클까?';
    }
    return isTeam
      ? '⚖️ 협동 무게 대결! 다 함께 타면 어느 쪽이 더 무거울까?'
      : '⚖️ 누가누가 더 무거울까?';
  }

  function normalizeMyPokemon(charCtx) {
    var c = charCtx || {};
    var id = Number(c.id) || 25;
    var poolMatch = null;
    for (var i = 0; i < OPPONENT_POOL.length; i++) {
      if (OPPONENT_POOL[i].id === id) {
        poolMatch = OPPONENT_POOL[i];
        break;
      }
    }

    var weight = Number(c.weight);
    if (!weight || isNaN(weight)) {
      weight = poolMatch ? poolMatch.weight : 60;
    }

    var height = Number(c.height);
    if (!height || isNaN(height)) {
      height = poolMatch ? poolMatch.height : 4;
    }

    var defaultArt = artworkUrlById(id);
    return {
      id: id,
      nameKr: c.nameKr || (poolMatch ? poolMatch.nameKr : '피카츄'),
      weight: weight,
      height: height,
      artworkUrl: c.artworkUrl || c.runnerSpriteUrl || c.spriteUrl || defaultArt
    };
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

  /**
   * 라운드별 단계적 난이도 상승 문제 생성기 (Lv.1 ~ Lv.5)
   * - 1R (Lv.1 워밍업): 1 vs 1 기본 체급 대결
   * - 2R (Lv.2 박빙 라이벌): 1 vs 1 체급 차이가 가장 작은 박빙 대결
   * - 3R (Lv.3 협동 시소 대결): 가벼운/작은 포켓몬이 2~4마리 함께 타는 다수 vs 1마리 합산 대결
   * - 4R (Lv.4 아슬아슬 합산 추리): 양쪽 합산 비율이 65%~96% 이내인 박빙 다수 팀 대결
   * - 5R (Lv.5 챔피언 초박빙 매치): 양쪽 합산 비율이 가장 팽팽한 최고 난이도 팀 매치
   */
  function pickQuestionForRound(myPoke, roundNum, usedIds) {
    var mode = (roundNum % 2 === 1) ? 'weight' : 'height';
    var diffMeta = ROUND_DIFFICULTY_META[roundNum] || ROUND_DIFFICULTY_META[1];

    function filterCandidates(targetMode, ignoreUsed) {
      return OPPONENT_POOL.filter(function (cand) {
        if (cand.id === myPoke.id) return false;
        if (cand.weight === myPoke.weight || cand.height === myPoke.height) {
          return false;
        }
        if (!ignoreUsed && usedIds.indexOf(cand.id) !== -1) {
          return false;
        }
        return cand[targetMode] !== myPoke[targetMode];
      });
    }

    var candidates = filterCandidates(mode, false);
    if (candidates.length === 0) {
      candidates = filterCandidates(mode, true);
    }
    if (candidates.length === 0) {
      candidates = OPPONENT_POOL.filter(function (cand) {
        return cand[mode] !== myPoke[mode];
      });
    }

    var myBaseVal = Number(myPoke[mode]) || 10;
    var opponent = candidates[0] || OPPONENT_POOL[0];
    var leftCount = 1;
    var rightCount = 1;

    if (roundNum === 1) {
      // 1R: 적당한 체급 차이(비율 0.2 ~ 0.78) 우선 선택
      var r1Pool = candidates.filter(function (c) {
        var ratio = Math.min(myBaseVal, c[mode]) / Math.max(myBaseVal, c[mode]);
        return ratio >= 0.18 && ratio <= 0.82;
      });
      var pool1 = r1Pool.length > 0 ? r1Pool : candidates;
      opponent = pool1[Math.floor(Math.random() * pool1.length)] || candidates[0];
    } else if (roundNum === 2) {
      // 2R: 1 vs 1 중에서 내 포켓몬과 체급 차이가 가장 작은 상위 4마리 박빙 라이벌 선택
      var sortedClosest = candidates.slice().sort(function (a, b) {
        var diffA = Math.abs(a[mode] - myBaseVal) / Math.max(a[mode], myBaseVal);
        var diffB = Math.abs(b[mode] - myBaseVal) / Math.max(b[mode], myBaseVal);
        return diffA - diffB;
      });
      var topRivals = sortedClosest.slice(0, Math.min(4, sortedClosest.length));
      opponent = topRivals[Math.floor(Math.random() * topRivals.length)] || sortedClosest[0];
    } else {
      // 3R ~ 5R: 다수(2~5마리) 협동 합산 시소 대결 조합 탐색
      var maxMultiplier = roundNum >= 4 ? 5 : 4;
      var combos = [];
      for (var i = 0; i < candidates.length; i++) {
        var cand = candidates[i];
        var candVal = Number(cand[mode]) || 10;
        for (var lc = 1; lc <= maxMultiplier; lc++) {
          for (var rc = 1; rc <= maxMultiplier; rc++) {
            if (lc === 1 && rc === 1) continue;
            var lSum = myBaseVal * lc;
            var rSum = candVal * rc;
            if (lSum === rSum) continue;
            var ratio = Math.min(lSum, rSum) / Math.max(lSum, rSum);
            combos.push({
              cand: cand,
              leftCount: lc,
              rightCount: rc,
              ratio: ratio
            });
          }
        }
      }

      if (combos.length > 0) {
        combos.sort(function (a, b) {
          return b.ratio - a.ratio; // 비율이 1에 가까울수록(박빙일수록) 앞쪽
        });
        var minRatio = roundNum === 3 ? 0.45 : (roundNum === 4 ? 0.65 : 0.78);
        var filteredCombos = combos.filter(function (cb) {
          return cb.ratio >= minRatio && cb.ratio <= 0.97;
        });
        var targetCombos = filteredCombos.length > 0
          ? filteredCombos.slice(0, Math.min(8, filteredCombos.length))
          : combos.slice(0, Math.min(6, combos.length));
        var chosenCombo = targetCombos[Math.floor(Math.random() * targetCombos.length)] || combos[0];
        opponent = chosenCombo.cand;
        leftCount = chosenCombo.leftCount;
        rightCount = chosenCombo.rightCount;
      } else {
        opponent = candidates[Math.floor(Math.random() * candidates.length)] || OPPONENT_POOL[0];
        if (myBaseVal < opponent[mode]) {
          leftCount = 3;
          rightCount = 1;
        } else {
          leftCount = 1;
          rightCount = 3;
        }
        if (myBaseVal * leftCount === opponent[mode] * rightCount) {
          leftCount += 1;
        }
      }
    }

    usedIds.push(opponent.id);

    var leftVal = myBaseVal * leftCount;
    var rightVal = Number(opponent[mode]) * rightCount;
    if (leftVal === rightVal) {
      rightCount += 1;
      rightVal = Number(opponent[mode]) * rightCount;
    }
    var correctSide = leftVal > rightVal ? 'left' : 'right';
    var leftLabel = leftCount > 1 ? (myPoke.nameKr + ' ×' + leftCount + '마리') : myPoke.nameKr;
    var rightLabel = rightCount > 1 ? (opponent.nameKr + ' ×' + rightCount + '마리') : opponent.nameKr;

    return {
      round: roundNum,
      difficultyLevel: diffMeta.level,
      difficultyBadge: diffMeta.badge,
      difficultyDesc: diffMeta.desc,
      mode: mode,
      questionText: getQuestionBannerText(mode, roundNum, leftCount, rightCount),
      leftPokemon: myPoke,
      rightPokemon: opponent,
      leftCount: leftCount,
      rightCount: rightCount,
      leftLabel: leftLabel,
      rightLabel: rightLabel,
      leftUnitValue: myBaseVal,
      rightUnitValue: Number(opponent[mode]),
      leftValue: leftVal,
      rightValue: rightVal,
      correctSide: correctSide
    };
  }

  function buildBuddySpritesHtml(poke, count) {
    var n = Math.max(1, Math.min(5, Number(count) || 1));
    if (n <= 1) return '';
    var items = [];
    for (var i = 1; i < n; i++) {
      items.push(
        '<img class="seesaw-buddy-mini" src="' + poke.artworkUrl + '" alt="" width="44" height="44" draggable="false" />'
      );
    }
    return items.join('');
  }

  function buildSeesawMarkup(myPoke, initialQ) {
    var opp = initialQ.rightPokemon;
    var isTeam = initialQ.leftCount > 1 || initialQ.rightCount > 1;
    var compareInitText = initialQ.mode === 'height'
      ? (isTeam ? '📏 합산 키 대결 VS' : '📏 키 비교 VS')
      : (isTeam ? '⚖️ 합산 무게 대결 VS' : '⚖️ 무게 비교 VS');
    var leftHintText = initialQ.leftCount > 1
      ? ('1마리 ' + formatMetric(initialQ.leftUnitValue, initialQ.mode) + ' × ' + initialQ.leftCount + ' = ❓')
      : '❓ 비밀';
    var rightHintText = initialQ.rightCount > 1
      ? ('1마리 ' + formatMetric(initialQ.rightUnitValue, initialQ.mode) + ' × ' + initialQ.rightCount + ' = ❓')
      : '❓ 비밀';

    return (
      '<style>' +
        '.poke-seesaw-root {' +
          'position: relative; width: 100%; max-width: 920px; height: 100%; min-height: 0;' +
          'margin: 0 auto;' +
          'display: flex; flex-direction: column; justify-content: space-between; gap: clamp(4px, 1vh, 10px);' +
          'background: ' +
            'radial-gradient(circle at 50% 28%, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0) 52%),' +
            'linear-gradient(180deg, #bae6fd 0%, #e0f2fe 54%, #bef264 55%, #65a30d 100%);' +
          'border-radius: 18px; overflow: hidden; padding: clamp(12px, 2vh, 18px) clamp(10px, 2vw, 16px) clamp(8px, 1.5vh, 12px); box-sizing: border-box;' +
          'font-family: "Noto Sans KR", "Outfit", sans-serif; user-select: none; color: #1A237E;' +
          'box-shadow: 0 12px 32px rgba(0, 0, 0, 0.36), inset 0 2px 0 rgba(255,255,255,0.65);' +
        '}' +
        '.poke-seesaw-root::before, .seesaw-awning {' +
          'position: absolute; top: 0; left: 0; right: 0; height: 10px; z-index: 4; pointer-events: none;' +
          'background: repeating-linear-gradient(90deg, #ef4444 0px, #ef4444 24px, #ffffff 24px, #ffffff 48px, #3b82f6 48px, #3b82f6 72px, #ffffff 72px, #ffffff 96px);' +
          'border-bottom: 2.5px solid #1e293b;' +
          'box-shadow: 0 3px 8px rgba(0,0,0,0.22);' +
        '}' +
        '.seesaw-hud {' +
          'display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; flex-shrink: 0;' +
          'background: linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(241,245,249,0.94) 100%);' +
          'border: 3px solid #cbd5e1; border-radius: 16px; padding: clamp(5px, 1vh, 8px) 12px;' +
          'box-shadow: 0 4px 0 rgba(15, 23, 42, 0.14), 0 6px 12px rgba(0,0,0,0.12); z-index: 3;' +
        '}' +
        '.seesaw-hud-left { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }' +
        '.seesaw-round-badge {' +
          'background: linear-gradient(180deg, #e0f2fe 0%, #bae6fd 100%); color: #0369a1; border: 2px solid #0284c7;' +
          'border-radius: 999px; padding: 3px 12px; font-size: clamp(12px, 1.8vw, 13.5px); font-weight: 900;' +
        '}' +
        '.seesaw-level-badge {' +
          'background: linear-gradient(180deg, #f3e8ff 0%, #d8b4fe 100%); color: #6b21a8; border: 2px solid #9333ea;' +
          'border-radius: 999px; padding: 3px 11px; font-size: clamp(11px, 1.7vw, 12.5px); font-weight: 900;' +
        '}' +
        '.seesaw-score-group { display: flex; align-items: center; gap: 6px; }' +
        '.seesaw-streak-badge {' +
          'background: linear-gradient(180deg, #fef9c3 0%, #fde047 100%); color: #b45309; border: 2px solid #f59e0b; border-radius: 999px;' +
          'padding: 3px 10px; font-size: 12px; font-weight: 900;' +
        '}' +
        '.seesaw-score-pill {' +
          'background: linear-gradient(180deg, #0284c7 0%, #0369a1 100%); color: #FFFFFF; border-radius: 999px;' +
          'border: 2px solid #7dd3fc; padding: 4px 12px; font-size: clamp(13px, 2vw, 15px); font-weight: 900;' +
          'box-shadow: 0 3px 0 #0c4a6e;' +
        '}' +
        '.seesaw-question-banner {' +
          'flex-shrink: 0; background: linear-gradient(180deg, #fefce8 0%, #fef08a 100%); border: 3px solid #f59e0b;' +
          'border-radius: 16px; padding: clamp(5px, 1vh, 8px) 12px; text-align: center;' +
          'font-size: clamp(15px, 2.4vw, 19px); font-weight: 900; color: #b45309;' +
          'box-shadow: 0 4px 0 #d97706, 0 6px 14px rgba(0,0,0,0.14); z-index: 3;' +
        '}' +
        '.seesaw-stage-area {' +
          'position: relative; flex: 1; min-height: 0; display: flex; flex-direction: column;' +
          'align-items: center; justify-content: center; z-index: 2;' +
        '}' +
        '.seesaw-compare-badge {' +
          'margin-bottom: clamp(4px, 1vh, 10px); padding: 4px 16px; border-radius: 999px;' +
          'background: rgba(255, 255, 255, 0.95); border: 2.5px solid #0284c7;' +
          'color: #01579B; font-size: clamp(12px, 1.8vw, 14px); font-weight: 900;' +
          'box-shadow: 0 4px 10px rgba(0,0,0,0.14); transition: transform 0.2s, background 0.2s, border-color 0.2s;' +
        '}' +
        '.seesaw-compare-badge.is-revealed {' +
          'background: #FFF8E1; border-color: #FFA000; color: #BF360C;' +
          'transform: scale(1.05); box-shadow: 0 6px 14px rgba(255, 160, 0, 0.35);' +
        '}' +
        '.seesaw-assembly {' +
          'position: relative; width: 94%; max-width: 530px; height: clamp(118px, 22vh, 156px);' +
          'display: flex; flex-direction: column; align-items: center; justify-content: flex-end;' +
        '}' +
        '@keyframes seesawSuspenseWobble {' +
          '0%, 100% { transform: rotate(-3.5deg); }' +
          '50% { transform: rotate(3.5deg); }' +
        '}' +
        '.seesaw-plank {' +
          'position: relative; width: 100%; height: 20px;' +
          'background: linear-gradient(180deg, #fbbf24 0%, #d97706 28%, #92400e 82%, #78350f 100%);' +
          'border: 3px solid #451a03; border-radius: 14px;' +
          'transform: rotate(0deg); transform-origin: center center;' +
          'transition: transform 0.45s cubic-bezier(0.22, 1.25, 0.36, 1);' +
          'display: flex; align-items: flex-end; justify-content: space-between;' +
          'padding: 0 clamp(8px, 2vw, 18px); box-sizing: border-box; z-index: 2;' +
          'box-shadow: inset 0 3px 0 rgba(254, 243, 199, 0.72), 0 8px 16px rgba(0,0,0,0.28);' +
        '}' +
        '.seesaw-plank.is-wobbling {' +
          'animation: seesawSuspenseWobble 1.6s ease-in-out infinite;' +
        '}' +
        '.seesaw-seat {' +
          'position: relative; top: -6px; display: flex; flex-direction: column;' +
          'align-items: center; justify-content: flex-end; width: clamp(86px, 22vw, 130px); height: clamp(76px, 16vh, 104px);' +
        '}' +
        '.seesaw-seat-crowd {' +
          'position: relative; display: flex; align-items: flex-end; justify-content: center; width: 100%; height: 100%;' +
        '}' +
        '.seesaw-seat-sprite {' +
          'width: clamp(64px, 14vh, 94px); height: clamp(64px, 14vh, 94px); object-fit: contain;' +
          'filter: drop-shadow(0 6px 8px rgba(0,0,0,0.32));' +
          'transition: transform 0.35s ease; z-index: 2; pointer-events: none;' +
        '}' +
        '.seesaw-buddies-wrap {' +
          'display: flex; align-items: flex-end; margin-left: -18px; z-index: 1; pointer-events: none;' +
        '}' +
        '.seesaw-buddy-mini {' +
          'width: clamp(34px, 7.5vh, 46px); height: clamp(34px, 7.5vh, 46px); object-fit: contain;' +
          'margin-left: -12px; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.28));' +
        '}' +
        '.seesaw-count-badge {' +
          'position: absolute; top: -8px; right: 2px; z-index: 4; pointer-events: none;' +
          'background: linear-gradient(180deg, #ef4444 0%, #b91c1c 100%); color: #fff;' +
          'border: 2px solid #fff; border-radius: 999px; padding: 1px 8px; font-size: 12px; font-weight: 900;' +
          'box-shadow: 0 3px 6px rgba(0,0,0,0.32);' +
        '}' +
        '.seesaw-seat-cushion {' +
          'width: clamp(78px, 18vw, 108px); height: 12px; min-height: 12px; border-radius: 10px 10px 5px 5px;' +
          'margin-top: -5px; border: 2.5px solid #1e293b;' +
          'box-shadow: inset 0 2px 0 rgba(255,255,255,0.68), 0 3px 0 rgba(15,23,42,0.45); z-index: 1;' +
        '}' +
        '.seesaw-seat-left .seesaw-seat-cushion {' +
          'background: linear-gradient(180deg, #38bdf8 0%, #0284c7 65%, #0369a1 100%);' +
        '}' +
        '.seesaw-seat-right .seesaw-seat-cushion {' +
          'background: linear-gradient(180deg, #fb7185 0%, #e11d48 65%, #be123c 100%);' +
        '}' +
        '.seesaw-seat-sprite.is-bouncing-up {' +
          'animation: seesawLightBounce 0.55s ease-out;' +
        '}' +
        '@keyframes seesawLightBounce {' +
          '0% { transform: translateY(0) scale(1); }' +
          '35% { transform: translateY(-28px) scale(1.12) rotate(-8deg); }' +
          '70% { transform: translateY(-6px) scale(1.03) rotate(5deg); }' +
          '100% { transform: translateY(0) scale(1); }' +
        '}' +
        '.seesaw-fulcrum {' +
          'position: relative; width: 0; height: 0; border-left: 28px solid transparent;' +
          'border-right: 28px solid transparent; border-bottom: 38px solid #b45309;' +
          'margin-top: -4px; z-index: 3; filter: drop-shadow(0 6px 8px rgba(0,0,0,0.32));' +
        '}' +
        '.seesaw-fulcrum::before {' +
          'content: ""; position: absolute; top: 7px; left: -19px;' +
          'width: 0; height: 0; border-left: 19px solid transparent;' +
          'border-right: 19px solid transparent; border-bottom: 27px solid #f59e0b;' +
        '}' +
        '.seesaw-fulcrum-bolt {' +
          'position: absolute; top: -6px; left: -10px; width: 20px; height: 20px; border-radius: 50%;' +
          'background: radial-gradient(circle at 35% 35%, #fef08a 0%, #f59e0b 62%, #78350f 100%);' +
          'border: 3px solid #451a03; box-sizing: border-box;' +
          'box-shadow: 0 2px 6px rgba(0,0,0,0.4), inset 0 2px 2px rgba(255,255,255,0.8);' +
        '}' +
        '.seesaw-feedback-bar {' +
          'flex-shrink: 0; min-height: 32px; padding: 5px 12px; border-radius: 14px;' +
          'background: rgba(255,255,255,0.96); border: 2px solid #bae6fd; font-size: clamp(12.5px, 1.9vw, 14px); font-weight: 900;' +
          'color: #1B5E20; text-align: center; display: flex; align-items: center;' +
          'justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.12); z-index: 3;' +
        '}' +
        '.seesaw-cards-row {' +
          'flex-shrink: 0; display: grid; grid-template-columns: 1fr 1fr; gap: clamp(8px, 2vw, 14px); z-index: 3;' +
        '}' +
        '.seesaw-choice-card {' +
          'min-height: clamp(68px, 11vh, 88px);' +
          'background: linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%);' +
          'border: 4px solid #0284c7; border-radius: 18px;' +
          'padding: clamp(6px, 1.2vh, 10px) 10px; cursor: pointer; display: flex; flex-direction: column;' +
          'align-items: center; justify-content: center; gap: 2px;' +
          'box-shadow: 0 6px 0 #0369a1, 0 10px 18px rgba(0,0,0,0.2), inset 0 2px 0 rgba(255,255,255,0.9);' +
          'transition: transform 0.14s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s, background 0.2s, box-shadow 0.2s;' +
          'touch-action: manipulation;' +
        '}' +
        '.seesaw-choice-card[data-side="right"] {' +
          'background: linear-gradient(180deg, #ffffff 0%, #fff1f2 100%);' +
          'border-color: #e11d48; box-shadow: 0 6px 0 #9f1239, 0 10px 18px rgba(0,0,0,0.2), inset 0 2px 0 rgba(255,255,255,0.9);' +
        '}' +
        '.seesaw-choice-card:active { transform: translateY(4px); box-shadow: 0 2px 0 #0369a1; }' +
        '.seesaw-choice-card[data-side="right"]:active { transform: translateY(4px); box-shadow: 0 2px 0 #9f1239; }' +
        '.seesaw-choice-card.is-winner {' +
          'background: linear-gradient(180deg, #fefce8 0%, #fef08a 100%);' +
          'border-color: #f59e0b; transform: translateY(-3px) scale(1.03);' +
          'box-shadow: 0 6px 0 #b45309, 0 0 22px rgba(250, 204, 21, 0.88), inset 0 2px 0 #ffffff;' +
        '}' +
        '.seesaw-card-tag { font-size: 11.5px; font-weight: 900; color: #0277BD; letter-spacing: -0.2px; pointer-events: none; }' +
        '.seesaw-choice-card[data-side="right"] .seesaw-card-tag { color: #be123c; }' +
        '.seesaw-card-name { font-size: clamp(16px, 2.4vw, 20px); font-weight: 900; color: #0f172a; letter-spacing: -0.4px; pointer-events: none; }' +
        '.seesaw-card-metric {' +
          'font-size: clamp(12.5px, 1.9vw, 15px); font-weight: 900; color: #D84315; pointer-events: none;' +
          'background: #FFF3E0; border: 2px solid #ffcc80; border-radius: 999px; padding: 2px 12px; margin-top: 2px;' +
        '}' +
      '</style>' +
      '<div class="poke-seesaw-root">' +
        '<div class="seesaw-awning" aria-hidden="true"></div>' +
        '<div class="seesaw-hud">' +
          '<div class="seesaw-hud-left">' +
            '<span class="seesaw-round-badge" data-role="round-badge">문제 1 / 5</span>' +
            '<span class="seesaw-level-badge" data-role="level-badge">' + initialQ.difficultyBadge + '</span>' +
          '</div>' +
          '<div class="seesaw-score-group">' +
            '<span class="seesaw-streak-badge" data-role="streak-badge">🔥 연속 0</span>' +
            '<span class="seesaw-score-pill" data-role="score-pill">점수 0점</span>' +
          '</div>' +
        '</div>' +
        '<div class="seesaw-question-banner" data-role="question-banner">' + initialQ.questionText + '</div>' +
        '<div class="seesaw-stage-area">' +
          '<div class="seesaw-compare-badge" data-role="compare-badge">' + compareInitText + '</div>' +
          '<div class="seesaw-assembly">' +
            '<div class="seesaw-plank is-wobbling" data-role="seesaw-plank" style="transform: rotate(0deg);">' +
              '<div class="seesaw-seat seesaw-seat-left">' +
                '<span class="seesaw-count-badge" data-role="left-count-badge"' + (initialQ.leftCount > 1 ? '' : ' style="display:none;"') + '>×' + initialQ.leftCount + '마리</span>' +
                '<div class="seesaw-seat-crowd">' +
                  '<img class="seesaw-seat-sprite" data-role="left-sprite" src="' + myPoke.artworkUrl + '" alt="' + myPoke.nameKr + '" width="92" height="92" draggable="false" />' +
                  '<div class="seesaw-buddies-wrap" data-role="left-buddies">' + buildBuddySpritesHtml(myPoke, initialQ.leftCount) + '</div>' +
                '</div>' +
                '<div class="seesaw-seat-cushion"></div>' +
              '</div>' +
              '<div class="seesaw-seat seesaw-seat-right">' +
                '<span class="seesaw-count-badge" data-role="right-count-badge"' + (initialQ.rightCount > 1 ? '' : ' style="display:none;"') + '>×' + initialQ.rightCount + '마리</span>' +
                '<div class="seesaw-seat-crowd">' +
                  '<img class="seesaw-seat-sprite" data-role="right-sprite" src="' + opp.artworkUrl + '" alt="' + opp.nameKr + '" width="92" height="92" draggable="false" />' +
                  '<div class="seesaw-buddies-wrap" data-role="right-buddies">' + buildBuddySpritesHtml(opp, initialQ.rightCount) + '</div>' +
                '</div>' +
                '<div class="seesaw-seat-cushion"></div>' +
              '</div>' +
            '</div>' +
            '<div class="seesaw-fulcrum"><div class="seesaw-fulcrum-bolt"></div></div>' +
          '</div>' +
        '</div>' +
        '<div class="seesaw-feedback-bar" data-role="feedback-bar">' + initialQ.difficultyDesc + '</div>' +
        '<div class="seesaw-cards-row">' +
          '<button type="button" class="seesaw-choice-card" data-role="card-left" data-side="left">' +
            '<span class="seesaw-card-tag">👈 내 포켓몬 팀</span>' +
            '<span class="seesaw-card-name" data-role="left-name">' + initialQ.leftLabel + '</span>' +
            '<span class="seesaw-card-metric" data-role="left-metric">' + leftHintText + '</span>' +
          '</button>' +
          '<button type="button" class="seesaw-choice-card" data-role="card-right" data-side="right">' +
            '<span class="seesaw-card-tag">👉 상대 포켓몬 팀</span>' +
            '<span class="seesaw-card-name" data-role="right-name">' + initialQ.rightLabel + '</span>' +
            '<span class="seesaw-card-metric" data-role="right-metric">' + rightHintText + '</span>' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function mountSeesawGame(stageEl, charCtx, helpers) {
    if (!stageEl) {
      return function noopCleanup() {};
    }

    var safeHelpers = createSafeHelpers(helpers);
    var myPoke = normalizeMyPokemon(charCtx);
    var usedOpponentIds = [];

    var firstQuestion = pickQuestionForRound(myPoke, 1, usedOpponentIds);

    var state = {
      gameId: 'seesaw',
      round: 1,
      completedRounds: 0,
      maxRounds: TOTAL_ROUNDS,
      score: 0,
      streak: 0,
      currentQuestion: firstQuestion,
      plankTransform: 'rotate(0deg)',
      plankAngle: 0,
      lastResult: null,
      history: [],
      finished: false,
      cleanedUp: false,
      uiLocked: false
    };

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
    }

    stageEl.innerHTML = buildSeesawMarkup(myPoke, firstQuestion);

    function queryRole(role) {
      if (typeof stageEl.querySelector === 'function') {
        return stageEl.querySelector('[data-role="' + role + '"]');
      }
      return null;
    }

    var elRoundBadge = queryRole('round-badge');
    var elLevelBadge = queryRole('level-badge');
    var elStreakBadge = queryRole('streak-badge');
    var elScorePill = queryRole('score-pill');
    var elQuestionBanner = queryRole('question-banner');
    var elCompareBadge = queryRole('compare-badge');
    var elPlank = queryRole('seesaw-plank');
    var elLeftSprite = queryRole('left-sprite');
    var elRightSprite = queryRole('right-sprite');
    var elLeftCountBadge = queryRole('left-count-badge');
    var elRightCountBadge = queryRole('right-count-badge');
    var elLeftBuddies = queryRole('left-buddies');
    var elRightBuddies = queryRole('right-buddies');
    var elFeedbackBar = queryRole('feedback-bar');
    var elCardLeft = queryRole('card-left');
    var elCardRight = queryRole('card-right');
    var elLeftName = queryRole('left-name');
    var elRightName = queryRole('right-name');
    var elLeftMetric = queryRole('left-metric');
    var elRightMetric = queryRole('right-metric');

    function renderQuestionToDOM(q) {
      var isTeam = q.leftCount > 1 || q.rightCount > 1;
      if (elRoundBadge) {
        elRoundBadge.textContent = '문제 ' + q.round + ' / ' + TOTAL_ROUNDS;
      }
      if (elLevelBadge) {
        elLevelBadge.textContent = q.difficultyBadge || ('Lv.' + q.round);
      }
      if (elQuestionBanner) {
        elQuestionBanner.textContent = q.questionText;
      }
      if (elCompareBadge) {
        elCompareBadge.className = 'seesaw-compare-badge';
        elCompareBadge.textContent = q.mode === 'height'
          ? (isTeam ? '📏 합산 키 대결 VS' : '📏 키 비교 VS')
          : (isTeam ? '⚖️ 합산 무게 대결 VS' : '⚖️ 무게 비교 VS');
      }
      if (elPlank) {
        elPlank.className = 'seesaw-plank is-wobbling';
        if (elPlank.style) elPlank.style.transform = 'rotate(0deg)';
      }
      if (elLeftSprite) {
        elLeftSprite.src = q.leftPokemon.artworkUrl;
        elLeftSprite.alt = q.leftPokemon.nameKr;
        elLeftSprite.className = 'seesaw-seat-sprite';
      }
      if (elRightSprite) {
        elRightSprite.src = q.rightPokemon.artworkUrl;
        elRightSprite.alt = q.rightPokemon.nameKr;
        elRightSprite.className = 'seesaw-seat-sprite';
      }
      if (elLeftCountBadge) {
        elLeftCountBadge.textContent = '×' + q.leftCount + '마리';
        if (elLeftCountBadge.style) {
          elLeftCountBadge.style.display = q.leftCount > 1 ? '' : 'none';
        }
      }
      if (elRightCountBadge) {
        elRightCountBadge.textContent = '×' + q.rightCount + '마리';
        if (elRightCountBadge.style) {
          elRightCountBadge.style.display = q.rightCount > 1 ? '' : 'none';
        }
      }
      if (elLeftBuddies) {
        elLeftBuddies.innerHTML = buildBuddySpritesHtml(q.leftPokemon, q.leftCount);
      }
      if (elRightBuddies) {
        elRightBuddies.innerHTML = buildBuddySpritesHtml(q.rightPokemon, q.rightCount);
      }
      if (elLeftName) {
        elLeftName.textContent = q.leftLabel || q.leftPokemon.nameKr;
      }
      if (elRightName) {
        elRightName.textContent = q.rightLabel || q.rightPokemon.nameKr;
      }
      if (elLeftMetric) {
        elLeftMetric.textContent = q.leftCount > 1
          ? ('1마리 ' + formatMetric(q.leftUnitValue, q.mode) + ' × ' + q.leftCount + ' = ❓')
          : '❓ 비밀';
      }
      if (elRightMetric) {
        elRightMetric.textContent = q.rightCount > 1
          ? ('1마리 ' + formatMetric(q.rightUnitValue, q.mode) + ' × ' + q.rightCount + ' = ❓')
          : '❓ 비밀';
      }
      if (elCardLeft) {
        elCardLeft.className = 'seesaw-choice-card';
      }
      if (elCardRight) {
        elCardRight.className = 'seesaw-choice-card';
      }
      if (elFeedbackBar) {
        elFeedbackBar.textContent = q.difficultyDesc || (
          q.mode === 'height'
            ? '키가 더 큰 포켓몬 카드를 골라 보세요!'
            : '더 무거운 포켓몬 카드를 골라 보세요!'
        );
      }
    }

    function updateScoreHud() {
      if (elScorePill) {
        elScorePill.textContent = '점수 ' + state.score + '점';
      }
      if (elStreakBadge) {
        elStreakBadge.textContent = '🔥 연속 ' + state.streak;
      }
    }

    function finishGame() {
      var prevHigh = safeHelpers.getHighScore('seesaw');
      safeHelpers.saveHighScore('seesaw', state.score);
      safeHelpers.rewardCharacter();
      safeHelpers.playCry();

      var correctCount = state.history.filter(function (h) { return h.isCorrect; }).length;
      safeHelpers.showResultOverlay(stageEl, {
        gameId: 'seesaw',
        title: '⚖️ 시소 대결 완료!',
        score: state.score,
        highScore: Math.max(prevHigh, state.score),
        maxScore: TOTAL_ROUNDS * 120,
        summary: myPoke.nameKr + ' 친구와 5단계 시소 대결 중 ' + correctCount + '번 맞혔어요!'
      });
    }

    /**
     * 왼쪽('left') 또는 오른쪽('right') 포켓몬 선택 판정
     */
    function answerSide(side) {
      if (state.cleanedUp || state.finished) {
        return state.lastResult;
      }

      var chosen = (side === 'right') ? 'right' : 'left';
      var q = state.currentQuestion;
      var isCorrect = (chosen === q.correctSide);

      var basePoints = 0;
      var bonusPoints = 0;
      var winnerPoke = (q.correctSide === 'left') ? q.leftPokemon : q.rightPokemon;
      var winnerLabel = (q.correctSide === 'left') ? (q.leftLabel || q.leftPokemon.nameKr) : (q.rightLabel || q.rightPokemon.nameKr);
      var comparisonWord = (q.mode === 'height') ? '키가 더 컸구나' : '더 무거웠구나';
      var message = '';

      if (isCorrect) {
        state.streak += 1;
        basePoints = 100;
        // 연속 정답 보너스 (+20점)
        bonusPoints = state.streak >= 2 ? 20 : 0;
        if (bonusPoints > 0) {
          message = '🎉 딩동댕! 맞았어요! (+100점) 🔥 연속 정답 보너스 (+20점)';
        } else {
          message = '🎉 딩동댕! 맞았어요! (+100점)';
        }
        safeHelpers.playSfx('correct', 3);
      } else {
        state.streak = 0;
        basePoints = 30;
        bonusPoints = 0;
        message = '😮 우와~ ' + winnerLabel + ' 팀이 ' + comparisonWord + '! (+30점)';
        safeHelpers.playSfx('tap', 1);
      }

      var earnedPoints = basePoints + bonusPoints;
      state.score += earnedPoints;
      state.completedRounds += 1;

      // 시소 기울기: 왼쪽이 더 무거우면/크면 rotate(-18deg), 오른쪽이면 rotate(+18deg)
      var plankAngle = (q.correctSide === 'left') ? -18 : 18;
      var plankTransform = (q.correctSide === 'left') ? 'rotate(-18deg)' : 'rotate(+18deg)';
      state.plankAngle = plankAngle;
      state.plankTransform = plankTransform;

      var leftFormatted = formatMetric(q.leftValue, q.mode);
      var rightFormatted = formatMetric(q.rightValue, q.mode);

      var resultRecord = {
        round: q.round,
        difficultyLevel: q.difficultyLevel,
        mode: q.mode,
        selectedSide: chosen,
        correctSide: q.correctSide,
        isCorrect: isCorrect,
        basePoints: basePoints,
        bonusPoints: bonusPoints,
        points: earnedPoints,
        totalScore: state.score,
        leftCount: q.leftCount,
        rightCount: q.rightCount,
        leftValue: q.leftValue,
        rightValue: q.rightValue,
        leftFormatted: leftFormatted,
        rightFormatted: rightFormatted,
        plankAngle: plankAngle,
        plankTransform: plankTransform,
        winnerName: winnerPoke.nameKr,
        message: message
      };

      state.lastResult = resultRecord;
      state.history.push(resultRecord);

      // DOM 즉시 연출: 시소 서스펜스 흔들림 멈추고 기울기 적용, 가벼운 쪽 점프, 실제 합산 수치 공개
      updateScoreHud();
      if (elPlank) {
        elPlank.className = 'seesaw-plank';
        if (elPlank.style) elPlank.style.transform = plankTransform;
      }
      if (elCompareBadge) {
        elCompareBadge.className = 'seesaw-compare-badge is-revealed';
        elCompareBadge.textContent =
          (q.leftLabel || q.leftPokemon.nameKr) + ' ' + leftFormatted +
          (q.correctSide === 'left' ? '  >  ' : '  <  ') +
          (q.rightLabel || q.rightPokemon.nameKr) + ' ' + rightFormatted;
      }
      if (elLeftSprite && elRightSprite) {
        if (q.correctSide === 'left') {
          elRightSprite.className = 'seesaw-seat-sprite is-bouncing-up';
          elLeftSprite.className = 'seesaw-seat-sprite';
        } else {
          elLeftSprite.className = 'seesaw-seat-sprite is-bouncing-up';
          elRightSprite.className = 'seesaw-seat-sprite';
        }
      }
      if (elLeftMetric) {
        elLeftMetric.textContent = q.leftCount > 1
          ? (formatMetric(q.leftUnitValue, q.mode) + '×' + q.leftCount + ' = ' + leftFormatted)
          : leftFormatted;
      }
      if (elRightMetric) {
        elRightMetric.textContent = q.rightCount > 1
          ? (formatMetric(q.rightUnitValue, q.mode) + '×' + q.rightCount + ' = ' + rightFormatted)
          : rightFormatted;
      }
      if (elCardLeft) {
        elCardLeft.className = 'seesaw-choice-card' + (q.correctSide === 'left' ? ' is-winner' : '');
      }
      if (elCardRight) {
        elCardRight.className = 'seesaw-choice-card' + (q.correctSide === 'right' ? ' is-winner' : '');
      }
      if (elFeedbackBar) {
        elFeedbackBar.textContent = message + ' (' + leftFormatted + ' vs ' + rightFormatted + ')';
      }

      // 다음 라운드 준비 또는 5라운드 종료
      if (state.completedRounds >= TOTAL_ROUNDS) {
        state.finished = true;
        state.round = TOTAL_ROUNDS;
        state.uiLocked = true;
        finishGame();
      } else {
        state.round = state.completedRounds + 1;
        var nextQ = pickQuestionForRound(myPoke, state.round, usedOpponentIds);
        state.currentQuestion = nextQ;
        state.uiLocked = true;

        addTimer(function () {
          state.uiLocked = false;
          state.plankAngle = 0;
          state.plankTransform = 'rotate(0deg)';
          renderQuestionToDOM(state.currentQuestion);
        }, 1200);
      }

      return resultRecord;
    }

    function handleCardClick(side, e) {
      if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
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
      answerSide(side);
    }

    function onLeftClick(e) { handleCardClick('left', e); }
    function onRightClick(e) { handleCardClick('right', e); }

    if (elCardLeft && typeof elCardLeft.addEventListener === 'function') {
      elCardLeft.addEventListener('pointerdown', onLeftClick);
      elCardLeft.addEventListener('click', onLeftClick);
    }
    if (elCardRight && typeof elCardRight.addEventListener === 'function') {
      elCardRight.addEventListener('pointerdown', onRightClick);
      elCardRight.addEventListener('click', onRightClick);
    }

    function onKeyDown(e) {
      if (state.cleanedUp || state.finished || state.uiLocked || !e) return;
      if (e.code === 'ArrowLeft' || e.key === 'ArrowLeft') {
        handleCardClick('left', e);
      } else if (e.code === 'ArrowRight' || e.key === 'ArrowRight') {
        handleCardClick('right', e);
      }
    }

    if (typeof global.addEventListener === 'function') {
      global.addEventListener('keydown', onKeyDown);
    }

    // 테스트 및 외부 참조용 훅 노출
    var gameInstance = {
      answerSide: answerSide,
      getState: function () {
        var q = state.currentQuestion;
        return {
          round: state.round,
          completedRounds: state.completedRounds,
          maxRounds: state.maxRounds,
          difficultyLevel: q.difficultyLevel,
          difficultyBadge: q.difficultyBadge,
          score: state.score,
          streak: state.streak,
          mode: q.mode,
          questionText: q.questionText,
          leftPokemon: q.leftPokemon,
          rightPokemon: q.rightPokemon,
          opponent: q.rightPokemon,
          leftCount: q.leftCount,
          rightCount: q.rightCount,
          leftUnitValue: q.leftUnitValue,
          rightUnitValue: q.rightUnitValue,
          leftLabel: q.leftLabel,
          rightLabel: q.rightLabel,
          leftValue: q.leftValue,
          rightValue: q.rightValue,
          correctSide: q.correctSide,
          plankAngle: state.plankAngle,
          plankTransform: state.plankTransform,
          lastResult: state.lastResult,
          history: state.history.slice(),
          finished: state.finished
        };
      }
    };

    stageEl._seesawGame = gameInstance;

    return function cleanup() {
      if (state.cleanedUp) return;
      state.cleanedUp = true;
      clearAllTimers();
      if (typeof global.removeEventListener === 'function') {
        global.removeEventListener('keydown', onKeyDown);
      }
      if (elCardLeft && typeof elCardLeft.removeEventListener === 'function') {
        elCardLeft.removeEventListener('pointerdown', onLeftClick);
        elCardLeft.removeEventListener('click', onLeftClick);
      }
      if (elCardRight && typeof elCardRight.removeEventListener === 'function') {
        elCardRight.removeEventListener('pointerdown', onRightClick);
        elCardRight.removeEventListener('click', onRightClick);
      }
      if (stageEl._seesawGame === gameInstance) {
        stageEl._seesawGame = null;
      }
    };
  }

  var gameDef = {
    id: 'seesaw',
    title: '누가누가 더 클까? 시소 대결',
    subtitle: '더 무겁거나 키가 큰 포켓몬을 찾아봐요!',
    icon: '⚖️',
    badgeColor: '#29B6F6',
    OPPONENT_POOL: OPPONENT_POOL,
    formatMetric: formatMetric,
    mount: mountSeesawGame
  };

  global.PokeGameSeesaw = gameDef;
  if (global.PokeMiniGames && typeof global.PokeMiniGames.register === 'function') {
    global.PokeMiniGames.register(gameDef.id, gameDef);
  }
})(typeof window !== 'undefined' ? window : globalThis);
