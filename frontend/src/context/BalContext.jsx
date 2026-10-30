import { createContext, useContext, useState } from 'react'

const Ctx = createContext(null)

export function HideBalProvider({ children }) {
  const [hide, setHide] = useState(() => localStorage.getItem('fundy-hidebal') !== '0')
  const toggle = () =>
    setHide((h) => {
      const n = !h
      localStorage.setItem('fundy-hidebal', n ? '1' : '0')
      return n
    })
  return <Ctx.Provider value={{ hide, toggle }}>{children}</Ctx.Provider>
}

export const useHideBal = () => useContext(Ctx)
