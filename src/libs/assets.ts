import { AssetsField, BoardGame } from "../types/assets";
import { isPosition } from "../utils/assets";

export const updaters: Record<
  AssetsField,
  (prev: BoardGame, value: string) => BoardGame
> = {
  編號: (prev, value) => ({ ...prev, id: parseInt(value) }),
  英文名稱: (prev, value) => ({
    ...prev,
    name: { ...prev.name, english: value },
  }),
  中文名稱: (prev, value) => ({
    ...prev,
    name: { ...prev.name, chinese: value },
  }),
  種類: (prev, value) => ({
    ...prev,
    type: value,
  }),
  借用: (prev, value) => ({
    ...prev,
    borrowed: value.toLowerCase() === "v",
  }),
  借用人: (prev, value) => ({
    ...prev,
    borrower: value,
  }),
  位置: (prev, value) => ({
    ...prev,
    position: isPosition(value) ? value : undefined,
  }),
  清點: (prev, value) => ({
    ...prev,
    type: value,
  }),
  "狀態(外膜)": (prev, value) => ({
    ...prev,
    status: {
      ...prev.status,
      shrinkWrap: value,
    },
  }),
  "狀態(外觀)": (prev, value) => ({
    ...prev,
    status: {
      ...prev.status,
      appearance: value,
    },
  }),
  "狀態(缺件)": (prev, value) => ({
    ...prev,
    status: {
      ...prev.status,
      missingParts: value,
    },
  }),
  "狀態(牌套)": (prev, value) => ({
    ...prev,
    status: {
      ...prev.status,
      sleeves: value,
    },
  }),
  清點備註: (prev, value) => ({
    ...prev,
    type: value,
  }),
};
