import {commands} from 'coc.nvim';
import { lineBreak } from './constant';

export const formatMessage = (text: string): string[] =>
  text
    .trim()
    .replace(/\s+/g, ' ')
    .split(lineBreak);

export const reduceSpace = (text: string): string => text.trim().replace(/\s+/g, ' ');

export const setCommandTitle = (id: string, desc: string) => {
  // FIXME: coc.nvim version v0.80.0 do not export titles
  (commands as any).titles.set(id, desc);
}

export const deleteCommandTitle = (id: string) => {
  // FIXME: coc.nvim version v0.80.0 do not export titles
  (commands as any).titles.delete(id);
}
