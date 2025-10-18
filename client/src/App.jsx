import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainContent from './components/MainContent'
import Help from './components/Help'
import Sign from './components/Sign'
import Wallet from './components/Wallet'
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
        </Routes>
      </Router>
    </WalletContextProvider>
  )
}

export default App
