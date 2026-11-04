/**
 * SoundService.js
 * Gerenciador centralizado de áudio (BGM e SFX) para Guardiões da Escola.
 * Suporta arquivos de áudio do Phaser e sintetizador Web Audio como fallback instantâneo.
 */

const STORAGE_KEY = "guardioes_audio_config";

class SoundServiceImpl {
  constructor() {
    this.game = null;
    this.currentBgm = null;
    this.currentBgmKey = null;

    // Configurações padrão
    this.config = {
      muted: false,
      masterVolume: 5.0,
      bgmVolume: 0.1,
      sfxVolume: 5.0,
    };

    this.carregarPreferencias();
  }

  inicializar(game) {
    this.game = game;
    this.aplicarVolumes();
  }

  carregarPreferencias() {
    try {
      const salvo = localStorage.getItem(STORAGE_KEY);
      if (salvo) {
        this.config = { ...this.config, ...JSON.parse(salvo) };
      }
    } catch {
      // Ignora erro de localStorage caso bloqueado
    }
  }

  salvarPreferencias() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      // Ignora erro
    }
  }

  aplicarVolumes() {
    if (!this.game?.sound) return;
    this.game.sound.mute = this.config.muted;
    this.game.sound.volume = this.config.masterVolume;
    if (this.currentBgm) {
      this.currentBgm.setVolume(
        this.config.bgmVolume * this.config.masterVolume,
      );
    }
  }

  alternarMute() {
    this.config.muted = !this.config.muted;
    this.salvarPreferencias();
    this.aplicarVolumes();
    return this.config.muted;
  }

  estaMutado() {
    return this.config.muted;
  }

  // ==========================================
  // EFEITOS SONOROS (SFX)
  // ==========================================
  tocarSFX(key, cena, configExtra = {}) {
    if (this.config.muted) return;

    // Obtém o SoundManager global do Phaser ou da cena
    const soundManager = this.game?.sound || cena?.sound;

    // 1. Tenta reproduzir pelo Phaser se o arquivo foi carregado
    if (soundManager && cena?.cache?.audio?.exists(key)) {
      soundManager.play(key, {
        volume: (configExtra.volume ?? 1) * this.config.sfxVolume * this.config.masterVolume,
        rate: configExtra.rate ?? 1,
      });
      return;
    }

    // 2. Fallback procedural sintético se o arquivo de áudio ainda não estiver no disco
    this.tocarSintetico(key);
  }

  tocarClique(cena) {
    this.tocarSFX("sfx-click", cena);
  }

  tocarEscolhaPositiva(cena) {
    this.tocarSFX("sfx-positive", cena);
  }

  tocarEscolhaNegativa(cena) {
    this.tocarSFX("sfx-negative", cena);
  }

  tocarConclusao(cena) {
    this.tocarSFX("sfx-complete", cena);
  }

  tocarInteracaoPrompt(cena) {
    this.tocarSFX("sfx-prompt", cena);
  }

  // ==========================================
  // MÚSICA DE FUNDO (BGM)
  // ==========================================
  // Em src/services/SoundService.js

  tocarBGM(key, cena, { loop = true, fade = 1000 } = {}) {
    if (!cena?.sound) return;

    // Se já estiver tocando essa mesma trilha, não faz nada
    if (this.currentBgmKey === key && this.currentBgm?.isPlaying) return;

    // Se o contexto do navegador estiver suspenso e o jogador ainda não interagiu,
    // apenas agenda para tocar assim que o Phaser destravar o som:
    if (cena.sound.locked) {
      this.currentBgmKey = key;
      cena.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
        this.tocarBGM(key, cena, { loop, fade });
      });
      return;
    }

    // Para a música anterior se houver
    if (this.currentBgm) {
      const musicaAntiga = this.currentBgm;
      if (fade > 0 && cena.tweens) {
        cena.tweens.add({
          targets: musicaAntiga,
          volume: 0,
          duration: fade,
          onComplete: () => musicaAntiga.stop(),
        });
      } else {
        musicaAntiga.stop();
      }
    }

    this.currentBgmKey = key;

    if (!cena.cache.audio.exists(key)) {
      this.currentBgm = null;
      return;
    }

    const volumeAlvo = this.config.bgmVolume * this.config.masterVolume;
    this.currentBgm = cena.sound.add(key, {
      loop,
      volume: fade > 0 ? 0 : volumeAlvo,
    });

    this.currentBgm.play();

    if (fade > 0 && cena.tweens) {
      cena.tweens.add({
        targets: this.currentBgm,
        volume: volumeAlvo,
        duration: fade,
      });
    }
  }

  tocarSintetico(tipo) {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    // Só cria o contexto se o usuário já tiver interagido com a tela
    if (!this.synthContext) {
      this.synthContext = new AudioCtx();
    }

    // Se estiver suspenso e tentarmos sem clique, silencia o erro
    if (this.synthContext.state === "suspended") {
      this.synthContext.resume().catch(() => {});
      if (this.synthContext.state === "suspended") {
        return; // Aguarda o primeiro clique real
      }
    }

    const ctx = this.synthContext;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const vol = this.config.sfxVolume * this.config.masterVolume * 0.18;

    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (tipo) {
      case "sfx-click":
        osc.type = "sine";
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.05);
        gain.gain.setValueAtTime(vol * 0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;

      case "sfx-prompt":
        osc.type = "triangle";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(660, now + 0.06);
        gain.gain.setValueAtTime(vol * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
        break;

      case "sfx-positive": {
        const notas = [523.25, 659.25, 783.99, 1046.5];
        notas.forEach((freq, i) => {
          const notaOsc = ctx.createOscillator();
          const notaGain = ctx.createGain();
          notaOsc.type = "sine";
          notaOsc.frequency.setValueAtTime(freq, now + i * 0.07);
          notaGain.gain.setValueAtTime(vol, now + i * 0.07);
          notaGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.15);
          notaOsc.connect(notaGain);
          notaGain.connect(ctx.destination);
          notaOsc.start(now + i * 0.07);
          notaOsc.stop(now + i * 0.07 + 0.16);
        });
        break;
      }

      case "sfx-negative":
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.linearRampToValueAtTime(140, now + 0.22);
        gain.gain.setValueAtTime(vol * 0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
        break;

      case "sfx-complete": {
        const acordes = [523.25, 659.25, 783.99, 1046.5];
        acordes.forEach((freq, idx) => {
          const fOsc = ctx.createOscillator();
          const fGain = ctx.createGain();
          fOsc.type = "triangle";
          fOsc.frequency.setValueAtTime(freq, now + idx * 0.1);
          fGain.gain.setValueAtTime(vol * 0.9, now + idx * 0.1);
          fGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
          fOsc.connect(fGain);
          fGain.connect(ctx.destination);
          fOsc.start(now + idx * 0.1);
          fOsc.stop(now + idx * 0.1 + 0.42);
        });
        break;
      }

      default:
        break;
    }
  }
}

export const SoundService = new SoundServiceImpl();
export default SoundService;
