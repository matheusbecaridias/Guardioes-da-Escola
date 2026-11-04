import { InfoSceneBase } from "./InfoSceneBase.js";
import { SoundService } from "../services/SoundService.js";

export class SettingsScene extends InfoSceneBase {
  constructor() {
    super({
      key: "SettingsScene",
      title: "CONFIGURAÇÕES",
      sections: [
        {
          heading: "CONTROLES",
          body: "WASD / SETAS — movimentação\nClique/toque — caminhar\nE — interagir",
        },
        {
          heading: "ÁUDIO",
          body: SoundService.estaMutado()
            ? "Status: MUDO ❚❚ (Clique para ativar o som ▶︎)"
            : "Status: ATIVADO ▶︎ (Clique para mutar ❚❚)",
        },
        {
          heading: "EXIBIÇÃO",
          body: "A escala se ajusta à janela; o formato do jogo\npermanece em 16:9.",
        },
        {
          heading: "PERFIL",
          body: "O progresso é salvo localmente neste dispositivo.",
        },
        {
          heading: "VERSÃO",
          body: "Protótipo / MVP acadêmico — Guardiões da Escola.",
        },
      ],
    });
  }

  create() {
    super.create();

    // Permite clicar na seção de áudio para ligar/desligar
    const secaoAudio = this.children.list.find(
      (child) => child.text && child.text.includes("Status:"),
    );

    if (secaoAudio) {
      secaoAudio.setInteractive({ useHandCursor: true });
      secaoAudio.on("pointerdown", () => {
        const mutado = SoundService.alternarMute();
        secaoAudio.setText(
          mutado
            ? "Status: MUDO ❚❚ (Clique para ativar o som ▶︎)"
            : "Status: ATIVADO ▶︎ (Clique para mutar ❚❚)",
        );
        SoundService.tocarClique(this);
      });
    }
  }
}

export default SettingsScene;
