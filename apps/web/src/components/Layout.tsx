import clsx from 'clsx'
import { Archive, Briefcase, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const readTheme = () => {
  try {
    return localStorage.getItem('theme') === 'dark'
  } catch {
    return false
  }
}

export function Layout() {
  const [dark, setDark] = useState(readTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch {
      /* storage unavailable: theme just won't persist */
    }
  }, [dark])

  const link = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'flex items-center gap-3 rounded-[9px] px-3 py-2 text-[13.5px] font-semibold transition-colors',
      isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white',
    )

  return (
    <div className="flex h-full">
      <aside className="flex w-60 shrink-0 flex-col gap-6 p-4" style={{ background: 'var(--nav-gradient)' }}>
        <div className="flex items-center gap-3 px-2 pt-2">
          <img src="/flock-mark-white.svg" alt="" className="h-8 w-8" />
          <div className="leading-tight">
            <div className="text-[15px] font-extrabold text-white">Estimador</div>
            <div className="text-[11px] font-semibold tracking-wide text-white/60 uppercase">de propuestas</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          <NavLink to="/" end className={link}>
            <Briefcase size={17} /> Oportunidades
          </NavLink>
          <NavLink to="/historico" className={link}>
            <Archive size={17} /> Histórico
          </NavLink>
        </nav>
        <div className="mt-auto">
          <button
            type="button"
            className="btn w-full justify-center text-white"
            style={{ background: 'rgba(255,255,255,.14)' }}
            onClick={() => setDark((d) => !d)}
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />} {dark ? 'Modo claro' : 'Modo oscuro'}
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
