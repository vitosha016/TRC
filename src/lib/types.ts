export type BuffType = "Стройка" | "Исследования";

export interface Buff {
  id: string;
  nick: string;
  type: BuffType;
  buff: number;
  endAt: number;
  createdAt: number;
  applied: number;
  appliedCount: number;
  queueReceived: 0 | 1;
  queueLastAt: number;
}

export interface EnrichedBuff extends Buff {
  left: number;
  saving: number;
  score: number;
  queueFire: boolean;
}

export interface BuffHistory {
  id: string;
  recipient_id: string;
  recipient: string;
  type: BuffType;
  giver: string;
  percent: number;
  time: number;
}

export interface CopyTemplate {
  header_build: string;
  limit_build: number;
  header_research: string;
  limit_research: number;
  include_5: number;
  header_5: string;
}
