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

export function getById(uId: number) {
  return fetch(API_URL + BLACKLIST, { token: API_TOKEN, id: uId  });
}

export function addUser (data: any) {
  return fetch(API_URL + ADDUSER, { token: API_TOKEN, ...data });
}

export function checkUser (uId: number) {
  return fetch(API_URL + CHECKUSER, { id: uId });
}

export function rmUser (uId: number) {
  return fetch(API_URL + DELUSER, { token: API_TOKEN, id: uId });
}
