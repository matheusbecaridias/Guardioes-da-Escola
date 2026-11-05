import { InfoSceneBase } from "./InfoSceneBase.js";

export class CreditsScene extends InfoSceneBase {
  constructor() {
    super({
      key: "CreditsScene",
      title: "CRÉDITOS",

      sections: [
        {
          heading: "EQUIPE",
          body: [
            "ABNER REPELEVICZ - Front-End",
            "DORIVAL JUNIOR - Banco de Dados",
            "EDSON HARA - Product Owner",
            "LUCAS CAMACHO - Cliente",
            "MATHEUS BECARI - Scrum Master",
            "ROSY LOIRA - Back-End\n",
          ].join("\n"),
        },
        {
          heading: "DESENVOLVIDO COM",
          body: "Phaser 3 • JavaScript • Vite • OpenAI (ChatGPT) • Google (Gemini 3.8 flash)",
        },
        {
          heading: "ARTE",
          body:["Ambientes e elementos em pixel art: REPELEVICZ, Abner; DIAS, Matheus; OpenAI (ChatGPT / GPT Image); Google (Gemini / Nano Banana 2)",
          "Trilha Sonora: KAIHATSTWO. Blondie - Heart of Glass (8-Bit/Gameboy cover). YouTube, 8 de maio de 2019.",
          ].join("\n"),
        },
      ],
    });
  }
}

export default CreditsScene;
