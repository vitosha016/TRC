import type { Buff, BuffHistory, CopyTemplate } from "./types";

let buffs: Buff[] = [];
let history: BuffHistory[] = [];
let givers: Record<string, { total: number; last_buff: number }> = {};
let template: CopyTemplate = {
  header_build: "#184 Стройка | {date}\r\n",
  limit_build: 15,
  header_research: "\r\n#173 Исследование\r\n",
  limit_research: 15,
  include_5: 0,
  header_5: "#186 Для ускорений стройки отдаём баффы 5%\r\n",
};

export function getBuffs(): Buff[] { return buffs; }
export function setBuffs(data: Buff[]): void { buffs = data; }
export function getHistory(): BuffHistory[] { return history; }
export function addHistory(entry: BuffHistory): void { history.push(entry); }

export function getGivers(): Record<string, { total: number; last_buff: number }> { return givers; }
export function addGiverStat(nick: string, ts: number): void {
  if (!givers[nick]) givers[nick] = { total: 0, last_buff: 0 };
  givers[nick].total++;
  givers[nick].last_buff = ts;
}

let nicks: string[] = [];

export function getNicks(): string[] { return nicks; }
export function addNick(nick: string): void { if (nick && !nicks.includes(nick)) nicks.push(nick); }
export function getTemplate(): CopyTemplate { return template; }
export function setTemplate(t: Partial<CopyTemplate>): CopyTemplate {
  template = { ...template, ...t };
  return template;
}
