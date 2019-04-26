import fetch from './fetch'

let API_TOKEN = ''

const API_URL = 'https://bots.genix.space/api'
const BLACKLIST = '/blacklist'
const ADDUSER = '/blacklist/adduser'
const CHECKUSER = '/blacklist/checkuser'
const DELUSER = '/blacklist/deluser'

export const SUCCESS = 'success'
export const ERROR = 'error'

export const setAPIToken = (token) => {
  API_TOKEN = token
}

export const getBlacklist = () =>
  fetch(
    API_URL + BLACKLIST,
    { token: API_TOKEN }
  ).catch(() => [])

export const getById = (uId) =>
  fetch(
    API_URL + BLACKLIST,
    { token: API_TOKEN, id: uId }
  ).catch(() => {})

export const addUser = (data) =>
  fetch(
    API_URL + ADDUSER,
    { token: API_TOKEN, ...data }
  )

export const checkUser = (uId) =>
  fetch(
    API_URL + CHECKUSER,
    { id: uId }
  )

export const rmUser = (uId) =>
  fetch(
    API_URL + DELUSER,
    { token: API_TOKEN, id: uId }
  )
