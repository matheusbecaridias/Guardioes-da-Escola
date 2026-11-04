import Phaser from "phaser";
import MainMenuScene from "./scenes/MainMenuScene.js";
import ProfileScene from "./scenes/ProfileScene.js";
import CharacterSelectScene from "./scenes/CharacterSelectScene.js";
import StageSelectScene from "./scenes/StageSelectScene.js";
import Stage1Scene from "./scenes/Stage1Scene.js";
import Stage2Scene from "./scenes/Stage2Scene.js";
import Stage3Scene from "./scenes/Stage3Scene.js";
import StageResultScene from "./scenes/StageResultScene.js";
import EndingScene from "./scenes/EndingScene.js";
import InstructionsScene from "./scenes/InstructionsScene.js";
import SettingsScene from "./scenes/SettingsScene.js";
import CreditsScene from "./scenes/CreditsScene.js";
import { SoundService } from "./services/SoundService.js";

const config = {
  type: Phaser.CANVAS,
  width: 1280,
  height: 720,
  parent: "game-container",
  backgroundColor: "#08111f",
  dom: {
    createContainer: true,
  },
  input: {
    touch: true,
    activePointers: 1,
  },
  scale: {
    // Usamos RESIZE ou FIT gerenciado pelo container CSS
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [
    MainMenuScene,
    ProfileScene,
    CharacterSelectScene,
    StageSelectScene,
    Stage1Scene,
    Stage2Scene,
    Stage3Scene,
    StageResultScene,
    EndingScene,
    InstructionsScene,
    SettingsScene,
    CreditsScene,
  ],
};

const fontesPixelify = await document.fonts.load('700 16px "Pixelify Sans"');
const fontePixelifyCarregada = fontesPixelify.some(
  (fonte) =>
    fonte.family.replaceAll('"', "") === "Pixelify Sans" &&
    fonte.status === "loaded",
);

if (!fontePixelifyCarregada) {
  throw new Error("Não foi possível carregar a fonte Pixelify Sans Bold.");
}

const game = new Phaser.Game(config);
SoundService.inicializar(game);

const emRetrato = () => window.innerHeight > window.innerWidth;

// Correção dos cliques/toques com a tela rotacionada
const transformOriginal = game.input.transformPointer.bind(game.input);
game.input.transformPointer = function (pointer, pageX, pageY, wasMove) {
  if (emRetrato()) {
    const canvas = game.canvas;
    const rect = canvas.getBoundingClientRect();

    // Converte a coordenada rotacionada 90 graus
    const clientX = pageX;
    const clientY = pageY;

    const rotatedX = clientY - rect.top;
    const rotatedY = rect.right - clientX;

    const scaleX = 1280 / rect.height;
    const scaleY = 720 / rect.width;

    pointer.x = rotatedX * scaleX;
    pointer.y = rotatedY * scaleY;

    return;
  }
  return transformOriginal(pointer, pageX, pageY, wasMove);
};

// Força redimensionamento quando muda de orientação ou barra do navegador retrai
const ajustarTamanho = () => {
  const container = document.getElementById("game-container");
  if (!container || !game.scale) return;

  if (emRetrato()) {
    game.scale.resize(1280, 720);
  }
  game.scale.refresh();
};

window.addEventListener("resize", () => setTimeout(ajustarTamanho, 200));
window.addEventListener("orientationchange", () =>
  setTimeout(ajustarTamanho, 250),
);

export { config, game };
