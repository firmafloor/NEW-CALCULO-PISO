import { useCallback, useEffect, useState } from "react";
import { db as supabase } from "@/lib/db";
import { DEFAULT_MODELS, type FloorModel } from "./floor-calc";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;
import { useAuth } from "./auth-state";

type FloorModelRow = AnyRow;

const fromRow = (row: FloorModelRow): FloorModel => ({
  id: row.id,
  name: row.name,
  manufacturer: row.manufacturer,
  kind: row.kind,
  length: row.length,
  width: row.width,
  thickness: row.thickness,
  piecesPerBox: row.pieces_per_box,
  yieldPerBox: row.yield_per_box,
  pricePerBox: row.price_per_box,
  boxUnit: row.box_unit,
    requiresUnderlayment: row.requires_underlayment,
  includeLevelingCompound: row.include_leveling_compound,
  includeLvtAdhesive: row.include_lvt_adhesive,
  includePreparationCompound: row.include_preparation_compound,
  includePlaniprep: row.include_planiprep,
  custom: !row.is_default,
});

const toRow = (model: FloorModel): AnyRow => ({
  id: model.id,
  name: model.name,
  manufacturer: model.manufacturer,
  kind: model.kind,
  length: model.length,
  width: model.width,
  thickness: model.thickness,
  pieces_per_box: model.piecesPerBox,
  yield_per_box: model.yieldPerBox,
  price_per_box: model.pricePerBox,
  box_unit: model.boxUnit,
    requires_underlayment: model.requiresUnderlayment ?? false,
  include_leveling_compound: model.includeLevelingCompound ?? true,
  include_lvt_adhesive: model.includeLvtAdhesive ?? true,
  include_preparation_compound: model.includePreparationCompound ?? true,
  include_planiprep: model.includePlaniprep ?? true,
  is_deleted: false,
});

export function useModels() {
  const { isAdmin } = useAuth();
  const [models, setModels] = useState<FloorModel[]>([]);
  const [ready, setReady] = useState(false);

  const loadModels = useCallback(async () => {
    const { data, error } = await supabase
      .from("floor_models")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at");

    if (error) throw error;
        setModels(
      (data ?? [])
        .map(fromRow)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })),
    );
  }, []);

  useEffect(() => {
    let active = true;
    loadModels()
      .catch((error) => console.error("Não foi possível carregar os modelos.", error))
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [loadModels]);

  const saveModel = useCallback(async (model: FloorModel) => {
    if (!isAdmin) throw new Error("Apenas administradores podem alterar modelos.");
    const { error } = await supabase.from("floor_models").upsert(toRow(model));
    if (error) throw error;
    await loadModels();
  }, [isAdmin, loadModels]);

  const deleteModel = useCallback(async (id: string) => {
    if (!isAdmin) throw new Error("Apenas administradores podem excluir modelos.");
    const { error } = await supabase
      .from("floor_models")
      .update({ is_deleted: true })
      .eq("id", id);
    if (error) throw error;
    await loadModels();
  }, [isAdmin, loadModels]);

  const restoreDefaults = useCallback(async () => {
    if (!isAdmin) throw new Error("Apenas administradores podem restaurar modelos.");
    const defaults = DEFAULT_MODELS.map((model) => ({
      ...toRow(model),
      is_default: true,
    }));
    const { error } = await supabase.from("floor_models").upsert(defaults);
    if (error) throw error;
    await loadModels();
  }, [isAdmin, loadModels]);

  return { models, saveModel, deleteModel, restoreDefaults, ready };
}
