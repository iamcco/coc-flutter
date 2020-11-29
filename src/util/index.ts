import { lineBreak } from './constant';

export const formatMessage = (text: string): string[] => text.trim().replace(/\s+/g, ' ').split(lineBreak);

export const reduceSpace = (text: string): string => text.trim().replace(/\s+/g, ' ');
