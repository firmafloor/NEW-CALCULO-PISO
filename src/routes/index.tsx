import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  brl,
  calculate,
  fmt,
  type CalcInput,
  type FloorModel,
} from "@/lib/floor-calc";
import { useModels } from "@/lib/use-models";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Calculadora de Pisos e Revestimentos | Orçamento com perdas" },
      {
        name: "description",
        content:
          "Calcule área com perda, caixas e peças fechadas, argamassa, rejunte, rodapé e o custo total da obra. Cadastre seus modelos e exporte o orçamento.",
      },
      { property: "og:title", content: "Calculadora de Pisos e Revestimentos" },
      {
        property: "og:description",
        content:
          "Área com perda configurável, caixas arredondadas para cima, insumos e resumo de custos pronto para imprimir.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Calculadora,
});

const WASTE_PRESETS = [
  { value: 5, label: "5% — alinhamento simples" },
  { value: 10, label: "10% — padrão" },
  { value: 15, label: "15% — diagonal / espinha de peixe" },
];

const emptyForm = {
  name: "",
  manufacturer: "",
  kind: "Porcelanato",
  length: "60",
  width: "60",
  thickness: "9",
  piecesPerBox: "4",
  yieldPerBox: "1.44",
  pricePerBox: "0",
  boxUnit: "caixas",
};

function Calculadora() {
  const { models, saveModel, deleteModel, restoreDefaults, ready } = useModels();
  const [modelId, setModelId] = useState("porcelanato-urban");

  const [areaMode, setAreaMode] = useState<"area" | "dims">("area");
  const [area, setArea] = useState("20");
  const [roomW, setRoomW] = useState("4");
  const [roomL, setRoomL] = useState("5");

  const [wastePct, setWastePct] = useState(10);
  const [customWaste, setCustomWaste] = useState(false);

  const [perimeterMode, setPerimeterMode] = useState<"auto" | "manual">("auto");
  const [perimeter, setPerimeter] = useState("");

  const [groutJoint, setGroutJoint] = useState("3");
  const [mortarRate, setMortarRate] = useState("5");
  const [mortarBag, setMortarBag] = useState("20");
  const [mortarPrice, setMortarPrice] = useState("32");
  const [groutPack, setGroutPack] = useState("1");
  const [groutPrice, setGroutPrice] = useState("18");

  const [includeBaseboard, setIncludeBaseboard] = useState(true);
  const [baseboardBar, setBaseboardBar] = useState("2.4");
  const [baseboardPrice, setBaseboardPrice] = useState("45");
  const [piecesPerTube, setPiecesPerTube] = useState("5");
  const [tubePrice, setTubePrice] = useState("39");
  const [laborRate, setLaborRate] = useState("55");

  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (ready && models.length && !models.some((m) => m.id === modelId)) {
      setModelId(models[0]!.id);
    }
  }, [ready, models, modelId]);

  const model = models.find((m) => m.id === modelId);

  const num = (v: string) => {
    const parsed = Number(String(v).replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const areaValue =
    areaMode === "dims" ? num(roomW) * num(roomL) : num(area);
  const autoPerimeter =
    areaMode === "dims"
      ? 2 * (num(roomW) + num(roomL))
      : 4 * Math.sqrt(Math.max(areaValue, 0));

  useEffect(() => {
    if (perimeterMode === "auto") setPerimeter(autoPerimeter ? autoPerimeter.toFixed(2) : "");
  }, [perimeterMode, autoPerimeter]);

  const result = useMemo(() => {
    if (!model || areaValue <= 0) return null;
    const input: CalcInput = {
      model,
      area: areaValue,
      perimeter: num(perimeter),
      wastePct,
      groutJoint: num(groutJoint),
      mortarRate: num(mortarRate),
      mortarBag: num(mortarBag),
      mortarPrice: num(mortarPrice),
      groutPack: num(groutPack),
      groutPrice: num(groutPrice),
      includeBaseboard,
      baseboardBar: num(baseboardBar),
      baseboardPrice: num(baseboardPrice),
      piecesPerTube: num(piecesPerTube),
      tubePrice: num(tubePrice),
      laborRate: num(laborRate),
    };
    return calculate(input);
  }, [
    model,
    areaValue,
    perimeter,
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
  ]);

  function exportCsv() {
    if (!result || !model) return;
    const lines = [
      ["Orçamento de pisos e revestimentos"],
      ["Modelo", model.name],
      ["Área útil (m²)", fmt(areaValue)],
      ["Margem de perda (%)", String(wastePct)],
      ["Área com perda (m²)", fmt(result.areaWithWaste)],
      ["m² faturados", fmt(result.purchasedArea)],
      ["Sobra técnica (m²)", fmt(result.leftover)],
      [],
      ["Material", "Qtd exata", "Qtd comercial", "Unidade", "Preço unit.", "Total", "Cálculo"],
      ...result.rows.map((r) => [
        r.name,
        fmt(r.exact),
        String(r.qty),
        r.unit,
        fmt(r.unitPrice),
        fmt(r.total),
        r.formula,
      ]),
      [],
      ["Materiais", fmt(result.materialsTotal)],
      ["Mão de obra", fmt(result.laborTotal)],
      ["Total", fmt(result.grandTotal)],
    ];
    const csv = lines
      .map((l) => l.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "orcamento-pisos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function submitModel() {
    const parsed: FloorModel = {
      id: editingId ?? `custom-${Date.now()}`,
      name: form.name.trim(),
      manufacturer: form.manufacturer.trim(),
      kind: form.kind.trim() || "Piso",
      length: num(form.length),
      width: num(form.width),
      thickness: num(form.thickness),
      piecesPerBox: Math.max(1, Math.round(num(form.piecesPerBox))),
      yieldPerBox: num(form.yieldPerBox),
      pricePerBox: num(form.pricePerBox),
      boxUnit: form.boxUnit || "caixas",
      custom: true,
    };
    if (!parsed.name || parsed.yieldPerBox <= 0) {
      setStatus("Informe ao menos o nome do modelo e o rendimento por caixa.");
      return;
    }
    saveModel(parsed);
    setModelId(parsed.id);
    setStatus(editingId ? "Modelo atualizado." : "Modelo cadastrado com sucesso.");
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(m: FloorModel) {
    setShowRegister(true);
    setEditingId(m.id);
    setForm({
      name: m.name,
      manufacturer: m.manufacturer,
      kind: m.kind,
      length: String(m.length),
      width: String(m.width),
      thickness: String(m.thickness),
      piecesPerBox: String(m.piecesPerBox),
      yieldPerBox: String(m.yieldPerBox),
      pricePerBox: String(m.pricePerBox),
      boxUnit: m.boxUnit,
    });
    setStatus("Edite os dados e salve as alterações.");
  }

  const autoYield =
    num(form.length) > 0 && num(form.width) > 0 && num(form.piecesPerBox) > 0
      ? ((num(form.length) * num(form.width)) / 10000) * num(form.piecesPerBox)
      : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">
            Obra mais previsível
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
            Calculadora de pisos e revestimentos
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            Converta a área do ambiente em uma lista de compra fechada: caixas e peças inteiras,
            argamassa, rejunte, rodapé e custo total — com perdas e recortes transparentes.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:items-start">
          {/* ENTRADAS */}
          <section className="rounded-2xl border border-border bg-card p-6 print:hidden">
            <h2 className="text-xl font-bold tracking-tight">1. Ambiente e material</h2>

            <Field label="Modelo do piso">
              <select
                className="input"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>

            {model && (
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-muted p-3 text-xs">
                <Spec label="Dimensões" value={`${fmt(model.length)} × ${fmt(model.width)} cm`} />
                <Spec label="Rendimento" value={`${fmt(model.yieldPerBox)} m²/${model.boxUnit.replace(/s$/, "")}`} />
                <Spec label="Peças" value={`${model.piecesPerBox} / ${model.boxUnit.replace(/s$/, "")}`} />
                <Spec label="Preço" value={brl(model.pricePerBox)} />
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <Toggle active={areaMode === "area"} onClick={() => setAreaMode("area")}>
                Informar área
              </Toggle>
              <Toggle active={areaMode === "dims"} onClick={() => setAreaMode("dims")}>
                Largura × comprimento
              </Toggle>
            </div>

            {areaMode === "area" ? (
              <Field label="Área útil (m²)" help="Sem incluir a margem de perda.">
                <input className="input" type="number" min="0" step="0.01" value={area} onChange={(e) => setArea(e.target.value)} />
              </Field>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Largura (m)">
                  <input className="input" type="number" min="0" step="0.01" value={roomW} onChange={(e) => setRoomW(e.target.value)} />
                </Field>
                <Field label="Comprimento (m)">
                  <input className="input" type="number" min="0" step="0.01" value={roomL} onChange={(e) => setRoomL(e.target.value)} />
                </Field>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Área considerada: <strong>{fmt(areaValue)} m²</strong>
            </p>

            <Field label="Margem de perda e recortes">
              <div className="flex flex-wrap gap-2">
                {WASTE_PRESETS.map((p) => (
                  <Toggle
                    key={p.value}
                    active={!customWaste && wastePct === p.value}
                    onClick={() => {
                      setCustomWaste(false);
                      setWastePct(p.value);
                    }}
                  >
                    {p.label}
                  </Toggle>
                ))}
                <Toggle active={customWaste} onClick={() => setCustomWaste(true)}>
                  Personalizado
                </Toggle>
              </div>
              {customWaste && (
                <input
                  className="input mt-2"
                  type="number"
                  min="0"
                  max="60"
                  step="0.5"
                  value={wastePct}
                  onChange={(e) => setWastePct(num(e.target.value))}
                />
              )}
            </Field>

            <h3 className="mt-6 text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
              Perímetro e rodapé
            </h3>
            <div className="mt-2 flex gap-2">
              <Toggle active={perimeterMode === "auto"} onClick={() => setPerimeterMode("auto")}>
                Estimar
              </Toggle>
              <Toggle active={perimeterMode === "manual"} onClick={() => setPerimeterMode("manual")}>
                Informar real
              </Toggle>
            </div>
            <Field label="Perímetro (m lineares)" help="Descontos de portas podem ser ajustados manualmente.">
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={perimeter}
                onChange={(e) => {
                  setPerimeterMode("manual");
                  setPerimeter(e.target.value);
                }}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={includeBaseboard}
                onChange={(e) => setIncludeBaseboard(e.target.checked)}
              />
              Incluir rodapé e cola PU
            </label>
            {includeBaseboard && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Barra de rodapé (m)">
                  <input className="input" type="number" step="0.01" value={baseboardBar} onChange={(e) => setBaseboardBar(e.target.value)} />
                </Field>
                <Field label="Preço da barra (R$)">
                  <input className="input" type="number" step="0.01" value={baseboardPrice} onChange={(e) => setBaseboardPrice(e.target.value)} />
                </Field>
                <Field label="Barras por tubo PU">
                  <input className="input" type="number" step="1" value={piecesPerTube} onChange={(e) => setPiecesPerTube(e.target.value)} />
                </Field>
                <Field label="Preço do tubo (R$)">
                  <input className="input" type="number" step="0.01" value={tubePrice} onChange={(e) => setTubePrice(e.target.value)} />
                </Field>
              </div>
            )}

            <h3 className="mt-6 text-sm font-extrabold uppercase tracking-wide text-muted-foreground">
              Insumos
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Argamassa (kg/m²)">
                <input className="input" type="number" step="0.1" value={mortarRate} onChange={(e) => setMortarRate(e.target.value)} />
              </Field>
              <Field label="Saco (kg)">
                <input className="input" type="number" step="1" value={mortarBag} onChange={(e) => setMortarBag(e.target.value)} />
              </Field>
              <Field label="Preço do saco (R$)">
                <input className="input" type="number" step="0.01" value={mortarPrice} onChange={(e) => setMortarPrice(e.target.value)} />
              </Field>
              <Field label="Junta (mm)">
                <input className="input" type="number" step="0.5" value={groutJoint} onChange={(e) => setGroutJoint(e.target.value)} />
              </Field>
              <Field label="Rejunte — embalagem (kg)">
                <input className="input" type="number" step="0.5" value={groutPack} onChange={(e) => setGroutPack(e.target.value)} />
              </Field>
              <Field label="Preço do rejunte (R$)">
                <input className="input" type="number" step="0.01" value={groutPrice} onChange={(e) => setGroutPrice(e.target.value)} />
              </Field>
              <Field label="Mão de obra (R$/m²)">
                <input className="input" type="number" step="0.01" value={laborRate} onChange={(e) => setLaborRate(e.target.value)} />
              </Field>
            </div>
          </section>

          {/* RESULTADO */}
          <section className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold tracking-tight">2. Resultado detalhado</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {model && result
                      ? `${model.name} • ${fmt(areaValue)} m² úteis • perda de ${fmt(wastePct, 0)}%`
                      : "Informe uma área maior que zero para calcular."}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2 print:hidden">
                  <button className="ghost" onClick={() => window.print()}>Imprimir</button>
                  <button className="ghost" onClick={exportCsv}>Exportar CSV</button>
                </div>
              </div>

              {result && model && (
                <>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Metric value={`${fmt(result.areaWithWaste)} m²`} label="Área com perda" hint={`+ ${fmt(result.wasteArea)} m² de recortes`} />
                    <Metric value={`${result.boxes}`} label={`${model.boxUnit} a comprar`} hint={`exato: ${fmt(result.exactBoxes)}`} highlight />
                    <Metric value={`${result.pieces}`} label="peças inteiras" hint={`${model.piecesPerBox} por ${model.boxUnit.replace(/s$/, "")}`} />
                    <Metric value={`${fmt(result.purchasedArea)} m²`} label="m² faturados" hint={`sobra técnica: ${fmt(result.leftover)} m²`} />
                  </div>

                  <h3 className="mt-8 text-base font-bold">Lista de materiais</h3>
                  <div className="mt-3 overflow-x-auto rounded-xl border border-border">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="p-3">Material</th>
                          <th className="p-3">Exato</th>
                          <th className="p-3">Comprar</th>
                          <th className="p-3">Unidade</th>
                          <th className="p-3">Como foi calculado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.map((r) => (
                          <tr key={r.name} className="border-t border-border align-top">
                            <td className="p-3 font-semibold">{r.name}</td>
                            <td className="p-3 text-muted-foreground">{fmt(r.exact)}</td>
                            <td className="p-3 font-black text-primary">{r.qty}</td>
                            <td className="p-3">{r.unit}</td>
                            <td className="p-3 text-xs text-muted-foreground">{r.formula}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h3 className="mt-8 text-base font-bold">Resumo de custos</h3>
                  <div className="mt-3 overflow-x-auto rounded-xl border border-border">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="p-3">Item</th>
                          <th className="p-3">Qtd.</th>
                          <th className="p-3">Preço unit.</th>
                          <th className="p-3">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows
                          .filter((r) => r.unitPrice > 0)
                          .map((r) => (
                            <tr key={r.name} className="border-t border-border">
                              <td className="p-3">{r.name}</td>
                              <td className="p-3">{r.qty} {r.unit}</td>
                              <td className="p-3">{brl(r.unitPrice)}</td>
                              <td className="p-3 font-semibold">{brl(r.total)}</td>
                            </tr>
                          ))}
                        <tr className="border-t border-border">
                          <td className="p-3">Mão de obra</td>
                          <td className="p-3">{fmt(areaValue)} m²</td>
                          <td className="p-3">{brl(num(laborRate))}</td>
                          <td className="p-3 font-semibold">{brl(result.laborTotal)}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-primary/40 bg-muted">
                          <td className="p-3 font-black" colSpan={3}>
                            Total do orçamento
                          </td>
                          <td className="p-3 text-lg font-black text-primary">{brl(result.grandTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Materiais {brl(result.materialsTotal)} + mão de obra {brl(result.laborTotal)} ={" "}
                    {brl(result.costPerSqm)} por m² de área útil. Consumo de rejunte estimado em{" "}
                    {fmt(result.groutRate, 3)} kg/m² ({fmt(result.groutKg)} kg no total).
                  </p>
                </>
              )}
            </div>

            {/* CATÁLOGO */}
            <div className="rounded-2xl border border-border bg-card p-6 print:hidden">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                <h2 className="min-w-0 text-xl font-bold tracking-tight">Catálogo de modelos</h2>
                <button className="primary shrink-0" onClick={() => setShowRegister((v) => !v)}>
                  {showRegister ? "Fechar cadastro" : "Cadastrar modelo"}
                </button>
              </div>

              {showRegister && (
                <div className="mt-5 rounded-xl border border-border p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Modelo"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Porcelanato Urban" /></Field>
                    <Field label="Fabricante"><input className="input" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></Field>
                    <Field label="Tipo"><input className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} /></Field>
                    <Field label="Unidade de venda"><input className="input" value={form.boxUnit} onChange={(e) => setForm({ ...form, boxUnit: e.target.value })} /></Field>
                    <Field label="Comprimento da peça (cm)"><input className="input" type="number" step="0.1" value={form.length} onChange={(e) => setForm({ ...form, length: e.target.value })} /></Field>
                    <Field label="Largura da peça (cm)"><input className="input" type="number" step="0.1" value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} /></Field>
                    <Field label="Espessura (mm)"><input className="input" type="number" step="0.1" value={form.thickness} onChange={(e) => setForm({ ...form, thickness: e.target.value })} /></Field>
                    <Field label="Peças por caixa"><input className="input" type="number" step="1" value={form.piecesPerBox} onChange={(e) => setForm({ ...form, piecesPerBox: e.target.value })} /></Field>
                    <Field
                      label="Rendimento por caixa (m²)"
                      help={autoYield > 0 ? `Pelas dimensões: ${fmt(autoYield)} m²` : undefined}
                    >
                      <input className="input" type="number" step="0.01" value={form.yieldPerBox} onChange={(e) => setForm({ ...form, yieldPerBox: e.target.value })} />
                    </Field>
                    <Field label="Preço por caixa (R$)"><input className="input" type="number" step="0.01" value={form.pricePerBox} onChange={(e) => setForm({ ...form, pricePerBox: e.target.value })} /></Field>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="primary" onClick={submitModel}>
                      {editingId ? "Salvar alterações" : "Cadastrar modelo"}
                    </button>
                    {autoYield > 0 && (
                      <button
                        className="ghost"
                        onClick={() => setForm({ ...form, yieldPerBox: autoYield.toFixed(2) })}
                      >
                        Usar rendimento calculado
                      </button>
                    )}
                    <button className="ghost" onClick={() => { setForm(emptyForm); setEditingId(null); setStatus(""); }}>
                      Limpar
                    </button>
                  </div>
                  {status && <p className="mt-2 text-sm font-semibold text-primary">{status}</p>}
                </div>
              )}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {models.map((m) => (
                  <div key={m.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold">{m.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.manufacturer} • {m.kind} • {fmt(m.length)}×{fmt(m.width)} cm
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                        {brl(m.pricePerBox)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {fmt(m.yieldPerBox)} m² por {m.boxUnit.replace(/s$/, "")} • {m.piecesPerBox} peças
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button className="ghost" onClick={() => startEdit(m)}>Alterar</button>
                      <button
                        className="ghost"
                        onClick={() => {
                          if (confirm(`Excluir o modelo "${m.name}"?`)) deleteModel(m.id);
                        }}
                      >
                        Excluir
                      </button>
                      <button className="ghost" onClick={() => setModelId(m.id)}>Usar</button>
                    </div>
                  </div>
                ))}
              </div>
              <button className="ghost mt-4" onClick={restoreDefaults}>
                Restaurar modelos padrão
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Este cálculo é uma estimativa de compra. A conferência final deve considerar paginação,
              recortes, vãos, prumo e as recomendações do fabricante.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide">{label}</label>
      {children}
      {help && <p className="mt-1 text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background p-2">
      <span className="block text-[11px] text-muted-foreground">{label}</span>
      <b>{value}</b>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/50"
      }`}
    >
      {children}
    </button>
  );
}

function Metric({
  value,
  label,
  hint,
  highlight,
}: {
  value: string;
  label: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? "bg-primary/10" : "bg-muted"}`}>
      <b className="block text-2xl font-black leading-tight text-primary">{value}</b>
      <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
