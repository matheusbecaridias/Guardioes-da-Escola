import Phaser from "phaser";
import {
  carregarPerfil,
  criarNovoPerfil,
  vincularPersonagemPerfil,
} from "../data/ProfileRepository.js";
import {
  CHARACTER_SELECT_PORTRAITS,
  PLAYABLE_CHARACTERS,
  PLAYABLE_CHARACTER_IDS,
} from "../data/charactersData.js";
import { CharacterService } from "../services/CharacterService.js";
import { criarBotaoGiz, preloadChalkAssets } from "../ui/ChalkButton.js";
import {
  iniciarSchoolBackdrop,
  preloadSchoolBackdrop,
} from "../ui/SchoolBackdrop.js";
import { pixelTextStyle } from "../ui/TextStyles.js";
import { SoundService } from "../services/SoundService.js";

const BOARD_KEY = "character-select-board";
const BOARD_PATH = "assets/images/QuadroInteracoes.png";
const BOARD_SOURCE_SIZE = Object.freeze({ width: 1672, height: 941 });
const BOARD_GREEN_BOUNDS = Object.freeze({
  left: 54,
  right: 1618,
  top: 115,
  bottom: 825,
});
const BOARD_SAFE_INSET = Object.freeze({ horizontal: 18, vertical: 16 });
const WIDTH_COMPACT_LAYOUT = 900;
const BUTTON_WIDTH = 184;
const BUTTON_HEIGHT_RATIO = 627 / 2508;
const CARD_PHOTO_TOP_INSET = 8;
const CARD_PHOTO_NAME_GAP = 0;
const CARD_PHOTO_BOTTOM_INSET = 10;

function limitar(valor, minimo, maximo) {
  return Phaser.Math.Clamp(valor, minimo, maximo);
}

function criarMascaraRetangular(scene, largura, altura) {
  const origem = scene.make.graphics({ x: 0, y: 0, add: false });
  origem.fillStyle(0xffffff, 1);
  origem.fillRect(-largura / 2, -altura / 2, largura, altura);

  return {
    origem,
    geometria: origem.createGeometryMask(),
  };
}

function atualizarMascara(mascara, largura, altura, x, y) {
  mascara.origem.clear();
  mascara.origem.fillStyle(0xffffff, 1);
  mascara.origem.fillRect(-largura / 2, -altura / 2, largura, altura);
  mascara.origem.setPosition(x, y);
}

function ajustarPortraitContain(imagem, larguraMaxima, alturaMaxima) {
  const origem = imagem.texture.getSourceImage();
  const escala = Math.min(
    larguraMaxima / origem.width,
    alturaMaxima / origem.height,
  );
  imagem.setScale(escala);
  return {
    width: origem.width * escala,
    height: origem.height * escala,
  };
}

function desenharMolduraRetrato(
  graphics,
  {
    width,
    height,
    selected = false,
    hovered = false,
    photoArea,
    nameArea,
    markerArea = null,
  },
) {
  const x = -width / 2;
  const y = -height / 2;
  const madeira = selected ? 0xe2b247 : hovered ? 0xb97840 : 0x89532d;
  const brilho = selected ? 0xffe394 : hovered ? 0xe1a15c : 0xb97840;
  const sombra = selected ? 0x674019 : 0x4a2b19;
  const espessura = Math.min(8, Math.max(6, width * 0.05));

  graphics.clear();
  graphics
    .fillStyle(0x04110e, 0.65)
    .fillRect(x - 4, y - 4, width + 8, height + 8);
  graphics.fillStyle(0x28180e).fillRect(x, y, width, height);
  graphics.fillStyle(madeira).fillRect(x + 3, y + 3, width - 6, height - 6);
  graphics
    .fillStyle(sombra)
    .fillRect(
      x + espessura,
      y + espessura,
      width - espessura * 2,
      height - espessura * 2,
    );
  graphics
    .fillStyle(0x0c1e1a)
    .fillRect(
      x + espessura + 3,
      y + espessura + 3,
      width - (espessura + 3) * 2,
      height - (espessura + 3) * 2,
    );

  graphics.fillStyle(brilho).fillRect(x + 4, y + 4, width - 8, 3);
  graphics.fillRect(x + 4, y + 4, 3, height - 8);
  graphics.fillStyle(0x352114).fillRect(x + 4, y + height - 7, width - 8, 3);
  graphics.fillRect(x + width - 7, y + 4, 3, height - 8);

  graphics
    .fillStyle(0x050d12)
    .fillRect(
      photoArea.x - 3,
      photoArea.y - 3,
      photoArea.width + 6,
      photoArea.height + 6,
    );
  graphics
    .fillStyle(0x15211f)
    .fillRect(photoArea.x, photoArea.y, photoArea.width, photoArea.height);
  graphics
    .fillStyle(brilho)
    .fillRect(photoArea.x - 3, photoArea.y - 3, photoArea.width + 6, 2);

  graphics
    .fillStyle(selected ? 0x4a3816 : 0x302014)
    .fillRect(nameArea.x, nameArea.y, nameArea.width, nameArea.height);
  graphics
    .fillStyle(brilho)
    .fillRect(nameArea.x, nameArea.y, nameArea.width, 2);
  graphics
    .fillStyle(0x21150e)
    .fillRect(nameArea.x, nameArea.y + nameArea.height - 2, nameArea.width, 2);

  if (selected && markerArea) {
    graphics
      .fillStyle(0x21160f, 0.96)
      .fillRect(
        markerArea.x,
        markerArea.y,
        markerArea.width,
        markerArea.height,
      );
    graphics
      .fillStyle(0xffe394)
      .fillRect(markerArea.x, markerArea.y, markerArea.width, 2);
    graphics.fillRect(markerArea.x, markerArea.y, 2, markerArea.height);
  }
}

/** A reusable, fully framed portrait and name card. */
function criarCartaoPersonagem(scene, personagemId, index) {
  const graphics = scene.add.graphics();
  const portrait = scene.add
    .image(0, 0, CHARACTER_SELECT_PORTRAITS[personagemId].key)
    .setOrigin(0.5);
  const nomeText = scene.add
    .text(
      0,
      0,
      PLAYABLE_CHARACTERS[personagemId].nome.toUpperCase(),
      pixelTextStyle({
        fontSize: "11px",
        align: "center",
      }),
    )
    .setOrigin(0.5);
  const marcador = scene.add
    .text(
      0,
      0,
      "1P",
      pixelTextStyle(
        {
          fontSize: "8px",
          align: "center",
          color: "#ffe394",
        },
        { preservarCor: true },
      ),
    )
    .setOrigin(0.5)
    .setVisible(false);
  const card = scene.add.container(0, 0, [
    graphics,
    portrait,
    nomeText,
    marcador,
  ]);

  card.personagemId = personagemId;
  card.indiceGrade = index;
  card.frameGraphics = graphics;
  card.portrait = portrait;
  card.nomeText = nomeText;
  card.marcador = marcador;
  card.mascaraRetrato = criarMascaraRetangular(scene, 1, 1);
  card.portrait.setMask(card.mascaraRetrato.geometria);
  card.setDepth(4);
  card.setSize(158, 148);
  card.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, 158, 148),
    Phaser.Geom.Rectangle.Contains,
  );
  card.input.cursor = "pointer";

  card.on("pointerover", () => scene.aoPassarMouse(card));
  card.on("pointerout", () => scene.aoSairMouse(card));
  card.on("pointerdown", () => scene.selecionarPersonagem(personagemId));
  return card;
}

/** Arcade-style selection kept inside the measured green area of the school board. */
export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super("CharacterSelectScene");
    this.cards = [];
    this.personagemSelecionadoId = null;
    this.perfil = null;
    this.nome = "";
    this.bloqueado = false;
  }

  init(data = {}) {
    const perfilRecebido = data.perfil || null;
    this.perfil = perfilRecebido?.id
      ? carregarPerfil(perfilRecebido.id) || perfilRecebido
      : null;
    this.nome = String(data.nome || this.perfil?.nome || "").trim();
    this.modo = this.perfil ? "perfil" : "novo";
    this.personagemSelecionadoId = this.perfil?.personagemId || null;
    this.bloqueado = CharacterService.isPlayableCharacterId(
      this.personagemSelecionadoId,
    );
    this.mensagemInicial = data.aviso || "";
  }

  preload() {
    preloadSchoolBackdrop(this);
    preloadChalkAssets(this, { colors: ["blue", "pink"] });
    if (!this.textures.exists(BOARD_KEY))
      this.load.image(BOARD_KEY, BOARD_PATH);

    PLAYABLE_CHARACTER_IDS.forEach((id) => {
      const { key, path } = CHARACTER_SELECT_PORTRAITS[id];
      if (!this.textures.exists(key)) this.load.image(key, path);
    });
  }

  create() {
    const { width, height } = this.cameras.main;
    iniciarSchoolBackdrop(this);

    const boardTexture = this.textures.get(BOARD_KEY).getSourceImage();
    const boardScale = Math.min(
      (width - 36) / boardTexture.width,
      (height - 24) / boardTexture.height,
    );
    const boardWidth = boardTexture.width * boardScale;
    const boardHeight = boardTexture.height * boardScale;
    const boardX = width / 2 - boardWidth / 2;
    const boardY = height / 2 - boardHeight / 2;
    this.board = this.add
      .image(width / 2, height / 2, BOARD_KEY)
      .setDisplaySize(boardWidth, boardHeight)
      .setDepth(-2);

    this.safeArea = this.calcularAreaSegura({
      boardX,
      boardY,
      boardWidth,
      boardHeight,
    });
    PLAYABLE_CHARACTER_IDS.forEach((id) => {
      this.textures
        .get(CHARACTER_SELECT_PORTRAITS[id].key)
        .setFilter(Phaser.Textures.FilterMode.NEAREST);
    });

    this.titleText = this.add
      .text(
        0,
        0,
        "ESCOLHA SEU PERSONAGEM",
        pixelTextStyle({
          fontSize: "36px",
          align: "center",
        }),
      )
      .setOrigin(0.5)
      .setDepth(6);

    this.profileText = this.add
      .text(
        0,
        0,
        this.nome ? `JOGADOR 1  •  ${this.nome}` : "JOGADOR 1",
        pixelTextStyle({
          fontSize: "20px",
          align: "center",
          wordWrap: {
            width: this.safeArea.width * 0.76,
            useAdvancedWrap: true,
          },
        }),
      )
      .setOrigin(0.5)
      .setDepth(6);

    this.previewFrame = this.add.graphics();
    this.previewPortrait = this.add
      .image(0, 0, CHARACTER_SELECT_PORTRAITS[PLAYABLE_CHARACTER_IDS[0]].key)
      .setOrigin(0.5)
      .setVisible(false);
    this.previewPlaceholder = this.add
      .text(
        0,
        0,
        "ESCOLHA UM\nRETRATO",
        pixelTextStyle({
          fontSize: "20px",
          align: "center",
          lineSpacing: 2,
        }),
      )
      .setOrigin(0.5);
    this.previewName = this.add
      .text(
        0,
        0,
        "SEM SELEÇÃO",
        pixelTextStyle({
          fontSize: "20px",
          align: "center",
          wordWrap: { width: 260, useAdvancedWrap: true },
        }),
      )
      .setOrigin(0.5);
    this.previewContainer = this.add
      .container(0, 0, [
        this.previewFrame,
        this.previewPortrait,
        this.previewPlaceholder,
        this.previewName,
      ])
      .setDepth(3);
    this.previewMascaraRetrato = criarMascaraRetangular(this, 1, 1);
    this.previewPortrait.setMask(this.previewMascaraRetrato.geometria);

    this.cards = PLAYABLE_CHARACTER_IDS.map((id, index) =>
      criarCartaoPersonagem(this, id, index),
    );

    this.statusText = this.add
      .text(
        0,
        0,
        "Escolha um retrato na grade.",
        pixelTextStyle({
          fontSize: "20px",
          align: "center",
          wordWrap: {
            width: this.safeArea.width * 0.58,
            useAdvancedWrap: true,
          },
        }),
      )
      .setOrigin(0.5)
      .setDepth(7);

    // Em CharacterSelectScene.js, no create():

    this.confirmButton = criarBotaoGiz(this, {
      x: 0,
      y: 0,
      label: "CONFIRMAR",
      color: "blue",
      width: BUTTON_WIDTH,
      fontSize: "20px",
      onClick: () => this.confirmar(),
    }).setDepth(8);

    this.backButton = criarBotaoGiz(this, {
      x: 0,
      y: 0,
      label: "VOLTAR",
      color: "pink",
      width: BUTTON_WIDTH,
      fontSize: "20px",
      onClick: () => this.voltar(),
    }).setDepth(8);

    this.scale.on(Phaser.Scale.Events.RESIZE, this.aplicarLayout, this);
    this.input.keyboard?.on("keydown", this.aoPressionarTecla, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.limparEventos, this);
    this.aplicarLayout();

    if (this.mensagemInicial) this.mostrarMensagem(this.mensagemInicial);
    else if (this.bloqueado)
      this.mostrarMensagem("Personagem vinculado a este perfil.");
  }

  calcularAreaSegura(board) {
    const leftGreen =
      board.boardX +
      board.boardWidth * (BOARD_GREEN_BOUNDS.left / BOARD_SOURCE_SIZE.width);
    const rightGreen =
      board.boardX +
      board.boardWidth * (BOARD_GREEN_BOUNDS.right / BOARD_SOURCE_SIZE.width);
    const topGreen =
      board.boardY +
      board.boardHeight * (BOARD_GREEN_BOUNDS.top / BOARD_SOURCE_SIZE.height);
    const bottomGreen =
      board.boardY +
      board.boardHeight *
        (BOARD_GREEN_BOUNDS.bottom / BOARD_SOURCE_SIZE.height);

    return {
      left: leftGreen + BOARD_SAFE_INSET.horizontal,
      right: rightGreen - BOARD_SAFE_INSET.horizontal,
      top: topGreen + BOARD_SAFE_INSET.vertical,
      bottom: bottomGreen - BOARD_SAFE_INSET.vertical,
      width: rightGreen - leftGreen - BOARD_SAFE_INSET.horizontal * 2,
      height: bottomGreen - topGreen - BOARD_SAFE_INSET.vertical * 2,
      green: {
        left: leftGreen,
        right: rightGreen,
        top: topGreen,
        bottom: bottomGreen,
      },
    };
  }

  calcularLayout() {
    const larguraExibida =
      this.scale.displaySize?.width || this.game.config.width;
    const compacto = larguraExibida < WIDTH_COMPACT_LAYOUT;
    const fatorCompacto = compacto
      ? limitar(larguraExibida / WIDTH_COMPACT_LAYOUT, 0.88, 0.96)
      : 1;
    const safe = this.safeArea;
    const buttonWidth = Math.min(
      BUTTON_WIDTH * fatorCompacto,
      safe.width * 0.2,
    );
    const buttonHeight = buttonWidth * BUTTON_HEIGHT_RATIO;
    const buttonY = safe.bottom - 14 * fatorCompacto - buttonHeight / 2;
    const statusHeight = 18 * fatorCompacto;
    const statusButtonGap = 10 * fatorCompacto;
    const gridStatusGap = 9 * fatorCompacto;
    const statusY =
      buttonY - buttonHeight / 2 - statusButtonGap - statusHeight / 2;
    const gridBottom = statusY - statusHeight / 2 - gridStatusGap;
    const gridTopMin = safe.top + 89 * fatorCompacto;
    const rowGap = 14 * fatorCompacto;
    const mainHeight = Math.max(0, gridBottom - gridTopMin);
    const cardHeight = Math.min((mainHeight - rowGap) / 2, 148 * fatorCompacto);
    const gridHeight = cardHeight * 2 + rowGap;
    const gridTop = gridTopMin + Math.max(0, (mainHeight - gridHeight) / 2);
    const columnGap = 24 * fatorCompacto;
    const cardNameHeight = cardHeight * 0.2;
    const cardPhotoSide = Math.max(
      0,
      cardHeight -
        (CARD_PHOTO_TOP_INSET + CARD_PHOTO_NAME_GAP + CARD_PHOTO_BOTTOM_INSET) *
          fatorCompacto -
        cardNameHeight,
    );
    const cardWidth = cardPhotoSide + 18 * fatorCompacto;
    const previewNameHeight = 34 * fatorCompacto;
    const previewHeight = gridHeight;
    const previewWidth = 266 * fatorCompacto;
    const previewPhotoSide = Math.max(
      0,
      Math.min(
        previewWidth - 18 * fatorCompacto,
        previewHeight - 24 * fatorCompacto - previewNameHeight,
      ),
    );

    return {
      compact: compacto,
      scale: fatorCompacto,
      titleX: (safe.left + safe.right) / 2,
      titleY: safe.top + 31 * fatorCompacto,
      profileY: safe.top + 70 * fatorCompacto,
      contentTop: gridTop,
      gridTop,
      gridBottom: gridTop + gridHeight,
      gridWidth: cardWidth * 3 + columnGap * 2,
      gridCenterX: safe.left + safe.width * 0.7,
      gridCenterY: gridTop + gridHeight / 2,
      cardWidth,
      cardHeight,
      columnGap,
      rowGap,
      cardPhotoSide,
      cardNameHeight,
      previewX: safe.left + safe.width * 0.22,
      previewY: gridTop + gridHeight / 2,
      previewWidth,
      previewHeight,
      previewPhotoSide,
      previewNameHeight,
      statusX: safe.left + safe.width * 0.7,
      statusY,
      statusWidth: Math.min(safe.width * 0.58, this.game.config.width * 0.55),
      buttonY,
      buttonWidth,
      buttonOffset: buttonWidth / 2 + 24 * fatorCompacto,
    };
  }

  aplicarLayout() {
    const layout = this.calcularLayout();
    this.layoutAtual = layout;
    this.layoutMode = layout.compact ? "compacto" : "regular";

    this.titleText.setPosition(layout.titleX, layout.titleY);
    this.profileText.setPosition(layout.titleX, layout.profileY);

    this.previewContainer.setPosition(layout.previewX, layout.previewY);
    const previewPhoto = {
      x: -layout.previewPhotoSide / 2,
      y: -layout.previewHeight / 2 + 14 * layout.scale,
      width: layout.previewPhotoSide,
      height: layout.previewPhotoSide,
    };
    const previewNameArea = {
      x: -layout.previewPhotoSide / 2,
      y:
        layout.previewHeight / 2 - 10 * layout.scale - layout.previewNameHeight,
      width: layout.previewPhotoSide,
      height: layout.previewNameHeight,
    };
    const previewPhotoY = previewPhoto.y + previewPhoto.height / 2;
    desenharMolduraRetrato(this.previewFrame, {
      width: layout.previewWidth,
      height: layout.previewHeight,
      selected: Boolean(this.personagemSelecionadoId),
      photoArea: previewPhoto,
      nameArea: previewNameArea,
    });
    this.previewPortrait
      .setPosition(0, previewPhotoY)
      .setVisible(Boolean(this.personagemSelecionadoId));
    ajustarPortraitContain(
      this.previewPortrait,
      previewPhoto.width,
      previewPhoto.height,
    );
    this.previewPlaceholder.setPosition(0, previewPhotoY);
    this.previewName
      .setPosition(0, previewNameArea.y + previewNameArea.height / 2)
      .setWordWrapWidth(previewNameArea.width - 12 * layout.scale, true);
    atualizarMascara(
      this.previewMascaraRetrato,
      previewPhoto.width,
      previewPhoto.height,
      layout.previewX,
      layout.previewY + previewPhotoY,
    );
    this.previewGeometry = { photo: previewPhoto, name: previewNameArea };

    const centersX = [
      layout.gridCenterX - layout.cardWidth - layout.columnGap,
      layout.gridCenterX,
      layout.gridCenterX + layout.cardWidth + layout.columnGap,
    ];
    const rowStep = layout.cardHeight + layout.rowGap;
    this.cards.forEach((card, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = centersX[column];
      const y = layout.gridCenterY + (row === 0 ? -rowStep / 2 : rowStep / 2);
      const photoY =
        -layout.cardHeight / 2 +
        CARD_PHOTO_TOP_INSET * layout.scale +
        layout.cardPhotoSide / 2;
      const nameHeight = layout.cardNameHeight;
      const nameY = layout.cardHeight / 2 - 10 * layout.scale - nameHeight / 2;
      const photoArea = {
        x: -layout.cardPhotoSide / 2,
        y: photoY - layout.cardPhotoSide / 2,
        width: layout.cardPhotoSide,
        height: layout.cardPhotoSide,
      };
      const nameArea = {
        x: -layout.cardWidth / 2 + 4 * layout.scale,
        y: nameY - nameHeight / 2,
        width: layout.cardWidth - 8 * layout.scale,
        height: nameHeight,
      };
      const markerArea = {
        x: -layout.cardWidth / 2 + 8 * layout.scale,
        y: -layout.cardHeight / 2 + 8 * layout.scale,
        width: 34 * layout.scale,
        height: 20 * layout.scale,
      };

      card.setPosition(x, y).setSize(layout.cardWidth, layout.cardHeight);
      card.input?.hitArea?.setTo(0, 0, layout.cardWidth, layout.cardHeight);
      card.portrait.setPosition(0, photoY);
      ajustarPortraitContain(card.portrait, photoArea.width, photoArea.height);
      card.nomeText
        .setPosition(0, nameY)
        .setScale(layout.scale)
        .setWordWrapWidth(nameArea.width - 4 * layout.scale, true);
      card.marcador.setScale(layout.scale);
      card.marcador.setPosition(
        markerArea.x + markerArea.width / 2,
        markerArea.y + markerArea.height / 2,
      );
      atualizarMascara(
        card.mascaraRetrato,
        photoArea.width,
        photoArea.height,
        x,
        y + photoY,
      );
      card.geometry = { photo: photoArea, name: nameArea, marker: markerArea };
      this.desenharCard(card);
    });

    this.statusText
      .setPosition(layout.statusX, layout.statusY)
      .setWordWrapWidth(layout.statusWidth, true);

    this.confirmButton.width = layout.buttonWidth;
    this.backButton.width = layout.buttonWidth;
    this.confirmButton.height = layout.buttonWidth * BUTTON_HEIGHT_RATIO;
    this.backButton.height = layout.buttonWidth * BUTTON_HEIGHT_RATIO;
    this.confirmButton.image.setDisplaySize(
      this.confirmButton.width,
      this.confirmButton.height,
    );
    this.confirmButton.highlight.setDisplaySize(
      this.confirmButton.width,
      this.confirmButton.height,
    );
    this.backButton.image.setDisplaySize(
      this.backButton.width,
      this.backButton.height,
    );
    this.backButton.highlight.setDisplaySize(
      this.backButton.width,
      this.backButton.height,
    );
    this.confirmButton.container.setSize(
      this.confirmButton.width,
      this.confirmButton.height,
    );
    this.backButton.container.setSize(
      this.backButton.width,
      this.backButton.height,
    );
    [this.confirmButton, this.backButton].forEach((button) => {
      button.container.input?.hitArea?.setTo(0, 0, button.width, button.height);
    });

    this.confirmButton.baseX =
      (this.safeArea.left + this.safeArea.right) / 2 - layout.buttonOffset;
    this.confirmButton.baseY = layout.buttonY;
    this.backButton.baseX =
      (this.safeArea.left + this.safeArea.right) / 2 + layout.buttonOffset;
    this.backButton.baseY = layout.buttonY;
    this.confirmButton.container.setPosition(
      this.confirmButton.baseX,
      this.confirmButton.baseY,
    );
    this.backButton.container.setPosition(
      this.backButton.baseX,
      this.backButton.baseY,
    );

    this.atualizarSelecao();
  }

  desenharCard(card) {
    const layout = this.layoutAtual;
    const selecionado = card.personagemId === this.personagemSelecionadoId;
    const marker = {
      ...card.geometry.marker,
      visible: selecionado,
    };
    desenharMolduraRetrato(card.frameGraphics, {
      width: layout.cardWidth,
      height: layout.cardHeight,
      selected: selecionado,
      hovered: card.hovered,
      photoArea: card.geometry.photo,
      nameArea: card.geometry.name,
      markerArea: marker.visible ? marker : null,
    });
    card.nomeText.setColor(selecionado ? "#ffe394" : "#ffffff");
    card.marcador.setVisible(selecionado);
  }

  atualizarSelecao() {
    if (!this.layoutAtual || !this.previewGeometry) return;
    this.cards.forEach((card) => this.desenharCard(card));

    const selecionado = CharacterService.isPlayableCharacterId(
      this.personagemSelecionadoId,
    );
    if (selecionado) {
      const portrait = CHARACTER_SELECT_PORTRAITS[this.personagemSelecionadoId];
      this.previewPortrait
        .setTexture(portrait.key)
        .setVisible(true)
        .setAlpha(1);
      ajustarPortraitContain(
        this.previewPortrait,
        this.previewGeometry.photo.width,
        this.previewGeometry.photo.height,
      );
      this.previewPlaceholder.setVisible(false);
      this.previewName.setText(
        PLAYABLE_CHARACTERS[this.personagemSelecionadoId].nome.toUpperCase(),
      );
    } else {
      this.previewPortrait.setVisible(false);
      this.previewPlaceholder.setVisible(true);
      this.previewName.setText("SEM SELEÇÃO");
    }

    desenharMolduraRetrato(this.previewFrame, {
      width: this.layoutAtual.previewWidth,
      height: this.layoutAtual.previewHeight,
      selected: selecionado,
      photoArea: this.previewGeometry.photo,
      nameArea: this.previewGeometry.name,
    });
  }

  selecionarPersonagem(personagemId) {
    if (this.bloqueado || !CharacterService.isPlayableCharacterId(personagemId))
      return;
    this.personagemSelecionadoId = personagemId;
    this.atualizarSelecao();
    SoundService.tocarClique(this); // <-- SOM AO SELECIONAR PERSONAGEM
    this.mostrarMensagem(
      `${PLAYABLE_CHARACTERS[personagemId].nome} selecionado.`,
    );
  }

  aoPassarMouse(card) {
    if (this.bloqueado) return;
    card.hovered = true;
    card.portrait.setTint(0xfff3d4);
    this.desenharCard(card);
  }

  aoSairMouse(card) {
    card.hovered = false;
    card.portrait.clearTint();
    this.desenharCard(card);
  }

  aoPressionarTecla(event) {
    const mapaWasd = {
      KeyA: "ArrowLeft",
      KeyD: "ArrowRight",
      KeyW: "ArrowUp",
      KeyS: "ArrowDown",
    };
    const codigo = mapaWasd[event.code] || event.code;

    if (codigo === "Enter") {
      event.preventDefault();
      this.confirmar();
      return;
    }
    if (codigo === "Escape") {
      event.preventDefault();
      this.voltar();
      return;
    }

    const direcoes = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (!direcoes.includes(codigo)) return;
    event.preventDefault();
    if (this.bloqueado) return;

    let index = PLAYABLE_CHARACTER_IDS.indexOf(this.personagemSelecionadoId);
    if (index < 0) index = 0;
    const coluna = index % 3;
    const linha = Math.floor(index / 3);

    if (codigo === "ArrowLeft") index += coluna === 0 ? 2 : -1;
    if (codigo === "ArrowRight") index += coluna === 2 ? -2 : 1;
    if (codigo === "ArrowUp") index += linha === 0 ? 3 : -3;
    if (codigo === "ArrowDown") index += linha === 0 ? 3 : -3;

    this.selecionarPersonagem(PLAYABLE_CHARACTER_IDS[index]);
  }

  mostrarMensagem(mensagem) {
    this.statusText.setText(mensagem);
    this.statusText.setColor(
      mensagem.startsWith("Escolha") || mensagem.startsWith("Digite")
        ? "#ffd28e"
        : "#e8f4df",
    );
  }

  confirmar() {
    if (!CharacterService.isPlayableCharacterId(this.personagemSelecionadoId)) {
      this.mostrarMensagem("Escolha um personagem.");
      return;
    }

    if (this.perfil) {
      const perfilAtual = carregarPerfil(this.perfil.id);
      if (!perfilAtual) {
        this.mostrarMensagem("Não foi possível carregar este perfil.");
        return;
      }
      if (
        perfilAtual.personagemId &&
        perfilAtual.personagemId !== this.personagemSelecionadoId
      ) {
        this.mostrarMensagem("O personagem deste perfil não pode ser trocado.");
        return;
      }

      try {
        const perfilAtualizado = perfilAtual.personagemId
          ? perfilAtual
          : vincularPersonagemPerfil(
              perfilAtual.id,
              this.personagemSelecionadoId,
            );
        this.scene.start("StageSelectScene", { perfil: perfilAtualizado });
      } catch (erro) {
        this.mostrarMensagem(
          erro.message || "Não foi possível vincular o personagem.",
        );
      }
      return;
    }

    if (!this.nome) {
      this.mostrarMensagem("Digite o nome do perfil antes de confirmar.");
      return;
    }

    try {
      const perfil = criarNovoPerfil(this.nome, this.personagemSelecionadoId);
      this.scene.start("StageSelectScene", { perfil });
    } catch (erro) {
      this.mostrarMensagem(erro.message || "Não foi possível criar o perfil.");
    }
  }

  voltar() {
    if (this.perfil) {
      this.scene.start("ProfileScene", {
        perfil: this.perfil,
        aviso: "Escolha um personagem para continuar.",
      });
      return;
    }
    this.scene.start("ProfileScene", {
      mode: "new",
      nome: this.nome,
      aviso: "Você pode ajustar o nome antes de confirmar o perfil.",
    });
  }

  limparEventos() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.aplicarLayout, this);
    this.input.keyboard?.off("keydown", this.aoPressionarTecla, this);

    const mascaras = [
      this.previewMascaraRetrato,
      ...this.cards.map((card) => card.mascaraRetrato),
    ];
    mascaras.forEach((mascara) => {
      mascara?.geometria?.destroy();
      mascara?.origem?.destroy();
    });
  }
}

export default CharacterSelectScene;
