import { keywords } from "../libs/keywords";
export type Keyword = (typeof keywords)[number];

export type KeywordItem = {
  keyword: Keyword;
  menberOnly: boolean;
  permissionStrict: boolean;
  needAllow: boolean;
};

export type Nullable = "無";