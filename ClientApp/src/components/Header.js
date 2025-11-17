import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReservation } from '../App';
import { loadTheme } from '../utils/fileStorage';
import './Header.css';

const Header = () => {
  const { openReservationModal } = useReservation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Загружаем и применяем текущую тему при монтировании
  useEffect(() => {
    const loadAndApplyTheme = async () => {
      try {
        const themeData = await loadTheme();
        const themeId = themeData.currentTheme || 'default';
        const currentThemeId = localStorage.getItem('restaurant-theme') || 'default';
        
        // Проверяем, применена ли тема (есть ли CSS переменные)
        const hasThemeApplied = document.documentElement.style.getPropertyValue('--primary-color') || 
                                document.documentElement.style.getPropertyValue('background-color') !== '';
        
        // Применяем тему только если:
        // 1. Тема изменилась в файле
        // 2. Или тема еще не применена
        if (themeId !== currentThemeId || !hasThemeApplied) {
          applyTheme(themeId, themeData.themes);
        }
      } catch (error) {
        console.error('Ошибка загрузки темы:', error);
        // Если тема не применена, применяем из localStorage
        const hasThemeApplied = document.documentElement.style.getPropertyValue('--primary-color');
        if (!hasThemeApplied) {
          const currentThemeId = localStorage.getItem('restaurant-theme') || 'default';
          const themesStr = localStorage.getItem('restaurant-themes');
          const themes = themesStr ? JSON.parse(themesStr) : {};
          applyTheme(currentThemeId, themes);
        }
      }
    };
    
    // Небольшая задержка, чтобы дать время index.js применить тему
    const timer = setTimeout(() => {
      loadAndApplyTheme();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const applyTheme = (themeId, themes = {}) => {
    // Базовые темы
    const defaultThemes = {
      elegant: {
        primaryColor: '#2C3E50',
        primaryLight: '#34495E',
        primaryDark: '#1C2833',
        secondaryColor: '#3498DB',
        secondaryLight: '#5DADE2',
        secondaryDark: '#2980B9',
        accentColor: '#E74C3C',
        backgroundColor: '#ECF0F1',
        textColor: '#2C3E50',
        textLight: '#566573'
      }
    };

    // Объединяем базовые темы с загруженными
    const allThemes = { ...defaultThemes, ...themes };
    const theme = allThemes[themeId];
    
    if (!theme) {
      console.warn(`Тема ${themeId} не найдена`);
      return;
    }
    
    const root = document.documentElement;

    if (themeId === 'default') {
      root.className = '';
      // Сбрасываем CSS переменные к значениям по умолчанию
      root.style.removeProperty('--primary-color');
      root.style.removeProperty('--primary-light');
      root.style.removeProperty('--primary-dark');
      root.style.removeProperty('--secondary-color');
      root.style.removeProperty('--secondary-light');
      root.style.removeProperty('--secondary-dark');
      root.style.removeProperty('--accent-color');
      root.style.removeProperty('--background-color');
      root.style.removeProperty('--text-color');
      root.style.removeProperty('--text-light');
      // Устанавливаем фон html в цвет по умолчанию
      root.style.backgroundColor = '#8B7355';
      return;
    }
    
    // Применяем CSS переменные синхронно
    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--primary-light', theme.primaryLight);
    root.style.setProperty('--primary-dark', theme.primaryDark);
    root.style.setProperty('--secondary-color', theme.secondaryColor);
    root.style.setProperty('--secondary-light', theme.secondaryLight);
    root.style.setProperty('--secondary-dark', theme.secondaryDark);
    root.style.setProperty('--accent-color', theme.accentColor);
    root.style.setProperty('--background-color', theme.backgroundColor);
    root.style.setProperty('--text-color', theme.textColor);
    root.style.setProperty('--text-light', theme.textLight);
    root.style.backgroundColor = theme.primaryColor;
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleReservationClick = (e) => {
    e.preventDefault();
    openReservationModal();
    closeMobileMenu();
  };

  return (
    <header className="header">
      <div className="container">
        {/* Мобильная версия: название, телефон, бургер */}
        <div className="header-mobile">
          <div className="logo">
            <h2>Тбилиси</h2>
          </div>
          <div className="phones-mobile">
          <a href="tel:+79991234567" className="phone-link-mobile">
            +7 (999) 123-45-67
          </a>
            <a href="tel:+79651797797" className="phone-link-mobile">
              +7 (965) 179-77-97
            </a>
          </div>
          <button 
            className={`burger-menu ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={toggleMobileMenu}
            aria-label="Меню"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        {/* Десктопная версия */}
        <div className="header-desktop">
          <div className="header-left">
            <div className="logo">
              <h2>Тбилиси</h2>
            </div>
            <div className="header-contact">
              <div className="phones-desktop">
              <a href="tel:+79991234567" className="phone-link-desktop">
                +7 (999) 123-45-67
              </a>
                <a href="tel:+79651797797" className="phone-link-desktop">
                  +7 (965) 179-77-97
                </a>
              </div>
              <p className="address-desktop">ул. Жебрунова, 4Д, Москва</p>
            </div>
          </div>
          <nav className="nav">
            <Link to="/" className="nav-link">Главная</Link>
            <Link to="/menu" className="nav-link">Меню</Link>
            <button 
              className="nav-link nav-button" 
              onClick={(e) => {
                e.preventDefault();
                openReservationModal();
              }}
            >
              Бронь
            </button>
          </nav>
        </div>
      </div>

      {/* Overlay для закрытия меню */}
      <div 
        className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={closeMobileMenu}
      ></div>

      {/* Мобильное меню */}
      <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <nav className="mobile-nav">
          <Link to="/" className="mobile-nav-link" onClick={closeMobileMenu}>
            Главная
          </Link>
          <Link to="/menu" className="mobile-nav-link" onClick={closeMobileMenu}>
            Меню
          </Link>
          <button 
            className="mobile-nav-link mobile-nav-button" 
            onClick={handleReservationClick}
          >
            Бронь
          </button>
        </nav>
        <div className="mobile-menu-footer">
          <p className="mobile-address">ул. Жебрунова, 4Д, Москва</p>
          <div className="mobile-phones">
          <a href="tel:+79991234567" className="mobile-phone">
            +7 (999) 123-45-67
          </a>
            <a href="tel:+79651797797" className="mobile-phone">
              +7 (965) 179-77-97
            </a>
          </div>
        </div>
      </div>
      
      {/* Кнопка админ-панели */}
      <button 
        className="admin-link"
        onClick={() => {
          const adminUrl = window.location.origin + '/admin';
          window.open(adminUrl, '_blank');
        }}
        title="Админ-панель"
      >
        A
      </button>
    </header>
  );
};

export default Header;