export const NAVIGATION_CELL_SIZE = 20;
export const NAVIGATION_COLLISION_MARGIN = 2;

function validarRetangulo(rectangulo) {
  return (
    rectangulo &&
    Number.isFinite(rectangulo.x) &&
    Number.isFinite(rectangulo.y) &&
    Number.isFinite(rectangulo.width) &&
    Number.isFinite(rectangulo.height) &&
    rectangulo.width > 0 &&
    rectangulo.height > 0
  );
}

function sobrepoe(aEsquerda, aTopo, aDireita, aBase, b) {
  return (
    aDireita > b.x &&
    aEsquerda < b.x + b.width &&
    aBase > b.y &&
    aTopo < b.y + b.height
  );
}

export function criarMalhaNavegacao(limites, colisores = [], opcoes = {}) {
  const cellSize =
    Number.isFinite(opcoes.cellSize) && opcoes.cellSize > 0
      ? opcoes.cellSize
      : NAVIGATION_CELL_SIZE;
  const actorWidth = Number.isFinite(opcoes.actorWidth)
    ? opcoes.actorWidth
    : 30;
  const actorHeight = Number.isFinite(opcoes.actorHeight)
    ? opcoes.actorHeight
    : 18;
  const margin = Number.isFinite(opcoes.margin)
    ? opcoes.margin
    : NAVIGATION_COLLISION_MARGIN;

  if (
    !validarRetangulo(limites) ||
    actorWidth <= 0 ||
    actorHeight <= 0 ||
    margin < 0
  ) {
    throw new TypeError(
      "A malha de navegação precisa de limites e hitbox válidos.",
    );
  }

  const obstaculos = colisores
    .filter(validarRetangulo)
    .map((item) => ({ ...item }));
  const originX = limites.x + actorWidth / 2 + margin;
  // O ponto da malha representa os pés do Player, não o centro do sprite.
  const originY = limites.y + actorHeight + margin;
  const maxX = limites.x + limites.width - actorWidth / 2 - margin;
  const maxY = limites.y + limites.height - margin;
  const columns = Math.floor((maxX - originX) / cellSize) + 1;
  const rows = Math.floor((maxY - originY) / cellSize) + 1;

  if (columns < 1 || rows < 1) {
    throw new RangeError("Os limites não comportam a hitbox do jogador.");
  }

  const grid = {
    x: limites.x,
    y: limites.y,
    width: limites.width,
    height: limites.height,
    originX,
    originY,
    cellSize,
    columns,
    rows,
    actorWidth,
    actorHeight,
    margin,
    obstacles: obstaculos,
    walkable: new Uint8Array(columns * rows),
  };

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const point = obterPosicaoCelula(grid, row * columns + column);
      if (pontoCaminhavel(grid, point.x, point.y)) {
        grid.walkable[row * columns + column] = 1;
      }
    }
  }

  return grid;
}

export function obterPosicaoCelula(grid, id) {
  const row = Math.floor(id / grid.columns);
  const column = id % grid.columns;
  return {
    x: grid.originX + column * grid.cellSize,
    y: grid.originY + row * grid.cellSize,
  };
}

export function pontoCaminhavel(grid, x, y) {
  const halfWidth = grid.actorWidth / 2 + grid.margin;
  const top = y - grid.actorHeight - grid.margin;
  const bottom = y + grid.margin;

  if (
    x - halfWidth < grid.x ||
    x + halfWidth > grid.x + grid.width ||
    top < grid.y ||
    bottom > grid.y + grid.height
  ) {
    return false;
  }

  return !grid.obstacles.some((obstacle) =>
    sobrepoe(x - halfWidth, top, x + halfWidth, bottom, obstacle),
  );
}

function obterIdDaCelulaMaisProxima(grid, point) {
  const column = Math.round((point.x - grid.originX) / grid.cellSize);
  const row = Math.round((point.y - grid.originY) / grid.cellSize);
  if (column < 0 || column >= grid.columns || row < 0 || row >= grid.rows)
    return null;
  return row * grid.columns + column;
}

function segmentoCaminhavel(grid, inicio, fim) {
  const distancia = Math.abs(fim.x - inicio.x) + Math.abs(fim.y - inicio.y);
  const passos = Math.max(
    1,
    Math.ceil(distancia / Math.max(4, grid.cellSize / 2)),
  );

  for (let passo = 0; passo <= passos; passo += 1) {
    const proporcao = passo / passos;
    const x = inicio.x + (fim.x - inicio.x) * proporcao;
    const y = inicio.y + (fim.y - inicio.y) * proporcao;
    if (!pontoCaminhavel(grid, x, y)) return false;
  }

  return true;
}

function obterConectorCardinal(grid, inicio, fim) {
  const horizontalPrimeiro = { x: fim.x, y: inicio.y };
  const verticalPrimeiro = { x: inicio.x, y: fim.y };
  const candidatos = [
    [inicio, horizontalPrimeiro, fim],
    [inicio, verticalPrimeiro, fim],
  ];

  for (const candidato of candidatos) {
    let seguro = true;
    for (let indice = 0; indice < candidato.length - 1; indice += 1) {
      if (!segmentoCaminhavel(grid, candidato[indice], candidato[indice + 1])) {
        seguro = false;
        break;
      }
    }
    if (seguro) {
      return candidato.slice(1).filter((ponto, indice, lista) => {
        const anterior = indice === 0 ? inicio : lista[indice - 1];
        return (
          Math.abs(ponto.x - anterior.x) + Math.abs(ponto.y - anterior.y) > 0.5
        );
      });
    }
  }

  return null;
}

function obterCelulasDeInicio(grid, inicio) {
  const centro = obterIdDaCelulaMaisProxima(grid, inicio);
  if (centro === null) return [];

  const linhaCentro = Math.floor(centro / grid.columns);
  const colunaCentro = centro % grid.columns;
  const candidatos = [];

  for (let raio = 0; raio <= 3; raio += 1) {
    for (
      let linha = Math.max(0, linhaCentro - raio);
      linha <= Math.min(grid.rows - 1, linhaCentro + raio);
      linha += 1
    ) {
      for (
        let coluna = Math.max(0, colunaCentro - raio);
        coluna <= Math.min(grid.columns - 1, colunaCentro + raio);
        coluna += 1
      ) {
        if (
          raio > 0 &&
          Math.max(
            Math.abs(linha - linhaCentro),
            Math.abs(coluna - colunaCentro),
          ) !== raio
        ) {
          continue;
        }

        const id = linha * grid.columns + coluna;
        if (!grid.walkable[id]) continue;
        const posicao = obterPosicaoCelula(grid, id);
        const conector = obterConectorCardinal(grid, inicio, posicao);
        if (!conector) continue;

        const distancia = conector.reduce((total, ponto, indice) => {
          const anterior = indice === 0 ? inicio : conector[indice - 1];
          return (
            total +
            Math.abs(ponto.x - anterior.x) +
            Math.abs(ponto.y - anterior.y)
          );
        }, 0);
        candidatos.push({ id, conector, distancia });
      }
    }
  }

  return candidatos.sort((a, b) => a.distancia - b.distancia);
}

class MinHeap {
  constructor() {
    this.items = [];
  }

  push(item) {
    this.items.push(item);
    let indice = this.items.length - 1;
    while (indice > 0) {
      const pai = Math.floor((indice - 1) / 2);
      if (this.items[pai].score <= item.score) break;
      this.items[indice] = this.items[pai];
      indice = pai;
    }
    this.items[indice] = item;
  }

  pop() {
    if (this.items.length === 0) return null;
    const menor = this.items[0];
    const ultimo = this.items.pop();
    if (this.items.length === 0) return menor;

    let indice = 0;
    while (true) {
      const esquerdo = indice * 2 + 1;
      const direito = esquerdo + 1;
      if (esquerdo >= this.items.length) break;
      const menorFilho =
        direito < this.items.length &&
        this.items[direito].score < this.items[esquerdo].score
          ? direito
          : esquerdo;
      if (this.items[menorFilho].score >= ultimo.score) break;
      this.items[indice] = this.items[menorFilho];
      indice = menorFilho;
    }
    this.items[indice] = ultimo;
    return menor;
  }

  get length() {
    return this.items.length;
  }
}

function obterVizinhos(grid, id) {
  const linha = Math.floor(id / grid.columns);
  const coluna = id % grid.columns;
  const vizinhos = [];

  if (linha > 0) vizinhos.push(id - grid.columns);
  if (coluna + 1 < grid.columns) vizinhos.push(id + 1);
  if (linha + 1 < grid.rows) vizinhos.push(id + grid.columns);
  if (coluna > 0) vizinhos.push(id - 1);
  return vizinhos.filter((vizinho) => grid.walkable[vizinho]);
}

function executarAEstrela(grid, inicio, idsObjetivo) {
  const objetivos = new Set(idsObjetivo);
  if (objetivos.size === 0 || !grid.walkable[inicio]) return null;
  if (objetivos.has(inicio)) return [inicio];

  const gScore = new Float64Array(grid.walkable.length);
  gScore.fill(Number.POSITIVE_INFINITY);
  const veioDe = new Int32Array(grid.walkable.length);
  veioDe.fill(-1);
  const fechado = new Uint8Array(grid.walkable.length);
  const fronteira = new MinHeap();

  const heuristica = (id) => {
    const linha = Math.floor(id / grid.columns);
    const coluna = id % grid.columns;
    let menor = Number.POSITIVE_INFINITY;
    objetivos.forEach((objetivo) => {
      const linhaObjetivo = Math.floor(objetivo / grid.columns);
      const colunaObjetivo = objetivo % grid.columns;
      menor = Math.min(
        menor,
        Math.abs(linha - linhaObjetivo) + Math.abs(coluna - colunaObjetivo),
      );
    });
    return menor;
  };

  gScore[inicio] = 0;
  fronteira.push({ id: inicio, score: heuristica(inicio) });

  while (fronteira.length > 0) {
    const atual = fronteira.pop().id;
    if (fechado[atual]) continue;
    fechado[atual] = 1;

    if (objetivos.has(atual)) {
      const caminho = [atual];
      let cursor = atual;
      while (veioDe[cursor] !== -1) {
        cursor = veioDe[cursor];
        caminho.push(cursor);
      }
      return caminho.reverse();
    }

    obterVizinhos(grid, atual).forEach((vizinho) => {
      if (fechado[vizinho]) return;
      const custo = gScore[atual] + 1;
      if (custo >= gScore[vizinho]) return;
      veioDe[vizinho] = atual;
      gScore[vizinho] = custo;
      fronteira.push({ id: vizinho, score: custo + heuristica(vizinho) });
    });
  }

  return null;
}

function condensarCaminho(pontos) {
  const distintos = pontos.filter((ponto, indice) => {
    if (indice === 0) return true;
    const anterior = pontos[indice - 1];
    return (
      Math.abs(ponto.x - anterior.x) + Math.abs(ponto.y - anterior.y) > 0.5
    );
  });
  if (distintos.length < 3) return distintos;

  const condensado = [distintos[0]];
  for (let indice = 1; indice < distintos.length - 1; indice += 1) {
    const antes = condensado.at(-1);
    const atual = distintos[indice];
    const depois = distintos[indice + 1];
    const mesmoEixo =
      (antes.x === atual.x && atual.x === depois.x) ||
      (antes.y === atual.y && atual.y === depois.y);
    if (!mesmoEixo) condensado.push(atual);
  }
  condensado.push(distintos.at(-1));
  return condensado;
}

function montarCaminho(grid, pontoInicio, candidatosInicio, idsObjetivo) {
  let melhor = null;

  candidatosInicio.forEach((candidato) => {
    const caminhoIds = executarAEstrela(grid, candidato.id, idsObjetivo);
    if (!caminhoIds) return;
    const caminhoPontos = caminhoIds.map((id) => obterPosicaoCelula(grid, id));
    const custo = candidato.distancia + (caminhoIds.length - 1) * grid.cellSize;
    if (!melhor || custo < melhor.custo) {
      melhor = {
        custo,
        pontos: condensarCaminho([...candidato.conector, ...caminhoPontos]),
      };
    }
  });

  if (!melhor) return null;
  return melhor.pontos.filter(
    (ponto) =>
      Math.abs(ponto.x - pontoInicio.x) + Math.abs(ponto.y - pontoInicio.y) >
      0.5,
  );
}

function obterObjetivosProximos(grid, alvo, distanciaMaxima) {
  const idCentro = obterIdDaCelulaMaisProxima(grid, alvo);
  if (idCentro === null) return [];
  const raioCelulas = Math.ceil(distanciaMaxima / grid.cellSize) + 1;
  const linhaCentro = Math.floor(idCentro / grid.columns);
  const colunaCentro = idCentro % grid.columns;
  const objetivos = [];

  for (
    let linha = Math.max(0, linhaCentro - raioCelulas);
    linha <= Math.min(grid.rows - 1, linhaCentro + raioCelulas);
    linha += 1
  ) {
    for (
      let coluna = Math.max(0, colunaCentro - raioCelulas);
      coluna <= Math.min(grid.columns - 1, colunaCentro + raioCelulas);
      coluna += 1
    ) {
      const id = linha * grid.columns + coluna;
      if (!grid.walkable[id]) continue;
      const posicao = obterPosicaoCelula(grid, id);
      const distancia = Math.hypot(posicao.x - alvo.x, posicao.y - alvo.y);
      if (distancia <= distanciaMaxima) {
        objetivos.push(id);
      }
    }
  }

  return objetivos;
}

export function encontrarCaminhoAtePonto(grid, inicio, destino, opcoes = {}) {
  const inicios = obterCelulasDeInicio(grid, inicio);
  if (inicios.length === 0) return null;
  const idAlvo = obterIdDaCelulaMaisProxima(grid, destino);
  if (idAlvo === null) return null;

  let objetivos = grid.walkable[idAlvo] ? [idAlvo] : [];
  if (objetivos.length === 0) {
    objetivos = obterObjetivosProximos(
      grid,
      destino,
      Number.isFinite(opcoes.maxSnapDistance)
        ? opcoes.maxSnapDistance
        : grid.cellSize * 3,
    ).sort((a, b) => {
      const pontoA = obterPosicaoCelula(grid, a);
      const pontoB = obterPosicaoCelula(grid, b);
      return (
        Math.hypot(pontoA.x - destino.x, pontoA.y - destino.y) -
        Math.hypot(pontoB.x - destino.x, pontoB.y - destino.y)
      );
    });

    for (const objetivo of objetivos) {
      const caminho = montarCaminho(grid, inicio, inicios, [objetivo]);
      if (caminho) return caminho;
    }
    return null;
  }

  return montarCaminho(grid, inicio, inicios, objetivos);
}

export function encontrarCaminhoAteInteracao(
  grid,
  inicio,
  alvo,
  raioInteracao,
  deslocamentoInteracao = 0,
) {
  if (!Number.isFinite(raioInteracao) || raioInteracao < 0) return null;
  const inicios = obterCelulasDeInicio(grid, inicio);
  if (inicios.length === 0) return null;

  const raioCelulas =
    Math.ceil(
      (raioInteracao + Math.abs(deslocamentoInteracao)) / grid.cellSize,
    ) + 1;
  const centro = obterIdDaCelulaMaisProxima(grid, alvo);
  if (centro === null) return null;
  const linhaCentro = Math.floor(centro / grid.columns);
  const colunaCentro = centro % grid.columns;
  const objetivos = [];

  for (
    let linha = Math.max(0, linhaCentro - raioCelulas);
    linha <= Math.min(grid.rows - 1, linhaCentro + raioCelulas);
    linha += 1
  ) {
    for (
      let coluna = Math.max(0, colunaCentro - raioCelulas);
      coluna <= Math.min(grid.columns - 1, colunaCentro + raioCelulas);
      coluna += 1
    ) {
      const id = linha * grid.columns + coluna;
      if (!grid.walkable[id]) continue;
      const posicao = obterPosicaoCelula(grid, id);
      if (
        Math.hypot(
          posicao.x - alvo.x,
          posicao.y - deslocamentoInteracao - alvo.y,
        ) <= raioInteracao
      ) {
        objetivos.push(id);
      }
    }
  }

  return montarCaminho(grid, inicio, inicios, objetivos);
}
