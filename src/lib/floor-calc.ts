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
  /** junta de assentamento em mm */
  groutJoint: number;
  /** consumo de argamassa kg/m² */
  mortarRate: number;
  /** peso do saco de argamassa em kg */
  mortarBag: number;
  /** preço do saco de argamassa */
  mortarPrice: number;
  /** peso da embalagem de rejunte em kg */
  groutPack: number;
  /** preço da embalagem de rejunte */
  groutPrice: number;
  /** incluir rodapé */
  includeBaseboard: boolean;
  /** comprimento da barra de rodapé em m */
  baseboardBar: number;
  /** preço da barra de rodapé */
  baseboardPrice: number;
  /** peças de rodapé por tubo de cola PU */
  piecesPerTube: number;
  /** preço do tubo de cola PU */
  tubePrice: number;
  /** mão de obra por m² */
  laborRate: number;
};

export type CostRow = {
  name: string;
  /** quantidade comercial (arredondada para cima) */
  qty: number;
  /** quantidade exata calculada */
  exact: number;
  unit: string;
  formula: string;
  unitPrice: number;
  total: number;
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
  mortarKg: number;
  mortarExact: number;
  mortarBags: number;
  groutRate: number;
  groutKg: number;
  groutExact: number;
  groutPacks: number;
  perimeterUsed: number;
  baseboardExact: number;
  baseboardBars: number;
  tubesExact: number;
  tubes: number;
  rows: CostRow[];
  materialsTotal: number;
  laborTotal: number;
  grandTotal: number;
  costPerSqm: number;
};

const ceil = (v: number) => Math.ceil(Number((v || 0).toFixed(6)));

export function calculate(input: CalcInput): CalcResult {
  const {
    model,
    area,
    wastePct,
    groutJoint,
    mortarRate,
    mortarBag,
    mortarPrice,
    groutPack,
    groutPrice,
    includeBaseboard,
    baseboardBar,
    baseboardPrice,
    piecesPerTube,
    tubePrice,
    laborRate,
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

  const mortarKg = areaWithWaste * mortarRate;
  const mortarExact = mortarBag > 0 ? mortarKg / mortarBag : 0;
  const mortarBags = ceil(mortarExact);

  // consumo de rejunte (kg/m²) = ((C+L) / (C×L)) × espessura(cm) × junta(mm) × 1,6
  const groutRate =
    model.length > 0 && model.width > 0
      ? ((model.length + model.width) / (model.length * model.width)) *
        (model.thickness / 10) *
        groutJoint *
        1.6
      : 0;
  const groutKg = groutRate * areaWithWaste;
  const groutExact = groutPack > 0 ? groutKg / groutPack : 0;
  const groutPacks = groutKg > 0 ? ceil(groutExact) : 0;

  const perimeterUsed = input.perimeter > 0 ? input.perimeter : 4 * Math.sqrt(Math.max(area, 0));
  const baseboardExact =
    includeBaseboard && baseboardBar > 0 ? (perimeterUsed * 1.1) / baseboardBar : 0;
  const baseboardBars = ceil(baseboardExact);
  const tubesExact = includeBaseboard && piecesPerTube > 0 ? baseboardBars / piecesPerTube : 0;
  const tubes = ceil(tubesExact);

  const rows: CostRow[] = [
    {
      name: `Piso ${model.name}`,
      qty: boxes,
      exact: exactBoxes,
      unit: model.boxUnit,
      formula: `${fmt(area)} m² × ${fmt(factor)} = ${fmt(areaWithWaste)} m² ÷ ${fmt(model.yieldPerBox)} m² = ${fmt(exactBoxes)} → ${boxes}`,
      unitPrice: model.pricePerBox,
      total: boxes * model.pricePerBox,
    },
    {
      name: "Peças de piso",
      qty: pieces,
      exact: pieces,
      unit: "peças",
      formula: `${boxes} ${model.boxUnit} × ${model.piecesPerBox} peças`,
      unitPrice: 0,
      total: 0,
    },
    {
      name: `Argamassa / cola (saco ${fmt(mortarBag, 0)} kg)`,
      qty: mortarBags,
      exact: mortarExact,
      unit: "sacos",
      formula: `${fmt(areaWithWaste)} m² × ${fmt(mortarRate)} kg/m² = ${fmt(mortarKg)} kg ÷ ${fmt(mortarBag, 0)} kg = ${fmt(mortarExact)} → ${mortarBags}`,
      unitPrice: mortarPrice,
      total: mortarBags * mortarPrice,
    },
  ];

  if (groutPacks > 0) {
    rows.push({
      name: `Rejunte / nivelante (${fmt(groutPack, 0)} kg)`,
      qty: groutPacks,
      exact: groutExact,
      unit: "embalagens",
      formula: `consumo ${fmt(groutRate, 3)} kg/m² × ${fmt(areaWithWaste)} m² = ${fmt(groutKg)} kg ÷ ${fmt(groutPack, 0)} kg = ${fmt(groutExact)} → ${groutPacks}`,
      unitPrice: groutPrice,
      total: groutPacks * groutPrice,
    });
  }

  if (includeBaseboard) {
    rows.push({
      name: `Rodapé (barras de ${fmt(baseboardBar)} m)`,
      qty: baseboardBars,
      exact: baseboardExact,
      unit: "barras",
      formula: `(${fmt(perimeterUsed)} m × 1,10) ÷ ${fmt(baseboardBar)} m = ${fmt(baseboardExact)} → ${baseboardBars}`,
      unitPrice: baseboardPrice,
      total: baseboardBars * baseboardPrice,
    });
    if (tubes > 0) {
      rows.push({
        name: "Cola PU 40 / Fixatudo",
        qty: tubes,
        exact: tubesExact,
        unit: "tubos",
        formula: `${baseboardBars} barras ÷ ${fmt(piecesPerTube, 0)} por tubo = ${fmt(tubesExact)} → ${tubes}`,
        unitPrice: tubePrice,
        total: tubes * tubePrice,
      });
    }
  }

  const materialsTotal = rows.reduce((s, r) => s + r.total, 0);
  const laborTotal = laborRate * area;
  const grandTotal = materialsTotal + laborTotal;

  return {
    areaWithWaste,
    wasteArea,
    pieceArea,
    exactBoxes,
    boxes,
    pieces,
    purchasedArea,
    leftover,
    mortarKg,
    mortarExact,
    mortarBags,
    groutRate,
    groutKg,
    groutExact,
    groutPacks,
    perimeterUsed,
    baseboardExact,
    baseboardBars,
    tubesExact,
    tubes,
    rows,
    materialsTotal,
    laborTotal,
    grandTotal,
    costPerSqm: area > 0 ? grandTotal / area : 0,
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
