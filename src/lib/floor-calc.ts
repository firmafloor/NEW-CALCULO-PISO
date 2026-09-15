export type FloorModel = {
  id: string;
  name: string;
  manufacturer: string;
  kind: string;
  /** comprimento da peça em cm */
  length: number;
  /** largura da peça em cm */
  width: number;
  /** espessura da peça em mm */
  thickness: number;
  /** peças por caixa */
  piecesPerBox: number;
  /** rendimento em m² por caixa */
  yieldPerBox: number;
  /** preço por caixa em R$ */
  pricePerBox: number;
  /** unidade de venda: caixas / pacotes */
  boxUnit: string;
    /** indica se o modelo requer manta de instalação */
  requiresUnderlayment?: boolean;
  includeLevelingCompound?: boolean;
  includeLvtAdhesive?: boolean;
  includePreparationCompound?: boolean;
  includePlaniprep?: boolean;
  custom?: boolean;
};

export const DEFAULT_MODELS: FloorModel[] = [
  {
    id: "prime",
    name: "Laminado Prime Click",
    manufacturer: "Eucafloor",
    kind: "Laminado",
    length: 135.7,
    width: 21.7,
    thickness: 7,
    piecesPerBox: 8,
    yieldPerBox: 2.36,
    pricePerBox: 189.9,
    boxUnit: "caixas",
    requiresUnderlayment: true,
  },
  {
    id: "evidence",
    name: "Laminado New Evidence",
    manufacturer: "Durafloor",
    kind: "Laminado",
    length: 135.7,
    width: 29.2,
    thickness: 7,
    piecesPerBox: 7,
    yieldPerBox: 2.77,
    pricePerBox: 219.9,
    boxUnit: "caixas",
    requiresUnderlayment: true,
  },
  {
    id: "elegance",
    name: "Laminado New Elegance",
    manufacturer: "Durafloor",
    kind: "Laminado",
    length: 135.7,
    width: 29.2,
    thickness: 7,
    piecesPerBox: 7,
    yieldPerBox: 3.87,
    pricePerBox: 289.9,
    boxUnit: "caixas",
    requiresUnderlayment: true,
  },
  {
    id: "magnifique",
    name: "Vinílico Magnifique",
    manufacturer: "Tarkett",
    kind: "Vinílico",
    length: 122,
    width: 18.4,
    thickness: 2,
    piecesPerBox: 20,
    yieldPerBox: 4.49,
    pricePerBox: 349.9,
    boxUnit: "caixas",
  },
  {
    id: "chateau",
    name: "Vinílico Château Decor",
    manufacturer: "Durafloor",
    kind: "Vinílico",
    length: 122.9,
    width: 22.8,
    thickness: 3,
    piecesPerBox: 6,
    yieldPerBox: 5.08,
    pricePerBox: 399.9,
    boxUnit: "pacotes",
  },
  {
    id: "lumiere",
    name: "Vinílico Lumiere",
    manufacturer: "Tarkett",
    kind: "Vinílico",
    length: 122,
    width: 18.4,
    thickness: 3,
    piecesPerBox: 15,
    yieldPerBox: 3.37,
    pricePerBox: 279.9,
    boxUnit: "pacotes",
  },
  {
    id: "euca",
    name: "Vinílico Eucafloor Basic",
    manufacturer: "Eucafloor",
    kind: "Vinílico",
    length: 122.9,
    width: 23.8,
    thickness: 2,
    piecesPerBox: 16,
    yieldPerBox: 4.68,
    pricePerBox: 259.9,
    boxUnit: "pacotes",
  },
  {
    id: "porcelanato-urban",
    name: "Porcelanato Urban 60×60",
    manufacturer: "Portobello",
    kind: "Porcelanato",
    length: 60,
    width: 60,
    thickness: 9,
    piecesPerBox: 4,
    yieldPerBox: 1.44,
    pricePerBox: 129.9,
    boxUnit: "caixas",
  },
];

export type CalcInput = {
  model: FloorModel;
  /** área útil em m² */
  area: number;
  /** perímetro em metros lineares (0 = estimado pela área) */
  perimeter: number;
  /** margem de perda/recortes em % */
  wastePct: number;
  /** incluir rodapé */
  includeBaseboard: boolean;
  /** comprimento da barra de rodapé em m */
  baseboardBar: number;
  /** peças de rodapé por tubo de cola PU */
  piecesPerTube: number;
};

export type CostRow = {
  name: string;
  /** quantidade comercial (arredondada para cima) */
  qty: number;
  /** quantidade exata calculada */
  exact: number;
  unit: string;
  formula: string;
};

export type CalcResult = {
  areaWithWaste: number;
  wasteArea: number;
  pieceArea: number;
  exactBoxes: number;
  boxes: number;
  pieces: number;
  purchasedArea: number;
  leftover: number;
  underlaymentArea: number;
  perimeterUsed: number;
  baseboardExact: number;
  baseboardBars: number;
  tubesExact: number;
  tubes: number;
  rows: CostRow[];
};

const ceil = (v: number) => Math.ceil(Number((v || 0).toFixed(6)));

export function calculate(input: CalcInput): CalcResult {
  const {
    model,
    area,
    wastePct,
    includeBaseboard,
    baseboardBar,
    piecesPerTube,
  } = input;

  const factor = 1 + wastePct / 100;
  const areaWithWaste = area * factor;
  const wasteArea = areaWithWaste - area;
  const pieceArea = (model.length * model.width) / 10000;

  const exactBoxes = model.yieldPerBox > 0 ? areaWithWaste / model.yieldPerBox : 0;
  const boxes = ceil(exactBoxes);
  const pieces = boxes * model.piecesPerBox;
  const purchasedArea = boxes * model.yieldPerBox;
  const leftover = purchasedArea - areaWithWaste;

  const underlaymentArea = model.requiresUnderlayment ? area : 0;

  const perimeterUsed = input.perimeter > 0 ? input.perimeter : 4 * Math.sqrt(Math.max(area, 0));
  const baseboardExact = includeBaseboard ? (area / 2.4) * 1.25 : 0;
  const baseboardBars = ceil(baseboardExact);
    const tubesExact = includeBaseboard && piecesPerTube > 0 ? baseboardExact / piecesPerTube : 0;
  const tubes = ceil(tubesExact);

  const rows: CostRow[] = [
    {
      name: `Piso ${model.name}`,
      qty: boxes,
      exact: exactBoxes,
      unit: model.boxUnit,
      formula: `${fmt(area)} m² × ${fmt(factor)} = ${fmt(areaWithWaste)} m² ÷ ${fmt(model.yieldPerBox)} m² = ${fmt(exactBoxes)} → ${boxes}`,
    },
    {
      name: "Peças de piso",
      qty: pieces,
      exact: pieces,
      unit: "peças",
      formula: `${boxes} ${model.boxUnit} × ${model.piecesPerBox} peças`,
    },
  ];

  if (model.requiresUnderlayment) {
    rows.push({
      name: "Manta / base de instalação",
      qty: ceil(underlaymentArea),
      exact: underlaymentArea,
      unit: "m²",
      formula: "igual à área do ambiente",
    });
  }

        if (model.includeLevelingCompound ?? true) {
    rows.push({
      name: "Massa autonivelante",
      qty: ceil(area / 5),
      exact: area / 5,
      unit: "sacos de 20 kg",
      formula: `${fmt(area)} m² ÷ 5 m² por saco = ${fmt(area / 5)} → ${ceil(area / 5)}`,
    });
  }
  if (model.includeLvtAdhesive ?? true) {
    rows.push({
      name: "Cola vinílica LVT",
      qty: ceil(area / 3.75),
      exact: area / 3.75,
      unit: "kg",
      formula: `${fmt(area)} m² ÷ 3,75 m²/kg = ${fmt(area / 3.75)} → ${ceil(area / 3.75)} kg`,
    });
  }
  if (model.includePreparationCompound ?? true) {
    rows.push({
      name: "Massa de preparação",
      qty: ceil(area / 8),
      exact: area / 8,
      unit: "sacos de 10 kg",
      formula: `${fmt(area)} m² ÷ 8 m² por saco = ${fmt(area / 8)} → ${ceil(area / 8)}`,
    });
  }
  if (model.includePlaniprep ?? true) {
    rows.push({
      name: "Massa Planiprep",
      qty: ceil(area / 8),
      exact: area / 8,
      unit: "sacos de 4 kg",
      formula: `${fmt(area)} m² ÷ 8 m² por saco = ${fmt(area / 8)} → ${ceil(area / 8)}`,
    });
  }

  if (includeBaseboard) {

    rows.push({
      name: `Rodapé (peças de ${fmt(baseboardBar)} m)`,
      qty: baseboardBars,
      exact: baseboardExact,
      unit: "peças",
      formula: `(${fmt(area)} m² ÷ 2,4) × 1,25 = ${fmt(baseboardExact)} → ${baseboardBars}`,
    });
    if (tubes > 0) {
      rows.push({
        name: "Cola PU 40 / Fixatudo",
        qty: tubes,
        exact: tubesExact,
        unit: "tubos",
                formula: `${fmt(baseboardExact)} barras ÷ ${fmt(piecesPerTube, 0)} por tubo = ${fmt(tubesExact)} → ${tubes}`,
      });
    }
  }

  return {
    areaWithWaste,
    wasteArea,
    pieceArea,
    exactBoxes,
    boxes,
    pieces,
    purchasedArea,
    leftover,
    underlaymentArea,
    perimeterUsed,
    baseboardExact,
    baseboardBars,
    tubesExact,
    tubes,
    rows,
  };
}

export function fmt(v: number, digits = 2) {
  return Number(v || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function brl(v: number) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
