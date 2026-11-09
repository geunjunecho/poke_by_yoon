import assert from 'node:assert/strict';
import '../js/minigames-core.js';

const PokeMiniGames = globalThis.PokeMiniGames;
assert.ok(PokeMiniGames, 'PokeMiniGames 글로벌 객체가 정의되어야 합니다.');

// 1. register로 게임 등록 및 조회 동작 확인
let mounted = false;
PokeMiniGames.register('runner', {
  title: '테스트 달리기',
  subtitle: '달리기 설명',
  icon: '🏃',
  mount() {
    mounted = true;
    return () => {
      mounted = false;
    };
  }
});

const registeredGame = PokeMiniGames.games.get('runner');
assert.ok(registeredGame, '등록한 게임이 games Map에서 조회되어야 합니다.');
assert.equal(registeredGame.title, '테스트 달리기');
assert.equal(typeof registeredGame.mount, 'function');

// 2. computeRunTransform 동작 검증 (기본 달리기, 점프, 숙이기, flipX 음수 스케일)
const runPose = PokeMiniGames.computeRunTransform({ flipX: true }, 5);
assert.ok(runPose.transform.includes('translateY('), '기본 달리기 transform에 translateY가 포함되어야 합니다.');
assert.ok(runPose.transform.includes('scale(-'), 'flipX: true일 때 음수 X 스케일이 포함되어야 합니다.');

const jumpPose = PokeMiniGames.computeRunTransform({ isJumping: true, yOffset: -45, flipX: true }, 10);
assert.ok(jumpPose.transform.includes('translateY(-45px)'), '점프 상태일 때 yOffset이 반영되어야 합니다.');
assert.ok(jumpPose.scaleY > 1.0, '점프 상태일 때 수직 스트레치(scaleY > 1)가 적용되어야 합니다.');

const duckPose = PokeMiniGames.computeRunTransform({ isDucking: true, flipX: true }, 10);
assert.ok(duckPose.scaleY < 0.7, `숙이기 상태일 때 scaleY(${duckPose.scaleY})는 0.7 미만이어야 합니다.`);
assert.ok(duckPose.transform.includes('scale(-1.32, 0.56)'), '숙이기 상태의 납작한 스케일 변환이 포함되어야 합니다.');

// 3. helpers.saveHighScore 및 helpers.getHighScore 최고 점수 갱신 로직 확인
const testGameId = 'test_runner_spec';
assert.equal(PokeMiniGames.helpers.getHighScore(testGameId), 0, '초기 최고 점수는 0이어야 합니다.');

const firstSave = PokeMiniGames.helpers.saveHighScore(testGameId, 120);
assert.equal(firstSave, true, '기존 점수보다 높으면 true를 반환해야 합니다.');
assert.equal(PokeMiniGames.helpers.getHighScore(testGameId), 120, '최고 점수가 120으로 갱신되어야 합니다.');

const lowerSave = PokeMiniGames.helpers.saveHighScore(testGameId, 80);
assert.equal(lowerSave, false, '기존 최고 점수 이하이면 false를 반환해야 합니다.');
assert.equal(PokeMiniGames.helpers.getHighScore(testGameId), 120, '기존 최고 점수(120)가 유지되어야 합니다.');

const higherSave = PokeMiniGames.helpers.saveHighScore(testGameId, 250);
assert.equal(higherSave, true, '더 높은 점수(250) 저장 시 true를 반환해야 합니다.');
assert.equal(PokeMiniGames.helpers.getHighScore(testGameId), 250, '최고 점수가 250으로 갱신되어야 합니다.');

// 4. buildCharContext 기본 폴백(#025 피카츄) 확인
const ctx = PokeMiniGames.buildCharContext();
assert.equal(ctx.id, 25);
assert.equal(ctx.nameKr, '피카츄');
assert.equal(ctx.primaryType, 'electric');
assert.equal(ctx.typeEmoji, '⚡');
assert.equal(ctx.isAnimatedGif, true);

console.log('✅ test-core.mjs: 모든 코어 허브 단위 테스트 통과!');
