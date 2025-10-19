import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainContent from './components/MainContent'
import Wallet from './components/Wallet'
import Sign from './components/Sign'
import Help from './components/Help'
import Profile from './components/Profile'
import { WalletContextProvider } from './contexts/WalletContext'
import './App.css'

function App() {
  return (
    <WalletContextProvider>
      <Router>
        <Routes>
          <Route path="/" element={<MainContent />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/sign" element={<Sign />} />
          <Route path="/help" element={<Help />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Router>
    </WalletContextProvider>
  )
}

export default App
