// src/App.jsx
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AuthProvider }  from './context/AuthContext.jsx';
import { UserProvider }  from './context/UserContext.jsx';
import { useAuth }       from './context/AuthContext.jsx';
import Sidebar           from './components/Layout/Sidebar.jsx';
import Header            from './components/Layout/Header.jsx';
import AppRoutes         from './routes.jsx';
import { BRAND, FONT }   from './utils/constants';

const PUBLIC_PATHS = ['/login', '/support'];

function Shell() {
  const { user }    = useAuth();
  const location    = useLocation();
  const isPublic    = PUBLIC_PATHS.some(p => location.pathname.startsWith(p));

  if (!user || isPublic) return <AppRoutes />;

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: FONT, background: BRAND.BG, overflow: 'hidden' }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D0D8EE; border-radius: 10px; }
        input, textarea, select, button { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
        input:focus, textarea:focus, select:focus { outline: none; border-color: ${BRAND.NAVY} !important; box-shadow: 0 0 0 3px ${BRAND.NAVY}22; }
        a { color: ${BRAND.NAVY}; }
      `}</style>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <AppRoutes />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <UserProvider>
          <Shell />
        </UserProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
