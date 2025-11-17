import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Применяем тему синхронно из localStorage при загрузке страницы
// Это должно выполняться ДО рендера React, чтобы избежать мерцания
const applyThemeFromStorage = () => {
  try {
    const currentThemeId = localStorage.getItem('restaurant-theme') || 'default';
    const themesStr = localStorage.getItem('restaurant-themes');
    
    const root = document.documentElement;
    
    if (currentThemeId === 'default') {
      root.className = '';
      // Удаляем все CSS переменные темы
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
      root.style.backgroundColor = '#8B7355';
      return;
    }
    
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
    
    let theme = null;
    
    // Проверяем базовые темы
    if (defaultThemes[currentThemeId]) {
      theme = defaultThemes[currentThemeId];
    } else if (themesStr) {
      // Проверяем пользовательские темы
      try {
        const themes = JSON.parse(themesStr);
        const allThemes = { ...defaultThemes, ...themes };
        theme = allThemes[currentThemeId];
      } catch (e) {
        console.error('Ошибка парсинга тем:', e);
      }
    }
    
    if (theme) {
      // Применяем все CSS переменные сразу
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
    }
  } catch (error) {
    console.error('Ошибка применения темы из localStorage:', error);
  }
};

// Применяем тему сразу при загрузке, ДО рендера React
applyThemeFromStorage();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
