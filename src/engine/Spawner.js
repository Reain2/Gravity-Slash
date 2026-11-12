/**
 * Gelombang orb (PRD bagian 5.4).
 *
 * Menyimpan status antar gelombang yang tidak boleh ada di engine:
 * indeks gelombang dan cooldown orb nyawa.
 */

import { CONFIG } from '../config/gameConfig.js';
import { generateChoices, generateQuestion, shuffle } from './questions.js';
import { createOrb, initialVelocityForLevel, ORB_KINDS } from './Orb.js';

export function createSpawner({ config = CONFIG } = {}) {
  let waveIndex = 0;
  let lastHealWave = Number.NEGATIVE_INFINITY;

  /**
   * Sebar posisi X dengan jarak minimum antar orb.
   * Kalau jumlah orb terlalu banyak untuk layar, jarak dipadatkan otomatis
   * supaya orb tetap tidak bertumpuk.
   */
  function layoutX(count, rng) {
    const diameter = config.physics.orbRadius * 2;
    const min = 0.12 + config.physics.orbRadius;
    const max = 0.88 - config.physics.orbRadius;
    const span = max - min;
    const wanted = config.spawn.minSeparation * diameter;
    const gap = Math.min(wanted, span / Math.max(1, count - 1));

    const positions = [];
    let guard = 0;
    while (positions.length < count && guard < 500) {
      guard += 1;
      const candidate = min + rng() * span;
      if (positions.every((existing) => Math.abs(existing - candidate) >= gap)) {
        positions.push(candidate);
      }
    }

    if (positions.length < count) {
      // Cadangan: sebar merata, pasti muat.
      positions.length = 0;
      for (let i = 0; i < count; i += 1) {
        positions.push(count === 1 ? (min + max) / 2 : min + (span * i) / (count - 1));
      }
    }

    return shuffle(positions, rng);
  }

  return {
    get waveIndex() {
      return waveIndex;
    },

    reset() {
      waveIndex = 0;
      lastHealWave = Number.NEGATIVE_INFINITY;
    },

    /** Bangun satu soal + satu gelombang orb. */
    nextWave({ level = 1, lives = config.lives.start, rng = Math.random } = {}) {
      waveIndex += 1;

      const question = generateQuestion(level, rng);
      const [minOrbs, maxOrbs] = config.spawn.orbsPerWave;
      const answerCount = minOrbs + Math.floor(rng() * (maxOrbs - minOrbs + 1));
      const choices = generateChoices(question, answerCount, rng);

      const slots = choices.map((value) => ({
        kind: ORB_KINDS.ANSWER,
        value,
        isCorrect: value === question.answer,
      }));

      if (rng() < config.spawn.bombChance) {
        const bombs = 1 + Math.floor(rng() * config.spawn.maxBombsPerWave);
        for (let i = 0; i < bombs; i += 1) slots.push({ kind: ORB_KINDS.BOMB });
      }

      const healReady =
        lives < config.lives.max &&
        waveIndex - lastHealWave >= config.spawn.healCooldownWaves &&
        rng() < config.spawn.healChance;
      if (healReady) {
        slots.push({ kind: ORB_KINDS.HEAL });
        lastHealWave = waveIndex;
      }

      const ordered = shuffle(slots, rng);
      const positions = layoutX(ordered.length, rng);
      const speed = initialVelocityForLevel(level);

      const orbs = ordered.map((slot, index) =>
        createOrb({
          kind: slot.kind,
          value: slot.value ?? null,
          isCorrect: Boolean(slot.isCorrect),
          x: positions[index],
          // Sedikit acak di sumbu Y: orb masuk satu per satu, bukan seperti barisan.
          y: config.physics.startY - rng() * 0.12,
          vy: speed * (0.95 + rng() * 0.1),
          radius: config.physics.orbRadius,
          rotation: rng() * Math.PI * 2,
          spinSpeed: (rng() * 2 - 1) * config.physics.spinMax,
        })
      );

      return { question, choices, orbs };
    },
  };
}
