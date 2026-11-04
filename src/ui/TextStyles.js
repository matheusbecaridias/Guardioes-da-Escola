export const PIXELIFY_SANS = '"Pixelify Sans"';

const TEXTO_BRANCO = "#FFFFFF";
const CONTORNO_PRETO = "#000000";
const AUMENTO_FONTE_PX = 6;
const AUMENTO_LETTER_SPACING_PX = 1.5;
const MULTIPLICADOR_CONTORNO = 0.855;

function aumentarTamanhoFonte(fontSize) {
  const tamanho = Number.parseFloat(fontSize);
  if (!Number.isFinite(tamanho)) return fontSize;
  const novoTamanho = tamanho + AUMENTO_FONTE_PX;
  return typeof fontSize === "number" ? novoTamanho : `${novoTamanho}px`;
}

function obterEspessuraContorno(fontSize) {
  const tamanho = Number.parseFloat(fontSize);
  const espessuraAtual = !Number.isFinite(tamanho)
    ? 2
    : tamanho <= 18
      ? 2
      : tamanho <= 28
        ? 3
        : tamanho <= 40
          ? 4
          : 5;
  return Math.max(1, espessuraAtual * MULTIPLICADOR_CONTORNO);
}

/** Aplica o polimento tipográfico global sem alterar o conteúdo renderizado. */
export function pixelTextStyle(estilo = {}, { preservarCor = false } = {}) {
  const {
    color,
    stroke: _stroke,
    strokeThickness: _strokeThickness,
    ...demaisEstilos
  } = estilo;
  const fonteAnterior = estilo.fontSize ?? "16px";
  const letterSpacingAtual = Number.parseFloat(estilo.letterSpacing) || 0;

  return {
    ...demaisEstilos,
    fontSize: aumentarTamanhoFonte(fonteAnterior),
    fontFamily: PIXELIFY_SANS,
    fontStyle: "bold",
    color: preservarCor && color ? color : TEXTO_BRANCO,
    stroke: CONTORNO_PRETO,
    strokeThickness: obterEspessuraContorno(fonteAnterior),
    letterSpacing: letterSpacingAtual + AUMENTO_LETTER_SPACING_PX,
  };
}

export const TEXT_POLISH = Object.freeze({
  fontSizeIncreasePx: AUMENTO_FONTE_PX,
  letterSpacingIncreasePx: AUMENTO_LETTER_SPACING_PX,
  strokeMultiplier: MULTIPLICADOR_CONTORNO,
});
