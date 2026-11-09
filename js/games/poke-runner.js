/**
 * 포켓몬 도감 미니게임 P1: 달려라! 포켓몬 점프런 (poke-runner.js)
 * - 6~7세 눈높이 맞춤 클래식 무한 러너 (하트 3개 + 더블 점프 + 0.65초 자동 숙이기 유지)
 * - 주인공 포켓몬은 움직이는 GIF(runnerSpriteUrl)가 멈추지 않도록 DOM 오버레이(.poke-runner-hero)로 렌더링
 */
(function (global) {
  'use strict';

  var GROUND_OBSTACLES = [
    { emoji: '🌲', label: '꼬지모 나무', width: 44, height: 52 },
    { emoji: '🪨', label: '뾰족 바위', width: 42, height: 42 },
    { emoji: '🌵', label: '선인장', width: 40, height: 50 }
  ];

  var AIR_OBSTACLES = [
    { emoji: '🦇', label: '주뱃', width: 44, height: 38 },
    { emoji: '🌩️', label: '찌릿 번개구름', width: 48, height: 40 },
    { emoji: '🌀', label: '바람개비', width: 42, height: 42 }
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
        var y = (state && state.yOffset) || 0;
        var scaleX = state && state.flipX ? -1 : 1;
        var scaleY = 1;
        var rot = 0;
        if (state && state.isDucking) {
          scaleX *= 1.22;
          scaleY = 0.62;
          y += 14;
        } else if (state && state.isJumping) {
          scaleY = 1.08;
          rot = state.flipX ? 8 : -8;
        } else {
          var bob = Math.abs(Math.sin((tick || 0) * 0.28)) * 6;
          y -= bob;
          rot = Math.sin((tick || 0) * 0.28) * 5;
        }
        var transform =
          'translate3d(0px, ' +
          y.toFixed(1) +
          'px, 0) scale(' +
          scaleX.toFixed(2) +
          ', ' +
          scaleY.toFixed(2) +
          ') rotate(' +
          rot.toFixed(1) +
          'deg)';
        var filter =
          state && state.isHit
            ? 'drop-shadow(0 0 10px #ff5252) brightness(1.5)'
            : 'drop-shadow(0 6px 8px rgba(0,0,0,0.28))';
        return { transform: transform, filter: filter, opacity: state && state.isHit && tick % 6 < 3 ? '0.45' : '1' };
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
      '  position: relative; width: 100%; height: 100%; min-height: 360px;',
      '  display: flex; flex-direction: column; justify-content: space-between;',
      '  background: linear-gradient(180deg, #80d8ff 0%, #e1f5fe 62%, #a5d6a7 62%, #66bb6a 100%);',
      '  border-radius: 18px; overflow: hidden; user-select: none; -webkit-user-select: none;',
      '  font-family: "Noto Sans KR", "Outfit", sans-serif;',
      '}',
      '.poke-runner-hud {',
      '  position: relative; z-index: 5; display: flex; align-items: center; justify-content: space-between;',
      '  padding: 10px 14px; background: rgba(255,255,255,0.86); backdrop-filter: blur(6px);',
      '  border-bottom: 3px solid rgba(0,0,0,0.08); font-weight: 900; gap: 8px; flex-wrap: wrap;',
      '}',
      '.poke-runner-hearts { font-size: 1.35rem; letter-spacing: 3px; }',
      '.poke-runner-score-box {',
      '  display: flex; align-items: center; gap: 10px; font-size: 1.05rem; color: #1b3a4b;',
      '}',
      '.poke-runner-score-pill {',
      '  background: #fff3e0; border: 2px solid #ffb74d; border-radius: 999px; padding: 3px 12px; color: #e65100;',
      '}',
      '.poke-runner-best-pill {',
      '  background: #ede7f6; border: 2px solid #b39ddb; border-radius: 999px; padding: 3px 10px; color: #4527a0; font-size: 0.9rem;',
      '}',
      '.poke-runner-stage-area {',
      '  position: relative; flex: 1; width: 100%; min-height: 220px; overflow: hidden;',
      '}',
      '.poke-runner-canvas {',
      '  position: absolute; inset: 0; width: 100%; height: 100%; display: block;',
      '}',
      '.poke-runner-hero {',
      '  position: absolute; left: 56px; bottom: 50px; width: 76px; height: 76px;',
      '  z-index: 3; pointer-events: none; display: flex; align-items: center; justify-content: center;',
      '}',
      '.poke-runner-hero-img {',
      '  width: 72px; height: 72px; object-fit: contain; image-rendering: auto;',
      '  transform-origin: center bottom; will-change: transform, filter;',
      '}',
      '.poke-runner-bubble {',
      '  position: absolute; bottom: 82px; left: 50%; transform: translateX(-35%);',
      '  white-space: nowrap; background: #fff8e1; color: #d84315; font-weight: 900; font-size: 0.85rem;',
      '  padding: 5px 11px; border-radius: 999px; border: 2px solid #ff7043;',
      '  box-shadow: 0 4px 10px rgba(0,0,0,0.16); opacity: 0; transition: opacity 0.15s ease;',
      '}',
      '.poke-runner-bubble.visible { opacity: 1; }',
      '.poke-runner-controls {',
      '  position: relative; z-index: 5; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;',
      '  padding: 10px 14px 14px; background: rgba(255,255,255,0.92); border-top: 3px solid rgba(0,0,0,0.08);',
      '}',
      '.poke-runner-btn {',
      '  appearance: none; border: none; border-radius: 16px; padding: 15px 10px;',
      '  font-size: 1.15rem; font-weight: 900; color: #fff; cursor: pointer;',
      '  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;',
      '  box-shadow: 0 6px 0 rgba(0,0,0,0.22); transition: transform 0.08s ease;',
      '  touch-action: manipulation;',
      '}',
      '.poke-runner-btn:active, .poke-runner-btn.active { transform: translateY(4px); box-shadow: 0 2px 0 rgba(0,0,0,0.22); }',
      '.poke-runner-btn-jump { background: linear-gradient(180deg, #ff7043 0%, #f4511e 100%); }',
      '.poke-runner-btn-duck { background: linear-gradient(180deg, #29b6f6 0%, #0288d1 100%); }',
      '.poke-runner-btn-sub { font-size: 0.76rem; font-weight: 700; opacity: 0.92; }'
    ].join('\n');
    document.head.appendChild(style);
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

    var W = 560;
    var H = 260;
    var GROUND_Y = 206;
    var PLAYER_X = 76;
    var GRAVITY = 0.68;
    var JUMP_VELOCITY_1 = -11.8;
    var JUMP_VELOCITY_2 = -10.4;
    var AUTO_DUCK_FRAMES = 40; // 약 0.65초 유지

    var lives = 3;
    var maxLives = 3;
    var score = 0;
    var highScore = helpers.getHighScore('runner');
    var speed = 4.2;
    var tick = 0;
    var running = true;
    var isGameOver = false;
    var rewarded = false;
    var rafId = null;

    var player = {
      x: PLAYER_X,
      y: 0, // 바닥 기준 오프셋 (음수 = 공중)
      vy: 0,
      width: 54,
      height: 58,
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
      { x: 70, y: 38, size: 28, speed: 0.5 },
      { x: 250, y: 55, size: 22, speed: 0.35 },
      { x: 430, y: 32, size: 32, speed: 0.6 }
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
    canvas.width = W;
    canvas.height = H;

    var heroEl = document.createElement('div');
    heroEl.className = 'poke-runner-hero';

    var heroImg = document.createElement('img');
    heroImg.className = 'poke-runner-hero-img';
    heroImg.src = heroSprite;
    heroImg.alt = ctxData.nameKr || '포켓몬';

    var bubbleEl = document.createElement('div');
    bubbleEl.className = 'poke-runner-bubble';

    heroEl.appendChild(bubbleEl);
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
      if (typeof tf === 'string') {
        heroImg.style.transform = tf;
        heroImg.style.filter =
          player.invincibleTimer > 0
            ? 'drop-shadow(0 0 10px #ff5252) brightness(1.5)'
            : 'drop-shadow(0 6px 8px rgba(0,0,0,0.25))';
      } else if (tf && typeof tf === 'object') {
        if (tf.transform !== undefined) heroImg.style.transform = tf.transform;
        if (tf.filter !== undefined) heroImg.style.filter = tf.filter;
        if (tf.opacity !== undefined) heroImg.style.opacity = tf.opacity;
      }
    }

    function spawnFootstepDust(count) {
      var n = count || 1;
      for (var i = 0; i < n; i++) {
        particles.push({
          x: player.x - 12 + (Math.random() * 14 - 7),
          y: GROUND_Y - 4 + (Math.random() * 6 - 3),
          vx: -speed * (0.45 + Math.random() * 0.4),
          vy: -(0.6 + Math.random() * 1.6),
          size: 5 + Math.random() * 5,
          life: 18 + Math.floor(Math.random() * 10),
          maxLife: 28,
          color: ctxData.typeColor || '#FFD54F'
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
        // 공중에서 숙이기를 누르면 빠르게 착지하여 슬라이딩 자세로 전환
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
      // 살짝 탭해도 0.65초(40프레임) 동안 자동으로 숙이기 유지
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
        emoji: tpl.emoji,
        label: tpl.label,
        hintText: category === 'ground' ? '⬆️점프!' : '⬇️숙이기!',
        x: W + 40,
        y: category === 'ground' ? GROUND_Y - tpl.height : GROUND_Y - 82,
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
          ? ctxData.typeEmoji || '⚡'
          : BERRY_EMOJIS[Math.floor(Math.random() * BERRY_EMOJIS.length)];
      var pts = kind === 'star' ? 50 : kind === 'orb' ? 30 : 15;
      var high = Math.random() < 0.45;
      items.push({
        kind: kind,
        emoji: emoji,
        points: pts,
        x: W + 30,
        y: high ? GROUND_Y - 96 : GROUND_Y - 46,
        radius: 18,
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

    function triggerObstacleHit(obs) {
      if (player.invincibleTimer > 0 || isGameOver) return;
      lives = Math.max(0, lives - 1);
      player.invincibleTimer = 90; // 90프레임(약 1.5초) 무적 깜빡임
      helpers.playSfx('hit');
      showBubble('앗! 조심조심~!', 90);
      popups.push({
        x: player.x,
        y: GROUND_Y + player.y - 54,
        text: '앗! 조심조심~!',
        color: '#d32f2f',
        life: 45
      });
      updateHud();
      syncHeroTransform();
      if (lives <= 0) {
        handleGameOver();
      }
    }

    function checkCollisions() {
      // 플레이어 판정 박스 (6~7세 친화적으로 관대한 히트박스 적용)
      var pLeft = player.x - 16;
      var pRight = player.x + 16;
      var pHeight = player.isDucking ? 26 : 48;
      var pBottom = GROUND_Y + player.y;
      var pTop = pBottom - pHeight;

      // 아이템 수집 판정
      for (var i = items.length - 1; i >= 0; i--) {
        var it = items[i];
        var ix = it.x;
        var iy = it.y;
        var catchTop = pTop - 16;
        var catchBottom = pBottom + 10;
        if (
          ix + it.radius >= pLeft - 12 &&
          ix - it.radius <= pRight + 12 &&
          iy + it.radius >= catchTop &&
          iy - it.radius <= catchBottom
        ) {
          score += it.points;
          if (it.kind === 'star') {
            lives = Math.min(maxLives, lives + 1);
            helpers.playSfx('powerup');
            showBubble('무지개별! 하트 회복 ❤️+1', 50);
          } else if (it.kind === 'orb') {
            helpers.playSfx('coin', 2);
            showBubble(ctxData.typeEmoji + ' 에너지 +30점!', 40);
          } else {
            helpers.playSfx('coin', 1);
          }
          if (score >= 100 && !rewarded) {
            rewarded = true;
            helpers.rewardCharacter();
          }
          popups.push({
            x: it.x,
            y: it.y - 10,
            text: '+' + it.points + '점!',
            color: it.kind === 'star' ? '#ff6f00' : '#2e7d32',
            life: 32
          });
          items.splice(i, 1);
          updateHud();
        }
      }

      // 장애물 충돌 판정
      if (player.invincibleTimer > 0) return;

      for (var j = 0; j < obstacles.length; j++) {
        var obs = obstacles[j];
        var oLeft = obs.x + 8;
        var oRight = obs.x + obs.width - 8;
        if (pRight < oLeft || pLeft > oRight) continue;

        if (obs.category === 'ground') {
          // 바닥 장애물: 점프해서 발 위치가 충분히 높으면 통과
          if (player.y < -26) continue;
          triggerObstacleHit(obs);
          break;
        } else if (obs.category === 'air') {
          // 공중 장애물: 납작 숙이기 상태이면 안전하게 아래로 통과
          if (player.isDucking && player.y > -15) continue;
          triggerObstacleHit(obs);
          break;
        }
      }
    }

    function renderCanvas() {
      if (!gCtx) return;
      gCtx.clearRect(0, 0, W, H);

      // 하늘 배경
      var skyGrad = gCtx.createLinearGradient(0, 0, 0, GROUND_Y);
      skyGrad.addColorStop(0, '#81d4fa');
      skyGrad.addColorStop(1, '#e1f5fe');
      gCtx.fillStyle = skyGrad;
      gCtx.fillRect(0, 0, W, GROUND_Y);

      // 구름
      gCtx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      for (var c = 0; c < clouds.length; c++) {
        var cl = clouds[c];
        gCtx.beginPath();
        gCtx.arc(cl.x, cl.y, cl.size * 0.6, 0, Math.PI * 2);
        gCtx.arc(cl.x + cl.size * 0.5, cl.y - 4, cl.size * 0.5, 0, Math.PI * 2);
        gCtx.arc(cl.x - cl.size * 0.5, cl.y + 2, cl.size * 0.45, 0, Math.PI * 2);
        gCtx.fill();
      }

      // 초원 언덕과 트랙 바닥
      gCtx.fillStyle = '#81c784';
      gCtx.fillRect(0, GROUND_Y - 8, W, 12);
      gCtx.fillStyle = '#558b2f';
      gCtx.fillRect(0, GROUND_Y, W, 6);
      gCtx.fillStyle = '#d7ccc8';
      gCtx.fillRect(0, GROUND_Y + 6, W, H - GROUND_Y - 6);

      // 발밑 내 속성 먼지/불꽃 파티클
      for (var p = 0; p < particles.length; p++) {
        var pt = particles[p];
        gCtx.save();
        gCtx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        gCtx.fillStyle = pt.color;
        gCtx.beginPath();
        gCtx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        gCtx.fill();
        gCtx.restore();
      }

      // 아이템 그리기
      gCtx.textAlign = 'center';
      gCtx.textBaseline = 'middle';
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var bobY = it.y + Math.sin((tick + i * 12) * 0.12) * 4;
        if (it.kind === 'orb' || it.kind === 'star') {
          gCtx.save();
          gCtx.fillStyle =
            it.kind === 'star'
              ? 'rgba(255, 215, 64, 0.36)'
              : 'rgba(255, 255, 255, 0.45)';
          gCtx.beginPath();
          gCtx.arc(it.x, bobY, 22, 0, Math.PI * 2);
          gCtx.fill();
          gCtx.restore();
        }
        gCtx.font = '28px sans-serif';
        gCtx.fillText(it.emoji, it.x, bobY);
      }

      // 장애물 및 6~7세용 힌트 배지(⬆️점프! / ⬇️숙이기!) 그리기
      for (var j = 0; j < obstacles.length; j++) {
        var obs = obstacles[j];
        var centerX = obs.x + obs.width * 0.5;
        var centerY = obs.y + obs.height * 0.5;

        // 힌트 배지
        var badgeY = obs.y - 16;
        gCtx.save();
        gCtx.fillStyle = obs.category === 'ground' ? '#ff7043' : '#0288d1';
        gCtx.beginPath();
        if (typeof gCtx.roundRect === 'function') {
          gCtx.roundRect(centerX - 34, badgeY - 11, 68, 20, 10);
        } else {
          gCtx.rect(centerX - 34, badgeY - 11, 68, 20);
        }
        gCtx.fill();
        gCtx.fillStyle = '#ffffff';
        gCtx.font = 'bold 11px "Noto Sans KR", sans-serif';
        gCtx.fillText(obs.hintText, centerX, badgeY);
        gCtx.restore();

        // 장애물 본체 이모지
        gCtx.font = '38px sans-serif';
        gCtx.fillText(obs.emoji, centerX, centerY);
      }

      // 점수 팝업
      for (var k = 0; k < popups.length; k++) {
        var pop = popups[k];
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

      // 완만한 속도 증가 (6~7세 배려: 최대 속도 제한)
      speed = Math.min(6.4, 4.2 + Math.floor(tick / 360) * 0.22);

      // 시간 경과 점수 증가
      if (tick % 15 === 0) {
        score += 1;
        if (score >= 100 && !rewarded) {
          rewarded = true;
          helpers.rewardCharacter();
        }
        updateHud();
      }

      // 무적 타이머 감소
      if (player.invincibleTimer > 0) {
        player.invincibleTimer -= 1;
      }

      // 말풍선 타이머 감소
      if (bubbleTimer > 0) {
        bubbleTimer -= 1;
        if (bubbleTimer === 0) {
          bubbleEl.classList.remove('visible');
        }
      }

      // 자동 숙이기 유지 타이머 처리
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

      // 점프 물리 업데이트
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
        // 달리는 동안 발밑 속성 파티클 생성
        spawnFootstepDust(1);
      }

      // 구름 이동
      for (var c = 0; c < clouds.length; c++) {
        clouds[c].x -= clouds[c].speed;
        if (clouds[c].x < -50) clouds[c].x = W + 50;
      }

      // 파티클 업데이트
      for (var p = particles.length - 1; p >= 0; p--) {
        var pt = particles[p];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life -= 1;
        if (pt.life <= 0) particles.splice(p, 1);
      }

      // 팝업 업데이트
      for (var k = popups.length - 1; k >= 0; k--) {
        popups[k].y -= 0.8;
        popups[k].life -= 1;
        if (popups[k].life <= 0) popups.splice(k, 1);
      }

      // 스폰 관리
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

      // 장애물 이동
      for (var j = obstacles.length - 1; j >= 0; j--) {
        obstacles[j].x -= speed;
        if (obstacles[j].x + obstacles[j].width < -40) {
          obstacles.splice(j, 1);
        }
      }

      // 아이템 이동
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
      speed = 4.2;
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

    // 이벤트 리스너 바인딩
    function onJumpInput(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      jump();
    }

    function onDuckStart(e) {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
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

    jumpBtn.addEventListener('pointerdown', onJumpInput);
    jumpBtn.addEventListener('click', onJumpInput);
    duckBtn.addEventListener('pointerdown', onDuckStart);
    duckBtn.addEventListener('pointerup', onDuckEnd);
    duckBtn.addEventListener('click', onDuckStart);

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
    }

    // 테스트 및 외부 제어 훅 노출
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
      jumpBtn.removeEventListener('pointerdown', onJumpInput);
      jumpBtn.removeEventListener('click', onJumpInput);
      duckBtn.removeEventListener('pointerdown', onDuckStart);
      duckBtn.removeEventListener('pointerup', onDuckEnd);
      duckBtn.removeEventListener('click', onDuckStart);
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
