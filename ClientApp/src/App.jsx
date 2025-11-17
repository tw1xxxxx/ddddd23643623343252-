import React, { useState, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Reservation from './pages/Reservation';
import Admin from './pages/Admin';
import ReservationModal from './components/ReservationModal';
import './App.css';

// Контекст для управления модальным окном бронирования
export const ReservationContext = createContext();

export const useReservation = () => {
  const context = useContext(ReservationContext);
  if (!context) {
    throw new Error('useReservation must be used within ReservationProvider');
  }
  return context;
};

function App() {
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);

  const openReservationModal = () => setIsReservationModalOpen(true);
  const closeReservationModal = () => setIsReservationModalOpen(false);

  return (
    <ReservationContext.Provider value={{ openReservationModal, closeReservationModal }}>
      <Router>
        <div className="App">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/reservation" element={<Reservation />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
          <ReservationModal isOpen={isReservationModalOpen} onClose={closeReservationModal} />
        </div>
      </Router>
    </ReservationContext.Provider>
  );
}

export default App;