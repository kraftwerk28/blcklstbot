import fetch from './fetch'

let API_TOKEN = ''

const API_URL = 'https://bots.genix.space/api'
const BLACKLIST = '/blacklist'
const ADD_USER = '/blacklist/adduser' 

export const setAPIToken = (token) => {
  API_TOKEN = token
}

export const addToBlacklist = () =>
  fetch(
    API_URL + ADD_USER,
    null,
    { token: API_TOKEN }
  )

export const getBlacklist = () =>
  fetch(
    API_URL + BLACKLIST,
    { token: API_TOKEN }
  )
