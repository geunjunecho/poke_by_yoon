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

  function getQuestionBannerText(mode) {
    return mode === 'height'
      ? '📏 누가누가 키가 더 클까?'
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
   * 내 포켓몬과 몸무게/키가 똑같은 포켓몬 및 이미 등장한 포켓몬을 제외하고 상대 선택
   */
  function pickQuestionForRound(myPoke, roundNum, usedIds) {
    var mode = (roundNum % 2 === 1) ? 'weight' : 'height';

    function filterCandidates(targetMode, ignoreUsed) {
      return OPPONENT_POOL.filter(function (cand) {
        if (cand.id === myPoke.id) return false;
        // 몸무게나 키가 똑같은 포켓몬은 자동 제외 (특히 현재 비교 기준이 같으면 절대 제외)
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
      // 극단적인 경우 현재 모드 값만이라도 다른 상대 필터링
      candidates = OPPONENT_POOL.filter(function (cand) {
        return cand[mode] !== myPoke[mode];
      });
    }

    var pickIdx = Math.floor(Math.random() * candidates.length);
    var opponent = candidates[pickIdx] || OPPONENT_POOL[0];
    usedIds.push(opponent.id);

    var leftVal = myPoke[mode];
    var rightVal = opponent[mode];
    var correctSide = leftVal > rightVal ? 'left' : 'right';

    return {
      round: roundNum,
      mode: mode,
      questionText: getQuestionBannerText(mode),
      leftPokemon: myPoke,
      rightPokemon: opponent,
      leftValue: leftVal,
      rightValue: rightVal,
      correctSide: correctSide
    };
  }

  function buildSeesawMarkup(myPoke, initialQ) {
    var opp = initialQ.rightPokemon;
    return (
      '<style>' +
        '.poke-seesaw-root {' +
          'position: relative; width: 100%; height: 100%; min-height: 360px;' +
          'display: flex; flex-direction: column; justify-content: space-between;' +
          'background: linear-gradient(180deg, #E1F5FE 0%, #B3E5FC 55%, #AED581 56%, #7CB342 100%);' +
          'border-radius: 16px; overflow: hidden; padding: 12px; box-sizing: border-box;' +
          'font-family: "Noto Sans KR", "Outfit", sans-serif; user-select: none; color: #1A237E;' +
        '}' +
        '.seesaw-hud {' +
          'display: flex; align-items: center; justify-content: space-between; gap: 8px;' +
          'background: rgba(255,255,255,0.92); border-radius: 14px; padding: 7px 12px;' +
          'box-shadow: 0 4px 10px rgba(0,0,0,0.1); z-index: 3;' +
        '}' +
        '.seesaw-round-badge {' +
          'background: #E1F5FE; color: #0277BD; border: 2px solid #29B6F6;' +
          'border-radius: 999px; padding: 4px 12px; font-size: 13px; font-weight: 900;' +
        '}' +
        '.seesaw-score-group { display: flex; align-items: center; gap: 8px; }' +
        '.seesaw-streak-badge {' +
          'background: #FFF8E1; color: #F57F17; border-radius: 999px;' +
          'padding: 4px 10px; font-size: 12px; font-weight: 900;' +
        '}' +
        '.seesaw-score-pill {' +
          'background: #0277BD; color: #FFFFFF; border-radius: 999px;' +
          'padding: 5px 12px; font-size: 14px; font-weight: 900;' +
        '}' +
        '.seesaw-question-banner {' +
          'margin-top: 6px; background: #FFFDE7; border: 3px solid #FFCA28;' +
          'border-radius: 16px; padding: 8px 14px; text-align: center;' +
          'font-size: 20px; font-weight: 900; color: #E65100;' +
          'box-shadow: 0 4px 12px rgba(0,0,0,0.12); z-index: 3;' +
        '}' +
        '.seesaw-stage-area {' +
          'position: relative; flex: 1; display: flex; flex-direction: column;' +
          'align-items: center; justify-content: center; min-height: 150px; z-index: 2;' +
        '}' +
        '.seesaw-assembly {' +
          'position: relative; width: 92%; max-width: 420px; height: 120px;' +
          'display: flex; flex-direction: column; align-items: center; justify-content: flex-end;' +
        '}' +
        '.seesaw-plank {' +
          'position: relative; width: 100%; height: 16px;' +
          'background: linear-gradient(90deg, #8D6E63 0%, #A1887F 50%, #8D6E63 100%);' +
          'border: 3px solid #4E342E; border-radius: 10px;' +
          'transform: rotate(0deg); transform-origin: center center;' +
          'transition: transform 0.45s cubic-bezier(0.22, 1.25, 0.36, 1);' +
          'display: flex; align-items: flex-end; justify-content: space-between;' +
          'padding: 0 14px; box-sizing: border-box; z-index: 2;' +
        '}' +
        '.seesaw-seat {' +
          'position: relative; top: -12px; display: flex; flex-direction: column;' +
          'align-items: center; width: 96px;' +
        '}' +
        '.seesaw-seat-sprite {' +
          'width: 74px; height: 74px; object-fit: contain;' +
          'filter: drop-shadow(0 5px 6px rgba(0,0,0,0.25));' +
          'transition: transform 0.35s ease;' +
        '}' +
        '.seesaw-seat-sprite.is-bouncing-up {' +
          'animation: seesawLightBounce 0.55s ease-out;' +
        '}' +
        '@keyframes seesawLightBounce {' +
          '0% { transform: translateY(0) scale(1); }' +
          '35% { transform: translateY(-32px) scale(1.12) rotate(-8deg); }' +
          '70% { transform: translateY(-8px) scale(1.03) rotate(5deg); }' +
          '100% { transform: translateY(0) scale(1); }' +
        '}' +
        '.seesaw-fulcrum {' +
          'width: 0; height: 0; border-left: 24px solid transparent;' +
          'border-right: 24px solid transparent; border-bottom: 34px solid #5D4037;' +
          'margin-top: -3px; z-index: 1;' +
        '}' +
        '.seesaw-feedback-bar {' +
          'min-height: 34px; margin: 4px 0; padding: 4px 12px; border-radius: 12px;' +
          'background: rgba(255,255,255,0.94); font-size: 14px; font-weight: 900;' +
          'color: #1B5E20; text-align: center; display: flex; align-items: center;' +
          'justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); z-index: 3;' +
        '}' +
        '.seesaw-cards-row {' +
          'display: grid; grid-template-columns: 1fr 1fr; gap: 10px; z-index: 3;' +
        '}' +
        '.seesaw-choice-card {' +
          'background: #FFFFFF; border: 3px solid #29B6F6; border-radius: 16px;' +
          'padding: 8px 10px; cursor: pointer; display: flex; flex-direction: column;' +
          'align-items: center; justify-content: center; gap: 2px;' +
          'box-shadow: 0 5px 0 #0288D1, 0 8px 14px rgba(0,0,0,0.15);' +
          'transition: transform 0.1s ease, border-color 0.2s, background 0.2s;' +
        '}' +
        '.seesaw-choice-card:active { transform: translateY(3px); box-shadow: 0 2px 0 #0288D1; }' +
        '.seesaw-choice-card.is-winner { background: #E8F5E9; border-color: #43A047; }' +
        '.seesaw-card-tag { font-size: 11px; font-weight: 800; color: #0277BD; }' +
        '.seesaw-card-name { font-size: 17px; font-weight: 900; color: #263238; }' +
        '.seesaw-card-metric {' +
          'font-size: 16px; font-weight: 900; color: #D84315;' +
          'background: #FFF3E0; border-radius: 999px; padding: 2px 10px; margin-top: 2px;' +
        '}' +
      '</style>' +
      '<div class="poke-seesaw-root">' +
        '<div class="seesaw-hud">' +
          '<span class="seesaw-round-badge" data-role="round-badge">문제 1 / 5</span>' +
          '<div class="seesaw-score-group">' +
            '<span class="seesaw-streak-badge" data-role="streak-badge">🔥 연속 0</span>' +
            '<span class="seesaw-score-pill" data-role="score-pill">점수 0점</span>' +
          '</div>' +
        '</div>' +
        '<div class="seesaw-question-banner" data-role="question-banner">' + initialQ.questionText + '</div>' +
        '<div class="seesaw-stage-area">' +
          '<div class="seesaw-assembly">' +
            '<div class="seesaw-plank" data-role="seesaw-plank" style="transform: rotate(0deg);">' +
              '<div class="seesaw-seat seesaw-seat-left">' +
                '<img class="seesaw-seat-sprite" data-role="left-sprite" src="' + myPoke.artworkUrl + '" alt="' + myPoke.nameKr + '" />' +
              '</div>' +
              '<div class="seesaw-seat seesaw-seat-right">' +
                '<img class="seesaw-seat-sprite" data-role="right-sprite" src="' + opp.artworkUrl + '" alt="' + opp.nameKr + '" />' +
              '</div>' +
            '</div>' +
            '<div class="seesaw-fulcrum"></div>' +
          '</div>' +
        '</div>' +
        '<div class="seesaw-feedback-bar" data-role="feedback-bar">왼쪽 카드나 오른쪽 카드를 터치해 보세요!</div>' +
        '<div class="seesaw-cards-row">' +
          '<button type="button" class="seesaw-choice-card" data-role="card-left" data-side="left">' +
            '<span class="seesaw-card-tag">👈 내 포켓몬</span>' +
            '<span class="seesaw-card-name" data-role="left-name">' + myPoke.nameKr + '</span>' +
            '<span class="seesaw-card-metric" data-role="left-metric">❓ 비밀</span>' +
          '</button>' +
          '<button type="button" class="seesaw-choice-card" data-role="card-right" data-side="right">' +
            '<span class="seesaw-card-tag">👉 상대 포켓몬</span>' +
            '<span class="seesaw-card-name" data-role="right-name">' + opp.nameKr + '</span>' +
            '<span class="seesaw-card-metric" data-role="right-metric">❓ 비밀</span>' +
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
    var elStreakBadge = queryRole('streak-badge');
    var elScorePill = queryRole('score-pill');
    var elQuestionBanner = queryRole('question-banner');
    var elPlank = queryRole('seesaw-plank');
    var elLeftSprite = queryRole('left-sprite');
    var elRightSprite = queryRole('right-sprite');
    var elFeedbackBar = queryRole('feedback-bar');
    var elCardLeft = queryRole('card-left');
    var elCardRight = queryRole('card-right');
    var elLeftName = queryRole('left-name');
    var elRightName = queryRole('right-name');
    var elLeftMetric = queryRole('left-metric');
    var elRightMetric = queryRole('right-metric');

    function renderQuestionToDOM(q) {
      if (elRoundBadge) {
        elRoundBadge.textContent = '문제 ' + q.round + ' / ' + TOTAL_ROUNDS;
      }
      if (elQuestionBanner) {
        elQuestionBanner.textContent = q.questionText;
      }
      if (elPlank && elPlank.style) {
        elPlank.style.transform = 'rotate(0deg)';
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
      if (elLeftName) {
        elLeftName.textContent = q.leftPokemon.nameKr;
      }
      if (elRightName) {
        elRightName.textContent = q.rightPokemon.nameKr;
      }
      if (elLeftMetric) {
        elLeftMetric.textContent = '❓ 비밀';
      }
      if (elRightMetric) {
        elRightMetric.textContent = '❓ 비밀';
      }
      if (elCardLeft) {
        elCardLeft.className = 'seesaw-choice-card';
      }
      if (elCardRight) {
        elCardRight.className = 'seesaw-choice-card';
      }
      if (elFeedbackBar) {
        elFeedbackBar.textContent =
          q.mode === 'height'
            ? '키가 더 큰 포켓몬 카드를 골라 보세요!'
            : '더 무거운 포켓몬 카드를 골라 보세요!';
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
        summary: myPoke.nameKr + ' 친구와 5번의 시소 대결 중 ' + correctCount + '번 맞혔어요!'
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
        message = '😮 우와~ ' + winnerPoke.nameKr + ' 친구가 ' + comparisonWord + '! (+30점)';
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
        mode: q.mode,
        selectedSide: chosen,
        correctSide: q.correctSide,
        isCorrect: isCorrect,
        basePoints: basePoints,
        bonusPoints: bonusPoints,
        points: earnedPoints,
        totalScore: state.score,
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

      // DOM 즉시 연출: 시소 기울기, 가벼운 쪽 점프, 실제 수치 공개
      updateScoreHud();
      if (elPlank && elPlank.style) {
        elPlank.style.transform = plankTransform;
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
        elLeftMetric.textContent = leftFormatted;
      }
      if (elRightMetric) {
        elRightMetric.textContent = rightFormatted;
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
      if (state.cleanedUp || state.finished || state.uiLocked) {
        return;
      }
      answerSide(side);
    }

    function onLeftClick(e) { handleCardClick('left', e); }
    function onRightClick(e) { handleCardClick('right', e); }

    if (elCardLeft && typeof elCardLeft.addEventListener === 'function') {
      elCardLeft.addEventListener('click', onLeftClick);
    }
    if (elCardRight && typeof elCardRight.addEventListener === 'function') {
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
          score: state.score,
          streak: state.streak,
          mode: q.mode,
          questionText: q.questionText,
          leftPokemon: q.leftPokemon,
          rightPokemon: q.rightPokemon,
          opponent: q.rightPokemon,
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
        elCardLeft.removeEventListener('click', onLeftClick);
      }
      if (elCardRight && typeof elCardRight.removeEventListener === 'function') {
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
