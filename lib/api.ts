import { fetch } from './fetch';

let API_TOKEN = '';

const API_URL = 'https://bots.genix.space/api';
const BLACKLIST = '/blacklist';
const ADDUSER = '/blacklist/adduser';
const CHECKUSER = '/blacklist/checkuser';
const DELUSER = '/blacklist/deluser';

export const SUCCESS = 'success';
export const ERROR = 'error';

export interface Banned {
  date: string;
  id: number;
  message: string;
  reason: string;
}

export interface User {
  id: number;
  message: string;
  reason?: string;
  first_name: string;
  last_name?: string;
  username?: string;
}

export const setAPIToken = (token: string) => {
  API_TOKEN = token;
};

export function getBlacklist(): Promise<Banned[]> {
  return fetch(API_URL + BLACKLIST, { token: API_TOKEN });
}

export async function getById(uId: number): Promise<Banned | null> {
  const res = await fetch(API_URL + BLACKLIST, { token: API_TOKEN, id: uId });
  if (res?.result === 'error') return null;
  return res;
}

export async function addUser(data: any) {
  const res = await fetch(API_URL + ADDUSER, { token: API_TOKEN, ...data });
  return res?.result === 'added';
}

export async function checkUser(uId: number) {
  const res = await fetch(API_URL + CHECKUSER, { id: uId });
  return res?.result === 'success';
}

export async function rmUser(uId: number) {
  const res = await fetch(API_URL + DELUSER, { token: API_TOKEN, id: uId });
  return res?.result === 'deleted';
}
