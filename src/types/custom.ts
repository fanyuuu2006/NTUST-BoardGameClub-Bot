import { keywordItems } from '../libs/keywords';
export type KeywordItem = (typeof keywordItems)[number];
export type Keyword = KeywordItem["keyword"];
export type Nullable = "無";
