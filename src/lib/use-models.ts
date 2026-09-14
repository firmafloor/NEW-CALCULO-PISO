import { useCallback, useEffect, useState } from "react";
import { DEFAULT_MODELS, type FloorModel } from "./floor-calc";

const KEY = "calc-pisos:modelos-v1";
const REMOVED_KEY = "calc-pisos:removidos-v1";

export function useModels() {
  const [custom, setCustom] = useState<FloorModel[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCustom(JSON.parse(localStorage.getItem(KEY) || "[]"));
      setRemoved(JSON.parse(localStorage.getItem(REMOVED_KEY) || "[]"));
    } catch {
      /* ignora dados inválidos */
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: FloorModel[], nextRemoved: string[]) => {
    setCustom(next);
    setRemoved(nextRemoved);
    localStorage.setItem(KEY, JSON.stringify(next));
    localStorage.setItem(REMOVED_KEY, JSON.stringify(nextRemoved));
  }, []);

  const models: FloorModel[] = [
    ...DEFAULT_MODELS.filter((m) => !removed.includes(m.id)),
    ...custom,
  ];

  const saveModel = useCallback(
    (model: FloorModel) => {
      const exists = custom.some((m) => m.id === model.id);
      const next = exists
        ? custom.map((m) => (m.id === model.id ? model : m))
        : [...custom, model];
      // editar um modelo padrão cria uma cópia personalizada e oculta o original
      const isDefault = DEFAULT_MODELS.some((m) => m.id === model.id);
      persist(next, isDefault ? Array.from(new Set([...removed, model.id])) : removed);
    },
    [custom, removed, persist],
  );

  const deleteModel = useCallback(
    (id: string) => {
      persist(
        custom.filter((m) => m.id !== id),
        DEFAULT_MODELS.some((m) => m.id === id)
          ? Array.from(new Set([...removed, id]))
          : removed,
      );
    },
    [custom, removed, persist],
  );

  const restoreDefaults = useCallback(() => persist(custom, []), [custom, persist]);

  return { models, saveModel, deleteModel, restoreDefaults, ready };
}
