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
  /** perímetro para rodapé em m (0 = estimado) */
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
  /** mão de obra por m² */
  laborRate: number;
};

export type CostRow = {
  name: string;
  qty: number;
  unit: string;
  formula: string;
  unitPrice: number;
  total: number;
};

export type CalcResult = {
  areaWithWaste: number;
  wasteArea: number;
  pieceArea: number;
  boxes: number;
  pieces: number;
  exactBoxes: number;
  leftover: number;
  mortarBags: number;
  groutKg: number;
  groutPacks: number;
  baseboardBars: number;
  perimeterUsed: number;
  rows: CostRow[];
  materialsTotal: number;
  laborTotal: number;
  grandTotal: number;
  costPerSqm: number;
};

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
    laborRate,
  } = input;

  const factor = 1 + wastePct / 100;
  const areaWithWaste = area * factor;
  const wasteArea = areaWithWaste - area;
  const pieceArea = (model.length * model.width) / 10000;

  const exactBoxes = model.yieldPerBox > 0 ? areaWithWaste / model.yieldPerBox : 0;
  const boxes = Math.ceil(exactBoxes - 1e-9);
  const pieces = boxes * model.piecesPerBox;
  const leftover = boxes * model.yieldPerBox - areaWithWaste;

  const mortarKg = areaWithWaste * mortarRate;
  const mortarBags = mortarBag > 0 ? Math.ceil(mortarKg / mortarBag - 1e-9) : 0;

  // consumo de rejunte (kg/m²) = ((C+L) / (C×L)) × E × J × 1,6
  const groutRate =
    model.length > 0 && model.width > 0
      ? ((model.length + model.width) / (model.length * model.width)) *
        (model.thickness / 10) *
        (groutJoint / 10) *
        1.6
      : 0;
  const groutKg = groutRate * areaWithWaste;
  const groutPacks = groutPack > 0 && groutKg > 0 ? Math.ceil(groutKg / groutPack - 1e-9) : 0;

  const perimeterUsed = input.perimeter > 0 ? input.perimeter : 4 * Math.sqrt(Math.max(area, 0));
  const baseboardBars =
    includeBaseboard && baseboardBar > 0
      ? Math.ceil((perimeterUsed * 1.1) / baseboardBar - 1e-9)
      : 0;

  const rows: CostRow[] = [
    {
      name: `Piso ${model.name}`,
      qty: boxes,
      unit: model.boxUnit,
      formula: `${fmt(area)} m² × ${fmt(factor)} ÷ ${fmt(model.yieldPerBox)} m² = ${fmt(exactBoxes)} → arredondado`,
      unitPrice: model.pricePerBox,
      total: boxes * model.pricePerBox,
    },
    {
      name: "Peças de piso",
      qty: pieces,
      unit: "peças",
      formula: `${boxes} ${model.boxUnit} × ${model.piecesPerBox} peças/caixa`,
      unitPrice: 0,
      total: 0,
    },
    {
      name: `Argamassa / cola (${mortarBag} kg)`,
      qty: mortarBags,
      unit: "sacos",
      formula: `${fmt(areaWithWaste)} m² × ${fmt(mortarRate)} kg/m² ÷ ${mortarBag} kg`,
      unitPrice: mortarPrice,
      total: mortarBags * mortarPrice,
    },
  ];

  if (groutPacks > 0) {
    rows.push({
      name: `Rejunte (${groutPack} kg)`,
      qty: groutPacks,
      unit: "embalagens",
      formula: `consumo ${fmt(groutRate)} kg/m² × ${fmt(areaWithWaste)} m² = ${fmt(groutKg)} kg`,
      unitPrice: groutPrice,
      total: groutPacks * groutPrice,
    });
  }

  if (includeBaseboard) {
    rows.push({
      name: `Rodapé (barras de ${fmt(baseboardBar)} m)`,
      qty: baseboardBars,
      unit: "barras",
      formula: `${fmt(perimeterUsed)} m de perímetro × 1,10 ÷ ${fmt(baseboardBar)} m`,
      unitPrice: baseboardPrice,
      total: baseboardBars * baseboardPrice,
    });
  }

  const materialsTotal = rows.reduce((s, r) => s + r.total, 0);
  const laborTotal = laborRate * area;
  const grandTotal = materialsTotal + laborTotal;

  return {
    areaWithWaste,
    wasteArea,
    pieceArea,
    boxes,
    pieces,
    exactBoxes,
    leftover,
    mortarBags,
    groutKg,
    groutPacks,
    baseboardBars,
    perimeterUsed,
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
