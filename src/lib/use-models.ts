import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_MODELS, type FloorModel } from "./floor-calc";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type FloorModelRow = Tables<"floor_models">;

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
  custom: !row.is_default,
});

const toRow = (model: FloorModel): TablesInsert<"floor_models"> => ({
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
  is_deleted: false,
});

export function useModels() {
  const [models, setModels] = useState<FloorModel[]>([]);
  const [ready, setReady] = useState(false);

  const loadModels = useCallback(async () => {
    const { data, error } = await supabase
      .from("floor_models")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at");

    if (error) throw error;
    setModels((data ?? []).map(fromRow));
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
    const { error } = await supabase.from("floor_models").upsert(toRow(model));
    if (error) throw error;
    await loadModels();
  }, [loadModels]);

  const deleteModel = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("floor_models")
      .update({ is_deleted: true })
      .eq("id", id);
    if (error) throw error;
    await loadModels();
  }, [loadModels]);

  const restoreDefaults = useCallback(async () => {
    const defaults = DEFAULT_MODELS.map((model) => ({
      ...toRow(model),
      is_default: true,
    }));
    const { error } = await supabase.from("floor_models").upsert(defaults);
    if (error) throw error;
    await loadModels();
  }, [loadModels]);

  return { models, saveModel, deleteModel, restoreDefaults, ready };
}
