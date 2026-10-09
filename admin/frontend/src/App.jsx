import React, { useState, useEffect } from 'react'
import { api, getToken, setToken } from './api.js'
import Login from './Login.jsx'
import Dashboard from './Dashboard.jsx'

export default function App(){
  const [authed, setAuthed] = useState(!!getToken())
  function onLogin(){ setAuthed(true) }
  function logout(){ setToken(null); setAuthed(false) }
  return authed ? <Dashboard onLogout={logout} /> : <Login onLogin={onLogin} />
}
