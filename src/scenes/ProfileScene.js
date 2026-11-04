import Phaser from "phaser";
import {
  carregarPerfil,
  listarPerfis,
  selecionarPerfil,
} from "../data/ProfileRepository.js";
import { PLAYABLE_CHARACTERS } from "../data/charactersData.js";
import { CharacterService } from "../services/CharacterService.js";
import { criarBotaoImagem } from "../ui/ImageButton.js";
import { pixelTextStyle, TEXT_POLISH } from "../ui/TextStyles.js";
import { SoundService } from "../services/SoundService.js";

const IMAGENS_PERFIL = {
  criarPerfil: {
    key: "profile-botao-criar",
    path: "assets/images/BotaoCriarPerfil",
  },
  iniciarJogo: {
    key: "profile-botao-iniciar",
    path: "assets/images/BotaoIniciarJogo.png",
  },
  voltarMenu: {
    key: "profile-botao-voltar",
    path: "assets/images/BotaoVoltarAoMenu.png",
  },
  quadroNormal: {
    key: "profile-quadro-normal",
    path: "assets/images/QuadroNormal",
  },
  quadroDourado: {
    key: "profile-quadro-dourado",
    path: "assets/images/QuadroDourado",
  },
  fundos: [
    { key: "menu-fundo-frente", path: "assets/images/FrentePixel" },
    { key: "menu-fundo-interno-1", path: "assets/images/Interno1" },
    { key: "menu-fundo-interno-2", path: "assets/images/Interno2" },
    { key: "menu-fundo-interno-3", path: "assets/images/Interno3" },
    { key: "menu-fundo-interno-4", path: "assets/images/Interno4" },
  ],
};

const TEMPO_FUNDO_VISIVEL = 6500;
const DURACAO_TRANSICAO = 2200;
const LARGURA_CARTAO_PERFIL = 430;
const ESPACO_CARTOES_PERFIL = 10;
const AREA_LISTA_PERFIS = {
  topo: 165,
  base: 620,
  esquerda: 640,
  direita: 1260,
};

export class ProfileScene extends Phaser.Scene {
  constructor() {
    super("ProfileScene");
    this.perfilSelecionado = null;
    this.profileButtons = [];
    this.emptyProfilesText = null;
  }

  init(data) {
    const perfilRecebido = data?.perfil;
    this.perfilSelecionado = perfilRecebido?.id
      ? selecionarPerfil(perfilRecebido.id) ||
        carregarPerfil(perfilRecebido.id) ||
        perfilRecebido
      : null;
    this.mensagemInicial = data?.aviso || "";
    this.nomeInicial = String(data?.nome || "");
  }

  preload() {
    [
      IMAGENS_PERFIL.criarPerfil,
      IMAGENS_PERFIL.iniciarJogo,
      IMAGENS_PERFIL.voltarMenu,
      IMAGENS_PERFIL.quadroNormal,
      IMAGENS_PERFIL.quadroDourado,
    ].forEach(({ key, path }) => {
      if (!this.textures.exists(key)) this.load.image(key, path);
    });

    IMAGENS_PERFIL.fundos.forEach(({ key, path }) => {
      if (!this.textures.exists(key)) this.load.image(key, path);
    });
  }

  create() {
    this.ancorarInput = this.ancorarInput.bind(this);
    this.aoDigitarNome = this.aoDigitarNome.bind(this);
    const { width, height } = this.cameras.main;
    this.layout = {
      inputX: width * 0.25,
      inputY: 210,
    };

    this.iniciarSlideshow(width, height);

    this.add
      .text(
        width / 2,
        62,
        "PERFIL DO GUARDIÃO",
        pixelTextStyle({
          fontSize: "36px",
        }),
      )
      .setOrigin(0.5);

    this.adicionarTituloColuna(width * 0.25, 145, "Crie um novo perfil local");
    this.adicionarTituloColuna(width * 0.72, 145, "Perfis existentes");

    this.profileListViewport = {
      x: AREA_LISTA_PERFIS.esquerda,
      y: AREA_LISTA_PERFIS.topo,
      width: AREA_LISTA_PERFIS.direita - AREA_LISTA_PERFIS.esquerda,
      height: AREA_LISTA_PERFIS.base - AREA_LISTA_PERFIS.topo,
    };
    this.profileListMaskGraphics = this.make.graphics({
      x: 0,
      y: 0,
      add: false,
    });
    this.profileListMaskGraphics.fillStyle(0xffffff);
    this.profileListMaskGraphics.fillRect(
      this.profileListViewport.x,
      this.profileListViewport.y,
      this.profileListViewport.width,
      this.profileListViewport.height,
    );
    this.profileListMask = this.profileListMaskGraphics.createGeometryMask();
    this.profileListScrollOffset = 0;
    this.input.on("wheel", this.rolarListaPerfis, this);

    // Criação do elemento de input HTML
    this.nameInput = document.createElement("input");
    this.nameInput.id = "profile-name-input";
    this.nameInput.type = "text";
    this.nameInput.placeholder = "Digite seu nome";
    this.nameInput.maxLength = 28;
    this.nameInput.setAttribute("aria-label", "Nome do perfil");
    Object.assign(this.nameInput.style, {
      position: "absolute",
      zIndex: "100",
      padding: "0 14px",
      border: "3px solid #a96936",
      borderRadius: "0",
      background: "#103d2e",
      color: "#ffffff",
      fontFamily: '"Pixelify Sans"',
      fontWeight: "700",
      boxSizing: "border-box",
      outline: "none",
      boxShadow:
        "0 4px 0 rgba(54, 29, 15, 0.9), inset 0 0 0 2px rgba(255, 255, 255, 0.08)",
      touchAction: "manipulation",
    });

    // Anexa ao document.body para evitar que transformações do canvas afetem o cálculo
    document.body.appendChild(this.nameInput);
    this.nameInput.value = this.nomeInicial;
    this.nameInput.addEventListener("input", this.aoDigitarNome);
    this.ancorarInput();

    this.add
      .text(
        width * 0.25,
        282,
        "Digite seu nome e continue para escolher um retrato.",
        pixelTextStyle({
          fontSize: "16px",
          align: "center",
          wordWrap: { width: 520, useAdvancedWrap: true },
        }),
      )
      .setOrigin(0.5);

    this.createProfileButton = criarBotaoImagem(
      this,
      width * 0.25,
      385,
      IMAGENS_PERFIL.criarPerfil.key,
      250,
      () => this.criarPerfil(),
    );
    this.startGameButton = criarBotaoImagem(
      this,
      width * 0.25,
      485,
      IMAGENS_PERFIL.iniciarJogo.key,
      250,
      () => this.iniciarJogo(),
    );

    this.statusText = this.add
      .text(
        width * 0.25,
        555,
        "Selecione um perfil salvo ou crie um novo.",
        pixelTextStyle({
          fontSize: "14px",
          align: "center",
          wordWrap: { width: 520 },
        }),
      )
      .setOrigin(0.5);

    if (this.mensagemInicial) {
      this.statusText.setText(this.mensagemInicial);
    } else if (this.perfilSelecionado) {
      this.statusText.setText(
        this.perfilSelecionado.personagemId
          ? `Personagem vinculado: ${PLAYABLE_CHARACTERS[this.perfilSelecionado.personagemId].nome}.`
          : "Escolha um personagem para vincular a este perfil.",
      );
    }

    this.refreshProfiles();

    criarBotaoImagem(
      this,
      width / 2,
      height - 65,
      IMAGENS_PERFIL.voltarMenu.key,
      255,
      () => this.scene.start("MainMenuScene"),
    );

    // Listeners de redimensionamento e rotação
    this.scale.on(Phaser.Scale.Events.RESIZE, this.ancorarInput, this);
    window.addEventListener("resize", this.ancorarInput);
    window.addEventListener("orientationchange", this.ancorarInput);
    window.addEventListener("scroll", this.ancorarInput, true);
    window.visualViewport?.addEventListener("resize", this.ancorarInput);
    window.visualViewport?.addEventListener("scroll", this.ancorarInput);

    if (typeof ResizeObserver !== "undefined") {
      this.inputResizeObserver = new ResizeObserver(this.ancorarInput);
      this.inputResizeObserver.observe(this.game.canvas);
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.limparInput, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off("wheel", this.rolarListaPerfis, this);
      this.profileListMask?.destroy();
      this.profileListMaskGraphics?.destroy();
    });
  }

  update() {
    // Garante sincronia mesmo se a barra do navegador ou o teclado virtual alterarem a viewport
    if (!this.nameInput || !this.game?.canvas) return;
    const rect = this.game.canvas.getBoundingClientRect();
    if (
      rect.width !== this._lastRectW ||
      rect.height !== this._lastRectH ||
      rect.top !== this._lastRectT ||
      rect.left !== this._lastRectL
    ) {
      this.ancorarInput();
    }
  }

  ancorarInput() {
    if (!this.nameInput || !this.layout || !this.game?.canvas) return;

    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    this._lastRectW = rect.width;
    this._lastRectH = rect.height;
    this._lastRectT = rect.top;
    this._lastRectL = rect.left;

    const emRetrato = window.innerHeight > window.innerWidth;
    let centroX, centroY, largura, altura, escalaFonte;

    if (emRetrato) {
      // Em modo retrato:
      // O eixo X do jogo (1280) projeta na altura da tela (rect.height)
      // O eixo Y do jogo (720) projeta na largura da tela (rect.width, da direita para a esquerda)
      const escalaX = rect.height / 1280;
      const escalaY = rect.width / 720;

      centroX = rect.right - this.layout.inputY * escalaY;
      centroY = rect.top + this.layout.inputX * escalaX;

      largura = 430 * escalaX;
      altura = 50 * escalaY;
      escalaFonte = escalaX;
    } else {
      // Em modo paisagem normal:
      const escalaX = rect.width / 1280;
      const escalaY = rect.height / 720;

      centroX = rect.left + this.layout.inputX * escalaX;
      centroY = rect.top + this.layout.inputY * escalaY;

      largura = 430 * escalaX;
      altura = 50 * escalaY;
      escalaFonte = escalaY;
    }

    // Posicionamento direto pelo canto superior esquerdo (evita bug de translate com rotate)
    const left = centroX - largura / 2;
    const top = centroY - altura / 2;
    const tamanhoFonte = Math.max(13, Math.round(26 * escalaFonte));
    const letterSpacing = TEXT_POLISH.letterSpacingIncreasePx * escalaFonte;

    Object.assign(this.nameInput.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${largura}px`,
      height: `${altura}px`,
      fontSize: `${tamanhoFonte}px`,
      letterSpacing: `${letterSpacing}px`,
      transform: emRetrato ? "rotate(90deg)" : "none",
      transformOrigin: "center center",
    });
  }

  limparInput() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.ancorarInput, this);
    window.removeEventListener("resize", this.ancorarInput);
    window.removeEventListener("orientationchange", this.ancorarInput);
    window.removeEventListener("scroll", this.ancorarInput, true);
    window.visualViewport?.removeEventListener("resize", this.ancorarInput);
    window.visualViewport?.removeEventListener("scroll", this.ancorarInput);
    this.inputResizeObserver?.disconnect();
    this.nameInput?.removeEventListener("input", this.aoDigitarNome);
    this.nameInput?.remove();
    this.nameInput = null;
  }

  adicionarTituloColuna(x, y, texto) {
    return this.add
      .text(
        x,
        y,
        texto,
        pixelTextStyle({
          fontSize: "23px",
        }),
      )
      .setOrigin(0.5);
  }

  iniciarSlideshow(width, height) {
    const fundos = IMAGENS_PERFIL.fundos;
    const criarFundo = (key) => {
      const imagem = this.add.image(width / 2, height / 2, key);
      const escala = Math.max(width / imagem.width, height / imagem.height);
      imagem.setScale(escala).setAlpha(0).setDepth(-1);
      return imagem;
    };

    this.fundoAtivo = criarFundo(fundos[0].key).setAlpha(1);
    this.proximoFundo = criarFundo(fundos[1].key);
    this.indiceFundo = 0;
    this.time.delayedCall(TEMPO_FUNDO_VISIVEL, () => this.transicionarFundo());
  }

  transicionarFundo() {
    const fundos = IMAGENS_PERFIL.fundos;
    const proximoIndice = (this.indiceFundo + 1) % fundos.length;
    this.proximoFundo.setTexture(fundos[proximoIndice].key).setAlpha(0);

    this.tweens.add({
      targets: this.fundoAtivo,
      alpha: 0,
      duration: DURACAO_TRANSICAO,
      ease: "Sine.InOut",
    });

    this.tweens.add({
      targets: this.proximoFundo,
      alpha: 1,
      duration: DURACAO_TRANSICAO,
      ease: "Sine.InOut",
      onComplete: () => {
        const fundoAnterior = this.fundoAtivo;
        this.fundoAtivo = this.proximoFundo;
        this.proximoFundo = fundoAnterior.setAlpha(0);
        this.indiceFundo = proximoIndice;
        this.time.delayedCall(TEMPO_FUNDO_VISIVEL, () =>
          this.transicionarFundo(),
        );
      },
    });
  }

  aoDigitarNome() {
    if (!this.nameInput?.value.trim() || !this.perfilSelecionado) return;

    this.perfilSelecionado = null;
    this.atualizarSelecaoPerfis();
    this.statusText.setText("Novo perfil: avance para escolher um retrato.");
  }

  refreshProfiles() {
    this.profileButtons.forEach((button) => button.destroy(true));
    this.profileButtons = [];
    this.profileListScrollOffset = 0;
    this.emptyProfilesText?.destroy();
    this.emptyProfilesText = null;

    const perfis = listarPerfis();
    if (perfis.length === 0) {
      this.emptyProfilesText = this.add
        .text(
          0.72 * this.cameras.main.width,
          380,
          "Nenhum perfil salvo ainda.",
          pixelTextStyle({
            fontSize: "20px",
            align: "center",
          }),
        )
        .setOrigin(0.5);
      return;
    }

    const altura = LARGURA_CARTAO_PERFIL / 3;
    const passo = altura + ESPACO_CARTOES_PERFIL;
    const alturaConteudo =
      perfis.length * altura + (perfis.length - 1) * ESPACO_CARTOES_PERFIL;
    this.profileListMaxScroll = Math.max(
      0,
      alturaConteudo - this.profileListViewport.height,
    );
    const topoConteudo =
      this.profileListViewport.y +
      Math.max(0, (this.profileListViewport.height - alturaConteudo) / 2);
    const centroX = this.cameras.main.width * 0.72;

    perfis.forEach((perfil, index) => {
      const centroY = topoConteudo + altura / 2 + index * passo;
      this.criarBotaoPerfil(perfil, centroX, centroY, altura);
    });
    this.atualizarSelecaoPerfis();
    this.atualizarPosicoesPerfis();
  }

  criarBotaoPerfil(perfil, x, y, altura) {
    const largura = LARGURA_CARTAO_PERFIL;
    const fundo = this.add
      .image(0, 0, IMAGENS_PERFIL.quadroNormal.key)
      .setOrigin(0.5);
    fundo.setScale(largura / fundo.width);
    const texto = this.add
      .text(
        0,
        0,
        `${perfil.nome}\nCuidado ${perfil.pontuacao.cuidado}  •  Conduta ${perfil.pontuacao.conduta}`,
        pixelTextStyle({
          fontSize: "16px",
          align: "center",
          wordWrap: { width: largura - 28 },
        }),
      )
      .setOrigin(0.5);
    const botao = this.add.container(x, y, [fundo, texto]);

    botao.perfilId = perfil.id;
    botao.alturaPerfil = altura;
    botao.posicaoYBase = y;
    botao.setSize(largura, altura).setInteractive({ useHandCursor: true });
    botao.setMask(this.profileListMask);
    botao.atualizarVisual = (selecionado) => {
      fundo.setTexture(
        selecionado
          ? IMAGENS_PERFIL.quadroDourado.key
          : IMAGENS_PERFIL.quadroNormal.key,
      );
    };

    botao.on("pointerover", () => {
      this.tweens.add({
        targets: botao,
        scale: 1.02,
        duration: 100,
        ease: "Sine.Out",
      });
    });
    botao.on("pointerout", () => {
      this.tweens.add({
        targets: botao,
        scale: 1,
        duration: 100,
        ease: "Sine.Out",
      });
    });
    botao.on("pointerdown", () => this.selecionar(perfil.id));

    this.profileButtons.push(botao);
  }

  rolarListaPerfis(pointer, _gameObjects, _deltaX, deltaY) {
    const viewport = this.profileListViewport;
    if (
      !viewport ||
      pointer.x < viewport.x ||
      pointer.x > viewport.x + viewport.width ||
      pointer.y < viewport.y ||
      pointer.y > viewport.y + viewport.height
    ) {
      return;
    }

    this.profileListScrollOffset = Phaser.Math.Clamp(
      this.profileListScrollOffset + deltaY * 0.7,
      0,
      this.profileListMaxScroll || 0,
    );
    this.atualizarPosicoesPerfis();
  }

  atualizarPosicoesPerfis() {
    const viewport = this.profileListViewport;
    if (!viewport) return;

    this.profileButtons.forEach((button) => {
      button.y = button.posicaoYBase - this.profileListScrollOffset;
      const topo = button.y - button.alturaPerfil / 2;
      const base = button.y + button.alturaPerfil / 2;
      const visivel = base > viewport.y && topo < viewport.y + viewport.height;
      if (button.input) button.input.enabled = visivel;
    });
  }

  atualizarSelecaoPerfis() {
    this.profileButtons.forEach((button) => {
      button.atualizarVisual(button.perfilId === this.perfilSelecionado?.id);
    });
  }

  criarPerfil() {
    const nome = this.nameInput?.value.trim() || "";
    if (!nome) {
      this.statusText.setText(
        "Digite seu nome antes de escolher um personagem.",
      );
      return;
    }

    this.scene.start("CharacterSelectScene", { mode: "new", nome });
  }

  selecionar(id) {
    const perfil = selecionarPerfil(id);

    if (!perfil) {
      this.statusText.setText("Não foi possível selecionar esse perfil.");
      return;
    }

    SoundService.tocarClique(this);

    this.perfilSelecionado = perfil;
    this.nameInput.value = "";
    this.statusText.setText(
      perfil.personagemId
        ? `Personagem vinculado: ${PLAYABLE_CHARACTERS[perfil.personagemId].nome}.`
        : "Escolha um personagem para vincular a este perfil.",
    );
    this.atualizarSelecaoPerfis();
  }

  iniciarJogo() {
    if (!this.perfilSelecionado) {
      if (this.nameInput?.value.trim()) {
        this.criarPerfil();
      } else {
        this.statusText.setText(
          "Crie ou selecione um perfil antes de iniciar.",
        );
      }
      return;
    }

    const perfilAtualizado =
      carregarPerfil(this.perfilSelecionado.id) || this.perfilSelecionado;
    if (
      !CharacterService.isPlayableCharacterId(perfilAtualizado.personagemId)
    ) {
      this.scene.start("CharacterSelectScene", {
        perfil: perfilAtualizado,
        aviso: "Escolha um personagem para continuar.",
      });
      return;
    }

    this.perfilSelecionado = perfilAtualizado;
    this.scene.start("StageSelectScene", { perfil: perfilAtualizado });
  }
}

export default ProfileScene;
