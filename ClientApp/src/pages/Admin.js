import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import './Admin.css';
import { 
  autoSaveReservations, 
  autoSaveMenu, 
  autoSavePhotos, 
  loadTheme, 
  loadMenu, 
  loadReservations, 
  loadCategories,
  loadPhotos,
  saveTheme,
  saveCategories
} from '../utils/fileStorage';
import { defaultMenu } from '../data/defaultMenu';

// Базовые категории по умолчанию
const defaultCategories = [
  { id: 1, key: 'cold', name: 'Холодные закуски', order: 1 },
  { id: 2, key: 'salads', name: 'Салаты', order: 2 },
  { id: 3, key: 'hot', name: 'Горячие блюда', order: 3 },
  { id: 4, key: 'drinks', name: 'Напитки', order: 4 }
];

// Базовые темы по умолчанию
const defaultThemes = {
  elegant: {
    id: 'elegant',
    name: 'Элегантная синяя',
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

const Admin = () => {
  // Функция для генерации уникального ID
  const generateUniqueId = (existingItems) => {
    let newId;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
      // Используем timestamp + случайное число для уникальности
      newId = Date.now() + Math.floor(Math.random() * 1000);
      attempts++;
      
      // Проверяем, что такого ID нет в существующих элементах
      const exists = existingItems.some(item => item.id === newId);
      if (!exists) {
        return newId;
      }
    } while (attempts < maxAttempts);
    
    // Если не удалось найти уникальный ID за 100 попыток, используем просто timestamp
    console.warn('⚠️ Не удалось сгенерировать уникальный ID за 100 попыток, используем timestamp');
    return Date.now();
  };

  // Проверяем авторизацию из localStorage при загрузке
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('admin-authenticated') === 'true';
  });
  
  const [activeTab, setActiveTab] = useState('reservations');
  const [reservations, setReservations] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [themes, setThemes] = useState({});
  const [currentTheme, setCurrentTheme] = useState('default');
  const [photos, setPhotos] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingTheme, setEditingTheme] = useState(null);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const newPhotoKeyRef = useRef(`new-photo-${Date.now()}`); // Стабильный key для новой формы
  const newPhotoObjectRef = useRef({}); // Стабильный объект для новой формы
  // Глобальное хранилище для загруженных изображений (вне компонента, чтобы не терять при перерендере)
  const uploadedImagesStore = useRef(new Map()); // key -> base64 image
  const newMenuItemKeyRef = useRef(`new-menu-item-${Date.now()}`); // Стабильный key для новой формы меню
  // Глобальное хранилище для загруженных изображений меню
  const menuImagesStore = useRef(new Map()); // key -> base64 image
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('success');

  // Функция для переключения вкладок с закрытием всех модальных окон
  const handleTabChange = (tab) => {
    // Закрываем все открытые модальные окна
    // Очищаем хранилище при переключении вкладок
    if (editingItem) {
      const formKey = editingItem?.id || newMenuItemKeyRef.current;
      if (menuImagesStore.current.has(formKey)) {
        menuImagesStore.current.delete(formKey);
      }
    }
    setEditingItem(null);
    setEditingCategory(null);
    setEditingTheme(null);
    if (editingPhoto) {
      const formKey = editingPhoto?.id || newPhotoKeyRef.current;
      if (uploadedImagesStore.current.has(formKey)) {
        uploadedImagesStore.current.delete(formKey);
      }
    }
    setEditingPhoto(null);
    // Переключаем вкладку
    setActiveTab(tab);
  };

  useEffect(() => {
    const loadCategoriesFromFile = async () => {
      try {
        const loadedCategories = await loadCategories();
        if (Array.isArray(loadedCategories)) {
          // Пустой массив - это валидное состояние (пользователь удалил все категории)
          // Не подставляем дефолтные категории, если массив просто пустой
          const sorted = [...loadedCategories].sort((a, b) => a.order - b.order);
          setCategories(sorted);
          console.log(`📥 loadCategoriesFromFile: Загружено категорий: ${sorted.length}`);
        } else {
          // Если загруженные данные не массив, используем дефолтные категории только при первой загрузке
          // Проверяем, есть ли уже сохраненные категории в localStorage
          const stored = localStorage.getItem('restaurant-categories');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) {
                // Если есть сохраненные категории, используем их (даже если пустой массив)
                console.warn('⚠️ loadCategoriesFromFile: Данные не являются массивом, но есть сохраненные категории. Используем пустой массив.');
                setCategories([]);
              } else {
                // Если сохраненные данные не массив, используем дефолтные категории
                console.log('📥 loadCategoriesFromFile: Сохраненные данные не массив, используем дефолтные категории');
                setCategories([...defaultCategories]);
              }
            } catch (e) {
              // Если данные повреждены, используем дефолтные категории
              console.log('📥 loadCategoriesFromFile: Сохраненные данные повреждены, используем дефолтные категории');
              setCategories([...defaultCategories]);
            }
          } else {
            // Только если нет сохраненных категорий (первая загрузка), используем дефолтные категории
            console.log('📥 loadCategoriesFromFile: Первая загрузка, используем дефолтные категории');
            setCategories([...defaultCategories]);
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
        // При ошибке проверяем, есть ли сохраненные категории
        const stored = localStorage.getItem('restaurant-categories');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              // Если есть сохраненные категории, используем их (даже если пустой массив)
              console.warn('⚠️ loadCategoriesFromFile: Ошибка загрузки, но есть сохраненные категории. Используем пустой массив.');
              setCategories([]);
            } else {
              console.log('📥 loadCategoriesFromFile: Ошибка загрузки и сохраненные данные не массив, используем дефолтные категории');
              setCategories([...defaultCategories]);
            }
          } catch (e) {
            console.log('📥 loadCategoriesFromFile: Ошибка загрузки и сохраненные данные повреждены, используем дефолтные категории');
            setCategories([...defaultCategories]);
          }
        } else {
          // Только если нет сохраненных категорий, используем дефолтные категории
          console.log('📥 loadCategoriesFromFile: Ошибка загрузки и нет сохраненных категорий, используем дефолтные категории');
          setCategories([...defaultCategories]);
        }
      }
    };

    const loadReservationsFromFile = async () => {
      try {
        const loadedReservations = await loadReservations();
        setReservations(loadedReservations);
      } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
        setReservations([]);
      }
    };

    const loadMenuItemsFromFile = async () => {
      try {
        const loadedMenu = await loadMenu();
        if (Array.isArray(loadedMenu)) {
          // Пустой массив - это валидное состояние (пользователь удалил все позиции)
          // Не подставляем дефолтное меню, если массив просто пустой
          setMenuItems(loadedMenu);
          console.log(`📥 loadMenuItemsFromFile: Загружено позиций: ${loadedMenu.length}`);
        } else {
          // Если загруженные данные не массив, проверяем метаданные
          // Метаданные могут быть пустым массивом "[]", что тоже валидно
          const metadataStr = localStorage.getItem('restaurant-menu-metadata');
          if (metadataStr) {
            try {
              const metadata = JSON.parse(metadataStr);
              // Если метаданные существуют (даже если это пустой массив), значит меню было сохранено
              // Используем пустой массив, а не дефолтное меню
              console.warn('⚠️ loadMenuItemsFromFile: Данные не являются массивом, но есть метаданные. Используем пустой массив.');
              setMenuItems([]);
            } catch (e) {
              // Если метаданные повреждены, используем дефолтное меню
              console.log('📥 loadMenuItemsFromFile: Метаданные повреждены, используем дефолтное меню');
              setMenuItems([...defaultMenu]);
            }
          } else {
            // Только если нет метаданных (первая загрузка), используем дефолтное меню
            console.log('📥 loadMenuItemsFromFile: Первая загрузка, используем дефолтное меню');
            setMenuItems([...defaultMenu]);
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки меню:', error);
        // При ошибке проверяем, есть ли метаданные
        const metadataStr = localStorage.getItem('restaurant-menu-metadata');
        if (metadataStr) {
          try {
            const metadata = JSON.parse(metadataStr);
            // Если метаданные существуют, значит меню было сохранено, используем пустой массив
            console.warn('⚠️ loadMenuItemsFromFile: Ошибка загрузки, но есть метаданные. Используем пустой массив.');
            setMenuItems([]);
          } catch (e) {
            // Если метаданные повреждены, используем дефолтное меню
            console.log('📥 loadMenuItemsFromFile: Ошибка загрузки и метаданные повреждены, используем дефолтное меню');
            setMenuItems([...defaultMenu]);
          }
        } else {
          // Только если нет метаданных, используем дефолтное меню
          console.log('📥 loadMenuItemsFromFile: Ошибка загрузки и нет метаданных, используем дефолтное меню');
          setMenuItems([...defaultMenu]);
        }
      }
    };

    const loadThemesFromFile = async () => {
      try {
        const themeData = await loadTheme();
        // Объединяем базовые темы с загруженными
        const allThemes = { ...defaultThemes, ...themeData.themes };
        setThemes(allThemes);
        
        // Устанавливаем текущую тему
        const currentThemeId = themeData.currentTheme || 'default';
        setCurrentTheme(currentThemeId);
        // Применяем тему при загрузке с использованием загруженных тем
        applyThemeOnLoad(currentThemeId, allThemes);
      } catch (error) {
        console.error('Ошибка загрузки тем:', error);
        setThemes(defaultThemes);
        setCurrentTheme('default');
        applyThemeOnLoad('default', defaultThemes);
      }
    };

    const applyThemeOnLoad = (themeId, themesToUse = null) => {
      // Используем переданные темы или загружаем из состояния
      const allThemes = themesToUse || { ...defaultThemes, ...themes };
      
      if (themeId === 'default') {
        document.documentElement.className = '';
        const root = document.documentElement;
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
        document.documentElement.style.backgroundColor = '#8B7355';
        return;
      }
      
      // Проверяем базовые темы
      if (defaultThemes[themeId]) {
        const theme = defaultThemes[themeId];
        const root = document.documentElement;
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
        // Устанавливаем фон html для overscroll
        document.documentElement.style.backgroundColor = theme.primaryColor;
        return;
      }
      
      // Проверяем пользовательские темы
      const theme = allThemes[themeId];
      if (theme) {
        const root = document.documentElement;
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
        // Устанавливаем фон html для overscroll
        document.documentElement.style.backgroundColor = theme.primaryColor;
      }
    };

    const loadPhotosFromFile = async () => {
        try {
        const loadedPhotos = await loadPhotos();
        if (Array.isArray(loadedPhotos) && loadedPhotos.length > 0) {
          setPhotos(loadedPhotos);
        } else {
          setPhotos([]);
          }
        } catch (error) {
          console.error('Ошибка загрузки фотографий:', error);
      setPhotos([]);
      }
    };

    loadCategoriesFromFile();
    loadReservationsFromFile();
    loadMenuItemsFromFile();
    loadThemesFromFile();
    loadPhotosFromFile();
  }, []);

  const saveCategoriesToFile = async (updatedCategories) => {
    // Сортируем по порядку перед сохранением
    const sorted = [...updatedCategories].sort((a, b) => a.order - b.order);
    setCategories(sorted);
    const saveResult = await saveCategories(sorted);
    if (!saveResult.success) {
      showAlert(`Ошибка скачивания файла категорий: ${saveResult.message}`, 'error');
    } else {
      showAlert('Файл categories.json скачан', 'success');
    }
  };

  const addCategory = async () => {
    const newCategory = {
      id: Date.now(),
      key: `category_${Date.now()}`,
      name: 'Новая категория',
      order: categories.length + 1
    };
    const updated = [...categories, newCategory];
    await saveCategoriesToFile(updated);
    setEditingCategory(newCategory);
    showAlert('Категория добавлена', 'success');
  };

  const updateCategory = async (category) => {
    if (!category.name || !category.name.trim()) {
      showAlert('Введите название категории', 'error');
      return;
    }
    const updated = categories.map(cat => 
      cat.id === category.id ? category : cat
    );
    await saveCategoriesToFile(updated);
    setEditingCategory(null);
    showAlert('Категория обновлена', 'success');
  };

  const deleteCategory = async (id) => {
    // Находим категорию для удаления (для логирования)
    const categoryToDelete = categories.find(cat => cat.id === id);
    if (categoryToDelete) {
      console.log('🗑️ deleteCategory: Удаление категории:', {
        id: categoryToDelete.id,
        name: categoryToDelete.name,
        key: categoryToDelete.key
      });
    }
    
    // Проверяем, используется ли категория в блюдах
    const category = categories.find(cat => cat.id === id);
    if (category) {
      const itemsInCategory = menuItems.filter(item => item.category === category.key);
      if (itemsInCategory.length > 0) {
        showAlert(`Нельзя удалить категорию: в ней есть ${itemsInCategory.length} блюд(а)`, 'error');
        return;
      }
    }
    
    // Удаляем категорию из массива
    const updated = categories.filter(cat => cat.id !== id);
    console.log(`🗑️ deleteCategory: Осталось категорий: ${updated.length}`);
    
    // Обновляем порядок оставшихся категорий
    updated.forEach((cat, index) => {
      cat.order = index + 1;
    });
    
    // Сохраняем обновленный массив (даже если он пустой)
    await saveCategoriesToFile(updated);
    
    if (updated.length === 0) {
      console.log('✅ deleteCategory: Все категории удалены, массив пустой');
    } else {
      console.log('✅ deleteCategory: Категория успешно удалена');
    }
    
    showAlert('Категория удалена', 'success');
  };

  const moveCategory = async (id, direction) => {
    const index = categories.findIndex(cat => cat.id === id);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;
    
    const updated = [...categories];
    [updated[index].order, updated[newIndex].order] = [updated[newIndex].order, updated[index].order];
    await saveCategoriesToFile(updated);
  };

  const showAlert = useCallback((message, type = 'success') => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 4000);
  }, []);

  // Функция авторизации
  const handleLogin = (username, password) => {
    if (username === 'admin' && password === 'Tbil4dSokol') {
      setIsAuthenticated(true);
      localStorage.setItem('admin-authenticated', 'true');
      showAlert('Добро пожаловать в админ-панель!', 'success');
      return true;
    } else {
      showAlert('Неверный логин или пароль', 'error');
      return false;
    }
  };

  // Функция выхода
  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('admin-authenticated');
    showAlert('Вы вышли из админ-панели', 'success');
  };

  // Функции управления темами
  const applyTheme = async (themeId) => {
    setCurrentTheme(themeId);
    
    if (themeId === 'default') {
      document.documentElement.className = '';
      const root = document.documentElement;
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
      // Сохраняем тему в файл
      const saveResult = await saveTheme({ currentTheme: themeId, themes: themes });
      if (saveResult.success) {
        showAlert('Тема "По умолчанию" применена. Файл theme.json скачан.', 'success');
      } else {
        showAlert(`Тема применена, но файл не скачан: ${saveResult.message}`, 'error');
      }
      return;
    }
    
    // Проверяем базовые темы
    if (defaultThemes[themeId]) {
      const theme = defaultThemes[themeId];
      const root = document.documentElement;
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
      // Сохраняем тему в файл
      const saveResult = await saveTheme({ currentTheme: themeId, themes: themes });
      if (saveResult.success) {
        showAlert(`Тема "${theme.name}" применена. Файл theme.json скачан.`, 'success');
      } else {
        showAlert(`Тема применена, но файл не скачан: ${saveResult.message}`, 'error');
      }
      return;
    }
    
    // Проверяем пользовательские темы
    const theme = themes[themeId];
    if (theme) {
      const root = document.documentElement;
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
      // Сохраняем тему в файл
      const saveResult = await saveTheme({ currentTheme: themeId, themes: themes });
      if (saveResult.success) {
        showAlert(`Тема "${theme.name}" применена. Файл theme.json скачан.`, 'success');
      } else {
        showAlert(`Тема применена, но файл не скачан: ${saveResult.message}`, 'error');
      }
    }
  };

  const saveThemes = async (updatedThemes) => {
    // Объединяем базовые темы с пользовательскими для сохранения
    const allThemes = { ...defaultThemes, ...updatedThemes };
    setThemes(allThemes);
    // Сохраняем в файл
    const saveResult = await saveTheme({ currentTheme: currentTheme, themes: allThemes });
    if (!saveResult.success) {
      showAlert(`Ошибка скачивания файла тем: ${saveResult.message}`, 'error');
    } else {
      showAlert('Файл theme.json скачан', 'success');
    }
  };

  // Функции для автоматического вычисления светлого и темного вариантов цвета
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const rgbToHex = (r, g, b) => {
    return "#" + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join("");
  };

  const lightenColor = (hex, percent = 20) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    
    const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * (percent / 100)));
    const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * (percent / 100)));
    const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * (percent / 100)));
    
    return rgbToHex(r, g, b);
  };

  const darkenColor = (hex, percent = 20) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    
    const r = Math.max(0, Math.round(rgb.r * (1 - percent / 100)));
    const g = Math.max(0, Math.round(rgb.g * (1 - percent / 100)));
    const b = Math.max(0, Math.round(rgb.b * (1 - percent / 100)));
    
    return rgbToHex(r, g, b);
  };

  const addTheme = () => {
    const basePrimaryColor = '#8B7355';
    const newTheme = {
      id: `theme_${Date.now()}`,
      name: 'Новая тема',
      primaryColor: basePrimaryColor,
      primaryLight: lightenColor(basePrimaryColor, 20),
      primaryDark: darkenColor(basePrimaryColor, 20),
      secondaryColor: '#A8D8EA',
      secondaryLight: '#C5E7F5',
      secondaryDark: '#7BB8D4',
      accentColor: '#D4B896',
      backgroundColor: '#FDF6E3',
      textColor: '#333333',
      textLight: '#666666'
    };
    const updated = { ...themes, [newTheme.id]: newTheme };
    saveThemes(updated);
    setEditingTheme(newTheme);
    showAlert('Тема добавлена', 'success');
  };

  const updateTheme = (theme) => {
    if (!theme.name || !theme.name.trim()) {
      showAlert('Введите название темы', 'error');
      return;
    }
    // Автоматически вычисляем светлый и темный варианты основного цвета
    const updatedTheme = {
      ...theme,
      primaryLight: lightenColor(theme.primaryColor, 20),
      primaryDark: darkenColor(theme.primaryColor, 20)
    };
    const updated = { ...themes, [updatedTheme.id]: updatedTheme };
    saveThemes(updated);
    setEditingTheme(null);
    showAlert('Тема обновлена', 'success');
  };

  const deleteTheme = (id) => {
    if (defaultThemes[id]) {
      showAlert('Базовые темы нельзя удалять', 'error');
      return;
    }
    const updated = { ...themes };
    delete updated[id];
    saveThemes(updated);
    if (currentTheme === id) {
      applyTheme('default');
    }
    showAlert('Тема удалена', 'success');
  };

  const deleteReservation = async (id) => {
    const updated = reservations.filter(res => res.id !== id);
    setReservations(updated);
    const saveResult = await autoSaveReservations(updated);
    if (saveResult.success) {
      showAlert('Заявка успешно удалена', 'success');
    } else {
      showAlert(`Заявка удалена, но файл не скачан: ${saveResult.message}`, 'error');
    }
  };

  const deleteMenuItem = async (id) => {
    // Находим элемент для удаления (для логирования)
    const itemToDelete = menuItems.find(item => item.id === id);
    if (itemToDelete) {
      const hasImage = itemToDelete.image && itemToDelete.image.startsWith('data:image');
      console.log('🗑️ deleteMenuItem: Удаление позиции меню:', {
        id: itemToDelete.id,
        name: itemToDelete.name,
        hasImage: hasImage,
        imageSize: hasImage ? itemToDelete.image.length : 0
      });
    }
    
    // Удаляем элемент из меню (изображение удаляется вместе с элементом, так как оно часть JSON)
    const updated = menuItems.filter(item => item.id !== id);
    setMenuItems(updated);
    
    // Сохраняем все оставшиеся элементы в файл
    // При этом старое изображение (base64) автоматически удаляется, так как элемент удален из массива
    const saveResult = await autoSaveMenu(updated);
    if (saveResult.success) {
      console.log('✅ deleteMenuItem: Позиция меню и её изображение успешно удалены');
      showAlert('Блюдо успешно удалено', 'success');
    } else {
      console.error('❌ deleteMenuItem: Ошибка сохранения после удаления:', saveResult.message);
      showAlert(`Блюдо удалено, но файл не скачан: ${saveResult.message}`, 'error');
    }
  };

  const cancelPhotoEditing = useCallback(() => {
    // Очищаем хранилище для новой формы при отмене
    const formKey = editingPhoto?.id || newPhotoKeyRef.current;
    if (uploadedImagesStore.current.has(formKey)) {
      uploadedImagesStore.current.delete(formKey);
    }
    setEditingPhoto(null);
  }, [editingPhoto]);

  const savePhoto = useCallback(async (photo) => {
    try {
    // Валидация: не сохраняем фотографии без изображения
    if (!photo.image || !photo.image.trim()) {
      showAlert('Загрузите изображение', 'error');
      return;
    }
    
    // Валидация: изображение должно быть base64
    if (!photo.image.startsWith('data:image')) {
      showAlert('Загрузите файл изображения', 'error');
      return;
    }
    
    // Валидация: не сохраняем пустые объекты или объекты только с текстом (без изображения)
    // Это уже проверено выше, но для надежности проверяем еще раз
    const hasValidImage = photo.image && 
                          photo.image.trim() && 
                          photo.image.startsWith('data:image');
    
    if (!hasValidImage) {
      showAlert('Фотография должна содержать изображение', 'error');
      return;
    }

    let updated;
    if (photo.id) {
      // Редактирование существующей фотографии
      const oldPhoto = photos.find(p => p.id === photo.id);
      const imageChanged = oldPhoto?.image !== photo.image;
      
      console.log('💾 savePhoto: Редактирование существующей фотографии:', {
        id: photo.id,
        caption: photo.caption,
        oldImageSize: oldPhoto?.image ? oldPhoto.image.length : 0,
        newImageSize: photo.image ? photo.image.length : 0,
        imageChanged: imageChanged
      });
      
      // Заменяем старую фотографию новой (старое изображение удаляется вместе со старым элементом)
      updated = photos.map(p => p.id === photo.id ? photo : p);
      
      if (imageChanged) {
        console.log('🔄 savePhoto: Изображение заменено, старое изображение будет удалено при сохранении');
      }
    } else {
      // Добавление новой фотографии
      // Генерируем уникальный ID, проверяя существующие фотографии
      const newId = generateUniqueId(photos);
      const newPhoto = {
        ...photo,
        id: newId
      };
      updated = [...photos, newPhoto];
    }
    
    // Фильтруем пустые фотографии перед сохранением
    const validPhotos = updated.filter(p => {
      return p && 
             p.image && 
             p.image.trim() && 
             p.image.startsWith('data:image');
    });
    
    setPhotos(validPhotos);
      
      // Сохраняем на сервер
      const saveResult = await autoSavePhotos(validPhotos);
    
      if (!saveResult.success) {
        // Если сохранение на сервер не удалось, показываем ошибку и НЕ закрываем модальное окно
        showAlert(`Ошибка сохранения на сервер: ${saveResult.message}`, 'error');
        console.error('Ошибка сохранения фотографии:', saveResult);
        return; // Не закрываем модальное окно, чтобы пользователь мог попробовать снова
      }
      
      // Очищаем хранилище для этой формы после успешного сохранения
    const formKey = photo.id || newPhotoKeyRef.current;
    if (uploadedImagesStore.current.has(formKey)) {
      uploadedImagesStore.current.delete(formKey);
    }
    
    setEditingPhoto(null);
    showAlert(photo.id ? 'Фотография обновлена' : 'Фотография добавлена', 'success');
    } catch (error) {
      console.error('Неожиданная ошибка при сохранении фотографии:', error);
      showAlert(`Ошибка при сохранении фотографии: ${error.message}`, 'error');
    }
  }, [photos]);

  const deletePhoto = async (id) => {
    // Находим фотографию для удаления (для логирования)
    const photoToDelete = photos.find(p => p.id === id);
    if (photoToDelete) {
      const hasImage = photoToDelete.image && photoToDelete.image.startsWith('data:image');
      console.log('🗑️ deletePhoto: Удаление фотографии:', {
        id: photoToDelete.id,
        caption: photoToDelete.caption,
        hasImage: hasImage,
        imageSize: hasImage ? photoToDelete.image.length : 0
      });
    }
    
    // Удаляем фотографию из массива (изображение удаляется вместе с элементом, так как оно часть JSON)
    const updated = photos.filter(p => p.id !== id);
    setPhotos(updated);
    
    // Сохраняем все оставшиеся фотографии в файл
    // При этом старое изображение (base64) автоматически удаляется, так как элемент удален из массива
    const saveResult = await autoSavePhotos(updated);
    if (saveResult.success) {
      console.log('✅ deletePhoto: Фотография и её изображение успешно удалены');
    showAlert('Фотография удалена', 'success');
    } else {
      showAlert(`Фотография удалена, но файл не скачан: ${saveResult.message}`, 'error');
    }
  };

  const validateMenuItem = (item) => {
    if (!item.name || !item.name.trim()) {
      showAlert('Введите название блюда', 'error');
      return false;
    }
    if (!item.price || isNaN(parseFloat(item.price)) || parseFloat(item.price) <= 0) {
      showAlert('Введите корректную цену (больше 0)', 'error');
      return false;
    }
    if (!item.weight || !item.weight.trim()) {
      showAlert('Введите вес/объем', 'error');
      return false;
    }
    if (!item.description || !item.description.trim()) {
      showAlert('Введите описание блюда', 'error');
      return false;
    }
    if (!item.image || !item.image.trim()) {
      showAlert('Загрузите изображение', 'error');
      return false;
    }
    if (!item.image.startsWith('data:image')) {
      showAlert('Загрузите файл изображения', 'error');
      return false;
    }
    return true;
  };

  const saveMenuItem = async (item) => {
    if (!validateMenuItem(item)) return;

    console.log('💾 saveMenuItem: Получены данные для сохранения:', {
      id: item.id,
      name: item.name,
      hasImage: !!item.image,
      imageLength: item.image ? item.image.length : 0,
      imageStart: item.image ? item.image.substring(0, 50) : 'нет'
    });

    // Форматируем цену (убираем "₽" если есть и преобразуем в число)
    const formattedItem = {
      ...item,
      price: item.price.toString().replace(' ₽', '')
    };

    // ВАЖНО: убеждаемся, что изображение передается правильно
    if (item.image) {
      formattedItem.image = item.image;
    }

    console.log('💾 saveMenuItem: Отформатированные данные:', {
      id: formattedItem.id,
      name: formattedItem.name,
      hasImage: !!formattedItem.image,
      imageLength: formattedItem.image ? formattedItem.image.length : 0,
      imageStart: formattedItem.image ? formattedItem.image.substring(0, 50) : 'нет'
    });

    let updatedItems;
    if (editingItem && editingItem.id) {
      // Редактирование существующего блюда (любого, включая базовые)
      const oldItem = menuItems.find(mi => mi.id === editingItem.id);
      const imageChanged = oldItem?.image !== formattedItem.image;
      
      console.log('💾 saveMenuItem: Редактирование существующего элемента:', {
        id: editingItem.id,
        name: formattedItem.name,
        oldImageSize: oldItem?.image ? oldItem.image.length : 0,
        newImageSize: formattedItem.image ? formattedItem.image.length : 0,
        imageChanged: imageChanged
      });
      
      // Заменяем старый элемент новым (старое изображение удаляется вместе со старым элементом)
      updatedItems = menuItems.map(menuItem => 
        menuItem.id === editingItem.id ? { ...formattedItem, id: editingItem.id } : menuItem
      );
      
      if (imageChanged) {
        console.log('🔄 saveMenuItem: Изображение заменено, старое изображение будет удалено при сохранении');
      }
      
      showAlert('Блюдо успешно обновлено', 'success');
    } else {
      // Добавление нового блюда
      // Генерируем уникальный ID, проверяя существующие элементы
      const newId = generateUniqueId(menuItems);
      const newItem = {
        ...formattedItem,
        id: newId
      };
      updatedItems = [...menuItems, newItem];
      showAlert('Блюдо успешно добавлено', 'success');
    }

    setMenuItems(updatedItems);
    
    // Сохраняем все элементы в файл (включая отредактированные базовые)
    const saveResult = await autoSaveMenu(updatedItems);
    if (!saveResult.success) {
      showAlert(`Ошибка скачивания файла меню: ${saveResult.message}`, 'error');
    } else {
      showAlert('Файл menu.json скачан', 'success');
    }
    
    // Очищаем хранилище для этой формы после сохранения
    const formKey = editingItem?.id || newMenuItemKeyRef.current;
    if (menuImagesStore.current.has(formKey)) {
      menuImagesStore.current.delete(formKey);
    }
    
    setEditingItem(null);
  };

  const startEditing = (item) => {
    setEditingItem(item);
  };

  const cancelEditing = useCallback(() => {
    // Очищаем хранилище для новой формы при отмене
    const formKey = editingItem?.id || newMenuItemKeyRef.current;
    if (menuImagesStore.current.has(formKey)) {
      menuImagesStore.current.delete(formKey);
    }
    // Очищаем localStorage с данными формы при отмене (только для новых элементов)
    if (!editingItem?.id) {
      try {
        const formDataStorageKey = `menu-item-form-${formKey}`;
        localStorage.removeItem(formDataStorageKey);
        console.log('🗑️ cancelEditing: Данные формы удалены из localStorage при отмене');
      } catch (e) {
        console.error('Ошибка удаления данных формы из localStorage:', e);
      }
    }
    setEditingItem(null);
  }, [editingItem]);

  // Компонент формы редактирования темы
  const ThemeEditForm = ({ theme, onSave, onCancel }) => {
    const [formData, setFormData] = useState(theme);

    // Функции для вычисления вариантов цвета (локальные копии)
    const hexToRgbLocal = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };

    const rgbToHexLocal = (r, g, b) => {
      return "#" + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      }).join("");
    };

    const lightenColorLocal = (hex, percent = 20) => {
      const rgb = hexToRgbLocal(hex);
      if (!rgb) return hex;
      
      const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * (percent / 100)));
      const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * (percent / 100)));
      const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * (percent / 100)));
      
      return rgbToHexLocal(r, g, b);
    };

    const darkenColorLocal = (hex, percent = 20) => {
      const rgb = hexToRgbLocal(hex);
      if (!rgb) return hex;
      
      const r = Math.max(0, Math.round(rgb.r * (1 - percent / 100)));
      const g = Math.max(0, Math.round(rgb.g * (1 - percent / 100)));
      const b = Math.max(0, Math.round(rgb.b * (1 - percent / 100)));
      
      return rgbToHexLocal(r, g, b);
    };

    const handleChange = (field, value) => {
      const updated = {
        ...formData,
        [field]: value
      };
      
      // Если изменяется основной цвет, автоматически вычисляем светлый и темный варианты
      if (field === 'primaryColor') {
        updated.primaryLight = lightenColorLocal(value, 20);
        updated.primaryDark = darkenColorLocal(value, 20);
      }
      
      setFormData(updated);
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      onSave(formData);
    };

    const colorFields = [
      { key: 'primaryColor', label: 'Основной цвет' },
      { key: 'secondaryColor', label: 'Цвет кнопок и ссылок' },
      { key: 'secondaryLight', label: 'Цвет кнопок при наведении' },
      { key: 'secondaryDark', label: 'Цвет активных элементов' },
      { key: 'accentColor', label: 'Акцентный цвет (выделения)' },
      { key: 'backgroundColor', label: 'Цвет фона страницы' },
      { key: 'textColor', label: 'Цвет основного текста' },
      { key: 'textLight', label: 'Цвет второстепенного текста' }
    ];

    return (
      <div className="theme-edit-form">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Название темы *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Название темы"
              required
            />
          </div>

          <div className="theme-colors-grid">
            {colorFields.map(field => (
              <div key={field.key} className="color-picker-group">
                <label>{field.label}</label>
                <div className="color-picker-wrapper">
                  <input
                    type="color"
                    value={formData[field.key]}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="color-picker"
                  />
                  <input
                    type="text"
                    value={formData[field.key]}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="color-input"
                    placeholder="#000000"
                  />
                  <div 
                    className="color-preview"
                    style={{ background: formData[field.key] }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button type="submit" className="save-btn">
              Сохранить
            </button>
            <button type="button" className="cancel-btn" onClick={onCancel}>
              Отмена
            </button>
          </div>
        </form>
      </div>
    );
  };

  // Функция для проверки, является ли файл изображением
  // Проверяет и MIME-тип, и расширение файла для поддержки всех форматов
  const isImageFile = (file) => {
    // Проверяем MIME-тип (основная проверка)
    if (file.type && file.type.startsWith('image/')) {
      return true;
    }
    
    // Fallback: проверяем расширение файла
    // Поддерживаем все популярные форматы изображений
    const imageExtensions = [
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 
      'ico', 'tiff', 'tif', 'heic', 'heif', 'avif', 'apng'
    ];
    
    const fileName = file.name.toLowerCase();
    const extension = fileName.split('.').pop();
    
    return imageExtensions.includes(extension);
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Компонент формы авторизации
  const LoginForm = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      setError('');
      
      if (!username.trim() || !password.trim()) {
        setError('Заполните все поля');
        return;
      }

      const success = onLogin(username, password);
      if (!success) {
        setError('Неверный логин или пароль');
        setPassword('');
      }
    };

    return (
      <div className="admin-login-container">
        <div className="admin-login-form">
          <div className="admin-login-header">
            <h1>Админ-панель</h1>
            <p>Войдите для управления сайтом</p>
          </div>
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">Логин</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Введите логин"
                autoFocus
                className={error ? 'error' : ''}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Пароль</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                className={error ? 'error' : ''}
              />
            </div>
            {error && <div className="login-error">{error}</div>}
            <button type="submit" className="login-submit-btn">
              Войти
            </button>
          </form>
        </div>
      </div>
    );
  };

  // Компонент формы для добавления/редактирования фотографий
  const PhotoForm = ({ photo, onSave, onCancel, onAlert, uploadedImagesStore, formKey }) => {
    // Извлекаем ID фото для отслеживания изменений
    // Используем useMemo для стабилизации, чтобы избежать лишних вычислений
    const photoId = useMemo(() => photo?.id, [photo?.id]);
    
    // Сохраняем ID фото для отслеживания изменений
    // Инициализируем ref только один раз при монтировании
    const photoIdRef = useRef(photoId);
    const isInitialMountRef = useRef(true);
    
    // Используем отдельное состояние для изображения
    // Инициализируем только один раз при монтировании
    // Восстанавливаем из хранилища, если изображение было загружено ранее
    const [image, setImage] = useState(() => {
      // Сначала проверяем хранилище
      if (uploadedImagesStore && uploadedImagesStore.has(formKey)) {
        return uploadedImagesStore.get(formKey);
      }
      return photo?.image || '';
    });
    const [caption, setCaption] = useState(photo?.caption || '');
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const userHasUploadedRef = useRef(false); // Флаг: пользователь загрузил изображение
    const uploadedImageRef = useRef(null); // Сохраняем загруженное изображение
    const isProcessingFileRef = useRef(false); // Флаг: файл обрабатывается

    // Инициализация только при изменении ID фото (не при каждом рендере)
    useEffect(() => {
      const isInitialMount = isInitialMountRef.current;
      isInitialMountRef.current = false;
      
      // Если ID изменился (переключение между редактированием и созданием нового)
      if (photoIdRef.current !== photoId) {
        photoIdRef.current = photoId;
        
        // Если пользователь уже загрузил изображение для новой формы, НЕ сбрасываем его
        if (userHasUploadedRef.current && !photoId && uploadedImageRef.current) {
          // Восстанавливаем загруженное изображение
          setImage(uploadedImageRef.current);
          return; // Сохраняем загруженное пользователем изображение
        }
        
        // Если редактируем существующее фото - загружаем его данные
        if (photoId && photo) {
          userHasUploadedRef.current = false;
          uploadedImageRef.current = null;
          setImage(photo.image || '');
          setCaption(photo.caption || '');
        } else {
          // Новая форма - сбрасываем только если пользователь еще ничего не загрузил
          if (!userHasUploadedRef.current && !uploadedImageRef.current) {
            setImage('');
            setCaption('');
          } else if (uploadedImageRef.current) {
            // Восстанавливаем загруженное изображение
            setImage(uploadedImageRef.current);
          }
        }
      }
      // НЕ обрабатываем isInitialMount здесь - это может вызвать проблемы при перерендере
    }, [photoId]); // Зависим ТОЛЬКО от photoId - это стабильное значение
    
    // Отдельный эффект для сохранения изображения при первом монтировании
    useEffect(() => {
      if (isInitialMountRef.current && !photoId && image && image.startsWith('data:image')) {
        uploadedImageRef.current = image;
      }
    }, []); // Только при монтировании
    
    // Постоянная защита от сброса изображения при перерендере
    // Этот эффект проверяет и восстанавливает изображение из хранилища, если оно было сброшено
    useEffect(() => {
      // Только для новой формы (без ID) и только если пользователь загрузил изображение
      // И изображение не было явно удалено (ref не null)
      if (!photoId && userHasUploadedRef.current && uploadedImageRef.current) {
        // Если изображение пустое, но в ref или хранилище есть - восстанавливаем
        if (!image) {
          // Сначала проверяем хранилище
          const storedImage = uploadedImagesStore && uploadedImagesStore.has(formKey) 
            ? uploadedImagesStore.get(formKey) 
            : null;
          
          if (storedImage) {
            // Восстанавливаем из хранилища
            uploadedImageRef.current = storedImage;
            setImage(storedImage);
            return;
          }
          
          // Если в хранилище нет, но в ref есть - восстанавливаем из ref
          if (uploadedImageRef.current) {
            // Сохраняем в хранилище для будущих перерендеров
            if (uploadedImagesStore && formKey) {
              uploadedImagesStore.set(formKey, uploadedImageRef.current);
            }
            setImage(uploadedImageRef.current);
          }
        }
      }
    }); // Без зависимостей - срабатывает при каждом рендере для защиты

    const handleChange = (e) => {
      if (e.target.name === 'caption') {
        setCaption(e.target.value);
      }
    };

    const processFile = async (file) => {
      if (!file) {
        return;
      }

      // Проверяем тип файла (MIME-тип и расширение)
      if (!isImageFile(file)) {
        onAlert('Выберите файл изображения (JPG, PNG, GIF, WEBP, BMP, SVG, HEIC и другие форматы)', 'error');
        return;
      }

      // Проверяем размер файла (максимум 5MB)
      if (file.size > 5 * 1024 * 1024) {
        onAlert('Размер файла не должен превышать 5MB', 'error');
        return;
      }

      setIsUploading(true);
      try {
        const base64 = await convertFileToBase64(file);
        
        // Устанавливаем флаг, что пользователь загрузил изображение
        userHasUploadedRef.current = true;
        uploadedImageRef.current = base64; // Сохраняем в ref для защиты от сброса
        
        // Сохраняем в глобальное хранилище, чтобы не потерять при перерендере
        if (uploadedImagesStore && formKey) {
          uploadedImagesStore.set(formKey, base64);
        }
        
        // Обновляем состояние изображения через функциональное обновление
        // чтобы гарантировать, что мы используем актуальное состояние
        setImage(prevImage => {
          // Если изображение уже установлено и совпадает, не обновляем
          if (prevImage === base64) {
            return prevImage;
          }
          return base64;
        });
        
        // Откладываем вызов onAlert, чтобы дать React время обновить состояние
        // Используем задержку, чтобы гарантировать, что состояние обновлено
        // и компонент успел отрендериться с новым изображением
        setTimeout(() => {
          // Финальная проверка перед вызовом onAlert
          setImage(currentImage => {
            // Если изображение было сброшено, но в ref оно есть - восстанавливаем
            if (!currentImage && uploadedImageRef.current) {
              return uploadedImageRef.current;
            }
            return currentImage;
          });
          
          // Вызываем onAlert только после подтверждения, что изображение установлено
          onAlert('Изображение загружено', 'success');
        }, 150);
      } catch (error) {
        console.error('Ошибка загрузки файла:', error);
        onAlert('Ошибка загрузки файла', 'error');
      } finally {
        setIsUploading(false);
      }
    };

    const handleFileChange = async (e) => {
      // Защита от повторных вызовов
      if (isProcessingFileRef.current) {
        return;
      }
      
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }
      
      // Устанавливаем флаг обработки
      isProcessingFileRef.current = true;
      
      // Сохраняем ссылку на input для очистки после обработки
      const input = e.target;
      
      try {
        await processFile(file);
      } finally {
        // Сбрасываем флаг обработки
        isProcessingFileRef.current = false;
        
        // Очищаем input после обработки, чтобы можно было выбрать тот же файл снова
        // Делаем это с небольшой задержкой, чтобы не мешать обработке
        setTimeout(() => {
          if (input) {
            input.value = '';
          }
        }, 100);
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDrop = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        console.log('Файл перетащен (PhotoForm):', file.name, file.type, file.size);
        await processFile(file);
      }
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!image || !image.trim()) {
        onAlert('Загрузите изображение', 'error');
        return;
      }
      
      if (!image.startsWith('data:image')) {
        onAlert('Ошибка: изображение не загружено правильно', 'error');
        return;
      }
      
      const photoData = {
        ...(photo?.id && { id: photo.id }),
        image: image.trim(),
        caption: caption.trim() || undefined
      };
      
      onSave(photoData);
    };

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h2>{photo ? 'Редактировать фото' : 'Добавить фото'}</h2>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label>Загрузить файл *</label>
              <div 
                className={`file-upload-dropzone ${isDragging ? 'dragging' : ''} ${image ? 'has-image' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="file-upload-wrapper">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="file-input-hidden"
                    disabled={isUploading}
                  />
                  <button
                    type="button"
                    className="file-upload-button"
                    onClick={(e) => {
                      e.preventDefault();
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <span className="upload-icon">⏳</span>
                        <span>Загрузка...</span>
                      </>
                    ) : (
                      <>
                        <span className="upload-icon">📷</span>
                        <span>Выбрать изображение</span>
                      </>
                    )}
                  </button>
                  {image && !isUploading && (
                    <button
                      type="button"
                      className="file-remove-button"
                      onClick={() => {
                        userHasUploadedRef.current = false; // Сбрасываем флаг при удалении
                        uploadedImageRef.current = null; // Очищаем ref
                        // Очищаем из хранилища
                        if (uploadedImagesStore && formKey) {
                          uploadedImagesStore.delete(formKey);
                        }
                        setImage('');
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {!image && (
                  <p className="drag-drop-hint">
                    или перетащите изображение сюда
                  </p>
                )}
              </div>
            </div>

            {image && image.trim() ? (
              <div className="form-group">
                <label>Предпросмотр:</label>
                <div className="photo-preview-modern">
                  <img
                    src={image}
                    alt="Предпросмотр"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/300x200/8B7355/FFFFFF?text=Тбилиси';
                    }}
                  />
                  <div className="photo-preview-overlay">
                    <span className="preview-badge">Предпросмотр</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="form-group">
                <p style={{ color: '#999', fontStyle: 'italic', fontSize: '0.9rem' }}>
                  Предпросмотр появится после выбора файла
                </p>
              </div>
            )}

            <div className="form-group">
              <label>Подпись (необязательно)</label>
              <input
                type="text"
                name="caption"
                value={caption}
                onChange={handleChange}
                placeholder="Подпись к фотографии"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="save-btn">
                {photo ? 'Обновить' : 'Добавить'}
              </button>
              <button type="button" className="cancel-btn" onClick={onCancel}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const MenuItemForm = ({ item, onSave, onCancel, onAlert, menuImagesStore, formKey }) => {
    const defaultCategory = categories.length > 0 ? categories[0].key : 'cold';
    
    // Извлекаем ID элемента для отслеживания изменений
    const itemId = useMemo(() => item?.id, [item?.id]);
    
    // Сохраняем ID элемента для отслеживания изменений
    const itemIdRef = useRef(itemId);
    const isInitialMountRef = useRef(true);
    
    // Инициализируем refs ДО useState, чтобы можно было использовать их в инициализаторе
    const fileInputRef = useRef(null);
    const isProcessingFileRef = useRef(false); // Флаг: файл обрабатывается
    const uploadedImageRef = useRef(null); // Сохраняем загруженное изображение
    const userHasUploadedRef = useRef(false); // Флаг: пользователь загрузил изображение
    
    // Ключ для сохранения данных формы в localStorage
    const formDataStorageKey = `menu-item-form-${formKey}`;
    
    // Используем отдельное состояние для изображения (как в PhotoForm)
    const [image, setImage] = useState(() => {
      // Сначала проверяем хранилище
      if (menuImagesStore && menuImagesStore.has(formKey)) {
        const storedImage = menuImagesStore.get(formKey);
        // Если в хранилище есть изображение, устанавливаем флаги
        if (storedImage && storedImage.startsWith('data:image')) {
          userHasUploadedRef.current = true;
          uploadedImageRef.current = storedImage;
        }
        return storedImage;
      }
      return item?.image || '';
    });
    
    const [formData, setFormData] = useState(() => {
      // Если редактируем существующий элемент - используем его данные
      if (item) {
        return {
          name: item.name || '',
          price: item.price.toString().replace(' ₽', ''),
          weight: item.weight || '',
          description: item.description || '',
          category: item.category || defaultCategory
        };
      }
      
      // Для новой формы - пытаемся восстановить из localStorage
      const savedFormData = localStorage.getItem(formDataStorageKey);
      if (savedFormData) {
        try {
          const parsed = JSON.parse(savedFormData);
          return {
            name: parsed.name || '',
            price: parsed.price || '',
            weight: parsed.weight || '',
            description: parsed.description || '',
            category: parsed.category || defaultCategory
          };
        } catch (e) {
          console.error('Ошибка восстановления данных формы из localStorage:', e);
        }
      }
      
      // Если нет сохраненных данных - создаем пустую форму
      return {
        name: '',
        price: '',
        weight: '',
        description: '',
        category: defaultCategory
      };
    });

    const [errors, setErrors] = useState({});
    const [isUploading, setIsUploading] = useState(false);
    
    // Инициализация только при изменении ID элемента (не при каждом рендере)
    useEffect(() => {
      const isInitialMount = isInitialMountRef.current;
      isInitialMountRef.current = false;
      
      // Если ID изменился (переключение между редактированием и созданием нового)
      if (itemIdRef.current !== itemId) {
        itemIdRef.current = itemId;
        
        // Если пользователь уже загрузил изображение для новой формы, НЕ сбрасываем его
        if (userHasUploadedRef.current && !itemId && uploadedImageRef.current) {
          // Восстанавливаем загруженное изображение
          setImage(uploadedImageRef.current);
          return; // Сохраняем загруженное пользователем изображение
        }
        
        // Если редактируем существующий элемент - загружаем его данные
        if (itemId && item) {
          // Если пользователь уже загрузил новое изображение при редактировании, НЕ сбрасываем его
          if (userHasUploadedRef.current && uploadedImageRef.current) {
            // Проверяем хранилище
            const storedImage = menuImagesStore && menuImagesStore.has(formKey) 
              ? menuImagesStore.get(formKey) 
              : uploadedImageRef.current;
            
            // Восстанавливаем загруженное пользователем изображение
            setImage(storedImage);
            uploadedImageRef.current = storedImage;
            
            // Обновляем только форму, но не изображение
            setFormData({
              name: item.name || '',
              price: item.price.toString().replace(' ₽', ''),
              weight: item.weight || '',
              description: item.description || '',
              category: item.category || defaultCategory
            });
          } else {
            // Пользователь еще не загрузил новое изображение - используем существующее
          userHasUploadedRef.current = false;
          uploadedImageRef.current = null;
          setImage(item.image || '');
          setFormData({
            name: item.name || '',
            price: item.price.toString().replace(' ₽', ''),
            weight: item.weight || '',
            description: item.description || '',
            category: item.category || defaultCategory
          });
          }
        } else {
          // Новая форма - сбрасываем только если пользователь еще ничего не загрузил
          if (!userHasUploadedRef.current && !uploadedImageRef.current) {
            setImage('');
            setFormData({
              name: '',
              price: '',
              weight: '',
              description: '',
              category: defaultCategory
            });
          } else if (uploadedImageRef.current) {
            // Восстанавливаем загруженное изображение
            setImage(uploadedImageRef.current);
          }
        }
      }
    }, [itemId, item, defaultCategory]);
    
    // Отдельный эффект для сохранения изображения при первом монтировании
    useEffect(() => {
      if (isInitialMountRef.current && !itemId && image && image.startsWith('data:image')) {
        uploadedImageRef.current = image;
      }
    }, []); // Только при монтировании
    
    // Постоянная защита от сброса изображения при перерендере
    // Этот эффект проверяет и восстанавливает изображение из хранилища, если оно было сброшено
    // Работает для новых форм (без itemId) и при редактировании (с itemId), если пользователь загрузил новое изображение
    useEffect(() => {
      // Если пользователь загрузил изображение (для новой формы или при редактировании)
      if (userHasUploadedRef.current) {
        // Сначала проверяем хранилище
        const storedImage = menuImagesStore && menuImagesStore.has(formKey) 
          ? menuImagesStore.get(formKey) 
          : null;
        
        if (storedImage) {
          // Восстанавливаем из хранилища
          uploadedImageRef.current = storedImage;
          // Обновляем состояние только если текущее изображение отличается
          setImage(prevImage => {
            if (prevImage !== storedImage) {
              return storedImage;
            }
            return prevImage;
          });
          return;
        }
        
        // Если в хранилище нет, но в ref есть - восстанавливаем из ref
        if (uploadedImageRef.current) {
          // Сохраняем в хранилище для будущих перерендеров
          if (menuImagesStore && formKey) {
            menuImagesStore.set(formKey, uploadedImageRef.current);
          }
          // Обновляем состояние только если текущее изображение отличается
          setImage(prevImage => {
            if (prevImage !== uploadedImageRef.current) {
              return uploadedImageRef.current;
            }
            return prevImage;
          });
        }
      }
    }); // Без зависимостей - срабатывает при каждом рендере для защиты

    const validateField = (name, value) => {
      const newErrors = { ...errors };
      
      switch (name) {
        case 'name':
          if (!value.trim()) newErrors.name = 'Название обязательно';
          else delete newErrors.name;
          break;
        case 'price':
          if (!value || isNaN(parseFloat(value)) || parseFloat(value) <= 0) 
            newErrors.price = 'Введите корректную цену';
          else delete newErrors.price;
          break;
        case 'weight':
          if (!value.trim()) newErrors.weight = 'Вес/объем обязателен';
          else delete newErrors.weight;
          break;
        case 'description':
          if (!value.trim()) newErrors.description = 'Описание обязательно';
          else delete newErrors.description;
          break;
        case 'image':
          if (!value.trim()) newErrors.image = 'Загрузите изображение';
          else if (!value.startsWith('data:image')) {
            newErrors.image = 'Загрузите файл изображения';
          }
          else delete newErrors.image;
          break;
        default:
          break;
      }
      
      setErrors(newErrors);
    };

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => {
        const updated = {
          ...prev,
          [name]: value
        };
        
        // Сохраняем данные формы в localStorage при каждом изменении
        // Только для новых элементов (не при редактировании)
        if (!item) {
          try {
            const dataToSave = {
              ...updated,
              image: image // Сохраняем изображение из отдельного состояния
            };
            localStorage.setItem(formDataStorageKey, JSON.stringify(dataToSave));
            console.log('💾 MenuItemForm: Данные формы сохранены в localStorage');
          } catch (e) {
            console.error('Ошибка сохранения данных формы в localStorage:', e);
          }
        }
        
        validateField(name, value);
        return updated;
      });
    };

    const handleFileChange = async (e) => {
      // Защита от повторных вызовов
      if (isProcessingFileRef.current) {
        return;
      }
      
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }
      
      // Устанавливаем флаг обработки
      isProcessingFileRef.current = true;
      
      // Сохраняем ссылку на input для очистки после обработки
      const input = e.target;

      // Проверяем тип файла (MIME-тип и расширение)
      if (!isImageFile(file)) {
        onAlert('Выберите файл изображения (JPG, PNG, GIF, WEBP, BMP, SVG, HEIC и другие форматы)', 'error');
        isProcessingFileRef.current = false;
        return;
      }

      // Проверяем размер файла (максимум 5MB)
      if (file.size > 5 * 1024 * 1024) {
        onAlert('Размер файла не должен превышать 5MB', 'error');
        isProcessingFileRef.current = false;
        return;
      }

      setIsUploading(true);
      try {
        const base64 = await convertFileToBase64(file);
        
        // Устанавливаем флаг, что пользователь загрузил изображение
        userHasUploadedRef.current = true;
        uploadedImageRef.current = base64; // Сохраняем в ref для защиты от сброса
        
        // Сохраняем в глобальное хранилище, чтобы не потерять при перерендере
        if (menuImagesStore && formKey) {
          menuImagesStore.set(formKey, base64);
        }
        
        // Обновляем состояние изображения через функциональное обновление
        // чтобы гарантировать, что мы используем актуальное состояние
        setImage(prevImage => {
          // Если изображение уже установлено и совпадает, не обновляем
          if (prevImage === base64) {
            return prevImage;
          }
          return base64;
        });
        
        // Сохраняем данные формы в localStorage при загрузке изображения
        // Только для новых элементов (не при редактировании)
        if (!item) {
          try {
            const dataToSave = {
              ...formData,
              image: base64
            };
            localStorage.setItem(formDataStorageKey, JSON.stringify(dataToSave));
            console.log('💾 handleFileChange: Данные формы сохранены в localStorage');
          } catch (e) {
            console.error('Ошибка сохранения данных формы в localStorage:', e);
          }
        }
        
        // Валидацию вызываем после обновления состояния
        setTimeout(() => validateField('image', base64), 0);
        
        // Откладываем вызов onAlert, чтобы дать React время обновить состояние
        setTimeout(() => {
          // Финальная проверка перед вызовом onAlert
          setImage(currentImage => {
            // Если изображение было сброшено, но в ref оно есть - восстанавливаем
            if (!currentImage && uploadedImageRef.current) {
              return uploadedImageRef.current;
            }
            return currentImage;
          });
          
          // Вызываем onAlert только после подтверждения, что изображение установлено
          onAlert('Изображение загружено', 'success');
        }, 150);
      } catch (error) {
        console.error('Ошибка загрузки файла (MenuItemForm):', error);
        onAlert('Ошибка загрузки файла', 'error');
      } finally {
        setIsUploading(false);
        // Сбрасываем флаг обработки
        isProcessingFileRef.current = false;
        
        // Очищаем input после обработки, чтобы можно было выбрать тот же файл снова
        setTimeout(() => {
          if (input) {
            input.value = '';
          }
        }, 100);
      }
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Валидация всех полей перед отправкой
      const newErrors = {};
      
      // Валидация изображения
      if (!image || !image.trim()) {
        newErrors.image = 'Загрузите изображение';
      } else if (!image.startsWith('data:image')) {
        newErrors.image = 'Загрузите файл изображения';
      }
      
      // Валидация остальных полей
      if (!formData.name?.trim()) {
        newErrors.name = 'Название обязательно';
      }
      if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
        newErrors.price = 'Введите корректную цену';
      }
      if (!formData.weight?.trim()) {
        newErrors.weight = 'Вес/объем обязателен';
      }
      if (!formData.description?.trim()) {
        newErrors.description = 'Описание обязательно';
      }
      
      setErrors(newErrors);

      if (Object.keys(newErrors).length === 0 && image && image.startsWith('data:image')) {
        // Очищаем localStorage при успешном сохранении
        if (!item) {
          try {
            localStorage.removeItem(formDataStorageKey);
            console.log('🗑️ MenuItemForm: Данные формы удалены из localStorage после сохранения');
          } catch (e) {
            console.error('Ошибка удаления данных формы из localStorage:', e);
          }
        }
        
        // Передаем данные с изображением
        onSave({
          ...formData,
          image: image.trim()
        });
      } else {
        if (!image || !image.startsWith('data:image')) {
          onAlert('Загрузите изображение', 'error');
        } else {
          onAlert('Исправьте ошибки в форме', 'error');
        }
      }
    };

    const isFormValid = () => {
      return formData.name && 
             formData.price && 
             formData.weight && 
             formData.description && 
             image &&
             Object.keys(errors).length === 0;
    };

    return (
      <div className="form-modal">
        <div className="form-content">
          <h3>{item ? 'Редактировать блюдо' : 'Добавить новое блюдо'}</h3>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label>Название *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? 'error' : ''}
                placeholder="Введите название блюда"
                required
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Цена (₽) *</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className={errors.price ? 'error' : ''}
                  placeholder="0"
                  min="1"
                  required
                />
                {errors.price && <span className="error-text">{errors.price}</span>}
              </div>

              <div className="form-group">
                <label>Вес/Объем *</label>
                <input
                  type="text"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  className={errors.weight ? 'error' : ''}
                  placeholder="150 г или 500 мл"
                  required
                />
                {errors.weight && <span className="error-text">{errors.weight}</span>}
              </div>

              <div className="form-group">
                <label>Категория *</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.key}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Описание *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={errors.description ? 'error' : ''}
                rows="3"
                placeholder="Опишите блюдо"
                required
              />
              {errors.description && <span className="error-text">{errors.description}</span>}
            </div>

            <div className="form-group">
              <label>Загрузить файл *</label>
              <div className="file-upload-wrapper">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="file-input-hidden"
                  disabled={isUploading}
                />
                <button
                  type="button"
                  className="file-upload-button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (fileInputRef.current) {
                      console.log('Клик по кнопке (MenuItemForm), открываем файловый диалог');
                      fileInputRef.current.click();
                    } else {
                      console.error('fileInputRef.current is null (MenuItemForm)');
                    }
                  }}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <span className="upload-icon">⏳</span>
                      <span>Загрузка...</span>
                    </>
                  ) : (
                    <>
                      <span className="upload-icon">📷</span>
                      <span>Выбрать изображение</span>
                    </>
                  )}
                </button>
                {image && !isUploading && (
                  <button
                    type="button"
                    className="file-remove-button"
                    onClick={() => {
                      userHasUploadedRef.current = false;
                      uploadedImageRef.current = null;
                      // Очищаем из хранилища
                      if (menuImagesStore && formKey) {
                        menuImagesStore.delete(formKey);
                      }
                      setImage('');
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                      validateField('image', '');
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              {errors.image && <span className="error-text">{errors.image}</span>}
            </div>

            {image && image.trim() && (
              <div className="form-group">
                <label>Предпросмотр:</label>
                <div className="photo-preview-modern">
                  <img
                    key={image.substring(0, 50)}
                    src={image}
                    alt="Предпросмотр"
                    onLoad={() => console.log('Изображение загружено в предпросмотр (MenuItemForm)')}
                    onError={(e) => {
                      console.error('Ошибка загрузки изображения в предпросмотр (MenuItemForm)');
                      e.target.src = 'https://via.placeholder.com/300x200/8B7355/FFFFFF?text=Тбилиси';
                    }}
                  />
                  <div className="photo-preview-overlay">
                    <span className="preview-badge">Предпросмотр</span>
                  </div>
                </div>
              </div>
            )}
            {!image && (
              <div className="form-group">
                <p style={{ color: '#999', fontStyle: 'italic', fontSize: '0.9rem' }}>
                  Предпросмотр появится после выбора файла
                </p>
              </div>
            )}

            <div className="form-actions">
              <button 
                type="submit" 
                className="save-btn"
                disabled={!isFormValid()}
              >
                {item ? 'Обновить' : 'Добавить'}
              </button>
              <button type="button" className="cancel-btn" onClick={onCancel}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const formatPrice = (price) => {
    if (typeof price === 'string' && price.includes('₽')) {
      return price;
    }
    const priceNum = parseInt(price);
    return isNaN(priceNum) ? '0 ₽' : `${priceNum} ₽`;
  };

  const handleImageError = (e) => {
    e.target.src = 'https://via.placeholder.com/300x200/8B7355/FFFFFF?text=Тбилиси';
  };

  // Стабилизируем photo prop для PhotoForm, чтобы избежать пересоздания компонента
  const stablePhotoForForm = useMemo(() => {
    if (editingPhoto === null) return null;
    return editingPhoto.id ? editingPhoto : null;
  }, [editingPhoto?.id]);

  // Если не авторизован, показываем форму входа
  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        {/* Кнопка выхода */}
        <div className="admin-header">
          <h1>Админ-панель "Тбилиси"</h1>
          <button onClick={handleLogout} className="logout-btn">
            Выйти
          </button>
        </div>
        
        {/* Уведомления */}
        {showNotification && (
          <div className={`admin-notification ${notificationType}`}>
            {notificationMessage}
            <button onClick={() => setShowNotification(false)}>×</button>
          </div>
        )}

        {/* Переключатель вкладок */}
        <div className="admin-tabs">
          <button 
            className={`tab-button ${activeTab === 'reservations' ? 'active' : ''}`}
            onClick={() => handleTabChange('reservations')}
          >
            Заявки ({reservations.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'menu' ? 'active' : ''}`}
            onClick={() => handleTabChange('menu')}
          >
            Меню ({menuItems.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => handleTabChange('categories')}
          >
            Категории ({categories.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'themes' ? 'active' : ''}`}
            onClick={() => handleTabChange('themes')}
          >
            Темы ({Object.keys(themes).length + 1})
          </button>
          <button 
            className={`tab-button ${activeTab === 'photos' ? 'active' : ''}`}
            onClick={() => handleTabChange('photos')}
          >
            Фото ({photos.length})
          </button>
        </div>

        {/* Содержимое вкладок */}
        <div className="tab-content">
          {activeTab === 'reservations' && (
            <div className="reservations-tab">
              <h2>Заявки на бронирование</h2>
              
              {reservations.length === 0 ? (
                <p className="no-data">Нет заявок на бронь</p>
              ) : (
                <div className="reservations-list">
                  {reservations.map(reservation => (
                    <div key={reservation.id} className="reservation-card">
                      <div className="reservation-header">
                        <h3>{reservation.name}</h3>
                        <span className="reservation-date">
                          {new Date(reservation.createdAt).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      <div className="reservation-details">
                        <p><strong>Телефон:</strong> {reservation.phone}</p>
                        <p><strong>Дата:</strong> {reservation.date} в {reservation.time}</p>
                        <p><strong>Гостей:</strong> {reservation.guests}</p>
                        {reservation.comments && (
                          <p><strong>Комментарий:</strong> {reservation.comments}</p>
                        )}
                      </div>
                      <button 
                        onClick={() => {
                          if (window.confirm('Вы уверены, что хотите удалить эту заявку?')) {
                            deleteReservation(reservation.id);
                          }
                        }}
                        className="delete-btn"
                      >
                        Удалить
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="menu-tab">
              <div className="menu-header">
                <h2>Управление меню</h2>
                <button 
                  onClick={() => setEditingItem({})}
                  className="add-btn"
                >
                  + Добавить блюдо
                </button>
              </div>

              {menuItems.length === 0 ? (
                <p className="no-data">Меню пусто. Добавьте новые блюда через форму выше.</p>
              ) : (
                <div className="menu-items-grid">
                  {menuItems.map(item => (
                    <div key={item.id} className="menu-item-card">
                      <div className="item-image">
                        <img 
                          src={item.image} 
                          alt={item.name}
                          onError={handleImageError}
                        />
                      </div>
                      <div className="item-content">
                        <h4>{item.name}</h4>
                        <p className="item-price">{formatPrice(item.price)} · {item.weight}</p>
                        <p className="item-description">{item.description}</p>
                        <p className="item-category">
                          {categories.find(cat => cat.key === item.category)?.name || item.category}
                        </p>
                      </div>
                      <div className="item-actions">
                        <button 
                          onClick={() => startEditing(item)}
                          className="edit-btn"
                        >
                          Редактировать
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm('Вы уверены, что хотите удалить это блюдо?')) {
                              deleteMenuItem(item.id);
                            }
                          }}
                          className="delete-btn"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="categories-tab">
              <div className="categories-header">
                <h2>Управление категориями</h2>
                <button 
                  onClick={addCategory}
                  className="add-btn"
                >
                  + Добавить категорию
                </button>
              </div>

              {categories.length === 0 ? (
                <p className="no-data">Категорий нет. Добавьте новую категорию.</p>
              ) : (
                <div className="categories-list">
                  {categories.map((category, index) => (
                    <div key={category.id} className="category-card">
                      {editingCategory && editingCategory.id === category.id ? (
                        <div className="category-edit-form">
                          <input
                            type="text"
                            value={editingCategory.name}
                            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                            className="category-name-input"
                            placeholder="Название категории"
                            autoFocus
                          />
                          <div className="category-edit-actions">
                            <button 
                              onClick={() => updateCategory(editingCategory)}
                              className="save-btn"
                            >
                              Сохранить
                            </button>
                            <button 
                              onClick={() => setEditingCategory(null)}
                              className="cancel-btn"
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="category-info">
                            <h4>{category.name}</h4>
                            <p className="category-key">Ключ: {category.key}</p>
                            <p className="category-order">Порядок: {category.order}</p>
                            <p className="category-items-count">
                              Блюд в категории: {menuItems.filter(item => item.category === category.key).length}
                            </p>
                          </div>
                          <div className="category-actions">
                            <div className="category-order-controls">
                              <button
                                onClick={() => moveCategory(category.id, 'up')}
                                className="move-btn"
                                disabled={index === 0}
                                title="Переместить вверх"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => moveCategory(category.id, 'down')}
                                className="move-btn"
                                disabled={index === categories.length - 1}
                                title="Переместить вниз"
                              >
                                ↓
                              </button>
                            </div>
                            <button 
                              onClick={() => setEditingCategory({ ...category })}
                              className="edit-btn"
                            >
                              Редактировать
                            </button>
                            <button 
                              onClick={() => {
                                if (window.confirm('Вы уверены, что хотите удалить эту категорию?')) {
                                  deleteCategory(category.id);
                                }
                              }}
                              className="delete-btn"
                            >
                              Удалить
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'themes' && (
            <div className="themes-tab">
              <div className="themes-header">
                <h2>Управление темами</h2>
                <button 
                  onClick={addTheme}
                  className="add-btn"
                >
                  + Добавить тему
                </button>
              </div>

              <div className="themes-list">
                {/* Тема по умолчанию */}
                <div className={`theme-card ${currentTheme === 'default' ? 'active' : ''}`}>
                  <div className="theme-preview">
                    <div className="theme-preview-colors">
                      <div className="preview-color" style={{ background: '#8B7355' }}></div>
                      <div className="preview-color" style={{ background: '#A8D8EA' }}></div>
                      <div className="preview-color" style={{ background: '#D4B896' }}></div>
                    </div>
                  </div>
                  <div className="theme-info">
                    <h4>По умолчанию</h4>
                    <p className="theme-description">Базовая земляная тема</p>
                  </div>
                  <div className="theme-actions">
                    <button 
                      onClick={() => applyTheme('default')}
                      className={`apply-btn ${currentTheme === 'default' ? 'active' : ''}`}
                    >
                      {currentTheme === 'default' ? '✓ Применена' : 'Применить'}
                    </button>
                  </div>
                </div>

                {/* Базовые темы */}
                {Object.values(defaultThemes).map(theme => (
                  <div key={theme.id} className={`theme-card ${currentTheme === theme.id ? 'active' : ''}`}>
                    <div className="theme-preview">
                      <div className="theme-preview-colors">
                        <div className="preview-color" style={{ background: theme.primaryColor }}></div>
                        <div className="preview-color" style={{ background: theme.secondaryColor }}></div>
                        <div className="preview-color" style={{ background: theme.accentColor }}></div>
                      </div>
                    </div>
                    <div className="theme-info">
                      <h4>{theme.name}</h4>
                      <p className="theme-description">Базовая тема</p>
                    </div>
                    <div className="theme-actions">
                      <button 
                        onClick={() => applyTheme(theme.id)}
                        className={`apply-btn ${currentTheme === theme.id ? 'active' : ''}`}
                      >
                        {currentTheme === theme.id ? '✓ Применена' : 'Применить'}
                      </button>
                    </div>
                  </div>
                ))}

                {/* Пользовательские темы */}
                {Object.values(themes).filter(theme => !defaultThemes[theme.id]).map(theme => (
                  <div key={theme.id} className={`theme-card ${currentTheme === theme.id ? 'active' : ''}`}>
                    {editingTheme && editingTheme.id === theme.id ? (
                      <ThemeEditForm
                        theme={editingTheme}
                        onSave={updateTheme}
                        onCancel={() => setEditingTheme(null)}
                      />
                    ) : (
                      <>
                        <div className="theme-preview">
                          <div className="theme-preview-colors">
                            <div className="preview-color" style={{ background: theme.primaryColor }}></div>
                            <div className="preview-color" style={{ background: theme.secondaryColor }}></div>
                            <div className="preview-color" style={{ background: theme.accentColor }}></div>
                          </div>
                        </div>
                        <div className="theme-info">
                          <h4>{theme.name}</h4>
                          <p className="theme-description">Пользовательская тема</p>
                        </div>
                        <div className="theme-actions">
                          <button 
                            onClick={() => applyTheme(theme.id)}
                            className={`apply-btn ${currentTheme === theme.id ? 'active' : ''}`}
                          >
                            {currentTheme === theme.id ? '✓ Применена' : 'Применить'}
                          </button>
                          <button 
                            onClick={() => setEditingTheme({ ...theme })}
                            className="edit-btn"
                          >
                            Редактировать
                          </button>
                          {!defaultThemes[theme.id] && (
                            <button 
                              onClick={() => {
                                if (window.confirm('Вы уверены, что хотите удалить эту тему?')) {
                                  deleteTheme(theme.id);
                                }
                              }}
                              className="delete-btn"
                            >
                              Удалить
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="photos-tab">
              <div className="photos-header">
                <h2>Управление фотографиями</h2>
                <button
                  onClick={() => {
                    // Используем стабильный объект для новой формы
                    setEditingPhoto(newPhotoObjectRef.current);
                  }}
                  className="add-btn"
                >
                  + Добавить фото
                </button>
              </div>

              {photos.length === 0 ? (
                <p className="no-data">Фотографий нет. Добавьте новую фотографию.</p>
              ) : (
                <div className="photos-grid">
                  {photos.map(photo => (
                    <div key={photo.id} className="photo-card">
                      <div className="photo-image">
                        <img
                          src={photo.image}
                          alt={photo.caption || 'Фото'}
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/300x200/8B7355/FFFFFF?text=Тбилиси';
                          }}
                        />
                      </div>
                      <div className="photo-info">
                        {photo.caption && (
                          <p className="photo-caption">{photo.caption}</p>
                        )}
                        {!photo.caption && (
                          <p className="photo-caption-empty">Без подписи</p>
                        )}
                      </div>
                      <div className="photo-actions">
                        <button
                          onClick={() => setEditingPhoto({ ...photo })}
                          className="edit-btn"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Вы уверены, что хотите удалить это фото?')) {
                              deletePhoto(photo.id);
                            }
                          }}
                          className="delete-btn"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Модальное окно для редактирования/добавления */}
        {editingItem !== null && (
          <MenuItemForm
            key={editingItem?.id || newMenuItemKeyRef.current} // Стабильный key
            item={editingItem.id ? editingItem : null}
            onSave={saveMenuItem}
            onCancel={cancelEditing}
            onAlert={showAlert}
            menuImagesStore={menuImagesStore.current} // Передаем хранилище для сохранения состояния
            formKey={editingItem?.id || newMenuItemKeyRef.current} // Уникальный ключ формы
          />
        )}

        {/* Модальное окно для редактирования/добавления фотографий */}
        {editingPhoto !== null && (
          <PhotoForm
            key={editingPhoto?.id || newPhotoKeyRef.current} // Стабильный key
            photo={stablePhotoForForm}
            onSave={savePhoto}
            onCancel={cancelPhotoEditing}
            onAlert={showAlert}
            uploadedImagesStore={uploadedImagesStore.current} // Передаем хранилище для сохранения состояния
            formKey={editingPhoto?.id || newPhotoKeyRef.current} // Уникальный ключ формы
          />
        )}
      </div>
    </div>
  );
};

export default Admin;