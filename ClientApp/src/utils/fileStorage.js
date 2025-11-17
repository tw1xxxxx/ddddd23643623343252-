// Утилита для работы с данными через статические JSON файлы
// Все данные сохраняются через API напрямую в файлы проекта

// Определяем URL API
const getApiUrl = () => {
  const port = window.location.port;
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // В development режиме (React dev server на порту 3000)
  if (port === '3000' || hostname === 'localhost' || hostname === '127.0.0.1') {
    const apiUrl = 'http://localhost:5000/api';
    console.log(`🔍 getApiUrl: Development режим, используем ${apiUrl}`);
    return apiUrl;
  }
  
  // В production используем относительный путь (работаем через тот же домен)
  const apiUrl = '/api';
  console.log(`🔍 getApiUrl: Production режим, используем относительный путь ${apiUrl}`);
  return apiUrl;
};

// Сохранение файла через API (напрямую в файл проекта)
const saveToProjectFile = async (data, filename) => {
  try {
    console.log(`💾 saveToProjectFile: Сохранение ${filename}...`);
    console.log(`💾 saveToProjectFile: Данные (первые 100 символов):`, JSON.stringify(data).substring(0, 100));
    
    const apiUrl = getApiUrl();
    const url = `${apiUrl}/files/${filename}`;
    console.log(`💾 saveToProjectFile: URL: ${url}`);
    
    console.log(`💾 saveToProjectFile: Отправка запроса на ${url}...`);
    console.log(`💾 saveToProjectFile: Метод: POST, Headers: Content-Type: application/json`);
    
    let response;
    try {
      response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
      console.log(`💾 saveToProjectFile: Ответ получен:`, response.status, response.statusText);
    } catch (fetchError) {
      console.error(`❌ saveToProjectFile: Ошибка fetch:`, fetchError);
      console.error(`❌ saveToProjectFile: Тип ошибки:`, fetchError.name);
      console.error(`❌ saveToProjectFile: Сообщение:`, fetchError.message);
      throw new Error(`Не удалось отправить запрос: ${fetchError.message}. Проверьте, что бэкенд запущен на порту 5000 и доступен.`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ saveToProjectFile: Ошибка HTTP ${response.status}:`, errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ saveToProjectFile: ${filename} успешно сохранен:`, result.message);
    console.log(`✅ saveToProjectFile: Путь сохранения:`, result.path);
    return { 
      success: true, 
      message: result.message || `Файл ${filename} успешно сохранен в проект`,
      path: result.path
    };
  } catch (error) {
    console.error(`❌ saveToProjectFile: Ошибка сохранения ${filename} через API:`, error);
    return { 
      success: false, 
      message: `Не удалось сохранить ${filename}: ${error.message}. Убедитесь, что бэкенд запущен на порту 5000.` 
    };
  }
};

// Загрузка данных из файла через fetch
export const loadDataFromFile = async (filename) => {
  try {
    // Используем timestamp для предотвращения кеширования
    const timestamp = Date.now();
    const url = `/${filename}?t=${timestamp}`;
    console.log(`📥 loadDataFromFile: Загрузка ${filename} с URL: ${url}`);
    
    // Используем cache: 'no-store' для предотвращения кеширования
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ loadDataFromFile: HTTP ошибка ${response.status} для ${filename}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ loadDataFromFile: ${filename} загружен, элементов:`, Array.isArray(data) ? data.length : 'не массив');
    
    // НЕ сохраняем фотографии в localStorage (они слишком большие)
    // Для других файлов синхронизируем с localStorage
    if (filename !== 'theme.json' && filename !== 'photos.json') {
      const storageKey = `restaurant-${filename.replace('.json', '')}`;
      try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (storageError) {
        console.warn(`⚠️ loadDataFromFile: Не удалось сохранить ${filename} в localStorage:`, storageError);
      }
    }
    
    return { success: true, data };
  } catch (error) {
    console.error(`❌ loadDataFromFile: Ошибка загрузки ${filename}:`, error);
    
    // Fallback на localStorage только для НЕ фотографий
    if (filename !== 'photos.json') {
    const stored = localStorage.getItem(`restaurant-${filename.replace('.json', '')}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
          console.log(`📥 loadDataFromFile: Использован fallback из localStorage для ${filename}`);
        return { success: true, data: parsed };
      } catch (e) {
          console.error(`❌ loadDataFromFile: Ошибка парсинга данных из localStorage для ${filename}:`, e);
        return { success: false, message: 'Ошибка парсинга данных' };
        }
      }
    }
    
    return { success: false, message: 'Файл не найден' };
  }
};

// Загрузка темы из файла
export const loadTheme = async () => {
  const result = await loadDataFromFile('theme.json');
  if (result.success) {
    const themeData = result.data;
    const currentThemeId = localStorage.getItem('restaurant-theme') || 'default';
    const newThemeId = themeData.currentTheme || 'default';
    
    // Синхронизируем с localStorage в правильном формате
    if (themeData.currentTheme) {
      localStorage.setItem('restaurant-theme', themeData.currentTheme);
    }
    if (themeData.themes) {
      localStorage.setItem('restaurant-themes', JSON.stringify(themeData.themes));
    }
    
    // Если тема изменилась, применяем её (но не перезаписываем, если уже применена)
    if (newThemeId !== currentThemeId) {
      // Тема изменилась в файле, но не применяем здесь - пусть Header.js это сделает
      // чтобы избежать конфликтов с уже примененной темой
    }
    
    return themeData;
  }
  // Возвращаем дефолтную тему
  const defaultTheme = {
    currentTheme: 'default',
    themes: {
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
    }
  };
  // Синхронизируем дефолтную тему с localStorage
  localStorage.setItem('restaurant-theme', defaultTheme.currentTheme);
  localStorage.setItem('restaurant-themes', JSON.stringify(defaultTheme.themes));
  return defaultTheme;
};

// Загрузка меню из файла
export const loadMenu = async () => {
  console.log('📥 loadMenu: Начало загрузки меню...');
  
  // Загружаем меню с сервера (не из localStorage, так как оно слишком большое)
  const result = await loadDataFromFile('menu.json');
  
  if (result.success && Array.isArray(result.data)) {
    console.log('📥 loadMenu: Получено позиций с сервера:', result.data.length);
    
    // Проверяем, что все элементы меню имеют корректные данные
    const validMenuItems = result.data.filter(item => {
      return item && 
             item.id && 
             item.name && 
             item.price !== undefined;
    });
    
    // Проверяем изображения (для отладки)
    const itemsWithImages = validMenuItems.filter(item => item.image && item.image.startsWith('data:image'));
    console.log(`📥 loadMenu: Валидных позиций: ${validMenuItems.length}, с изображениями: ${itemsWithImages.length}`);
    
    // НЕ сохраняем в localStorage - меню слишком большое
    // Оно всегда загружается с сервера
    
    return validMenuItems;
  }
  
  console.warn('📥 loadMenu: Меню не загружено с сервера, проверяем localStorage (fallback)...');
  
  // Если файл не найден, проверяем localStorage только для обратной совместимости
  // но это только для старых данных
  try {
    const stored = localStorage.getItem('restaurant-menu');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        console.log('📥 loadMenu: Найдено позиций в localStorage (fallback):', parsed.length);
        
        const validMenuItems = parsed.filter(item => {
          return item && 
                 item.id && 
                 item.name && 
                 item.price !== undefined;
        });
        
        console.log('📥 loadMenu: Валидных позиций из localStorage:', validMenuItems.length);
        return validMenuItems;
      }
    }
  } catch (error) {
    // Игнорируем ошибки localStorage
    console.warn('⚠️ loadMenu: Ошибка загрузки меню из localStorage:', error);
  }
  
  console.log('📥 loadMenu: Меню не найдено');
  return [];
};

// Загрузка заявок из файла
export const loadReservations = async () => {
  const result = await loadDataFromFile('reservations.json');
  if (result.success && Array.isArray(result.data)) {
    return result.data;
  }
  return [];
};

// Загрузка категорий из файла
export const loadCategories = async () => {
  const result = await loadDataFromFile('categories.json');
  if (result.success && Array.isArray(result.data)) {
    // Пустой массив - это валидное состояние (пользователь удалил все категории)
    // Возвращаем массив как есть, даже если он пустой
    return result.data;
  }
  
  // Если файл не найден или данные не массив, возвращаем null
  // Это позволит вызывающему коду определить, что это первая загрузка
  // и решить, использовать ли дефолтные категории
  console.warn('📥 loadCategories: Файл не найден или данные не массив');
  return null;
};

// Сохранение темы в файл проекта
export const saveTheme = async (themeData) => {
  // Сохраняем в localStorage для быстрого доступа
  localStorage.setItem('restaurant-theme', themeData.currentTheme);
  localStorage.setItem('restaurant-themes', JSON.stringify(themeData.themes));
  
  // Сохраняем напрямую в файл проекта через API
  const result = await saveToProjectFile(themeData, 'theme.json');
  return result;
};

// Сохранение меню в файл проекта
export const saveMenu = async (menuItems) => {
  console.log('💾 saveMenu: Начало сохранения меню, позиций:', menuItems?.length || 0);
  
  if (!Array.isArray(menuItems)) {
    console.error('❌ saveMenu: menuItems не является массивом:', typeof menuItems);
    return { success: false, message: 'menuItems должен быть массивом' };
  }
  
  // Проверяем, что все элементы меню имеют изображения (для отладки)
  const itemsWithImages = menuItems.filter(item => item.image && item.image.startsWith('data:image'));
  console.log(`💾 saveMenu: Позиций с изображениями: ${itemsWithImages.length} из ${menuItems.length}`);
  
  // НЕ сохраняем в localStorage - меню с base64 изображениями слишком большие
  // и могут превысить лимит localStorage (обычно 5-10MB)
  // Вместо этого сохраняем только на сервер
  
  // Сохраняем напрямую в файл проекта через API
  console.log('💾 saveMenu: Отправка на сервер...');
  const result = await saveToProjectFile(menuItems, 'menu.json');
  
  if (result.success) {
    console.log('✅ saveMenu: Меню успешно сохранено в файл:', result.path);
    console.log(`✅ saveMenu: Всего позиций сохранено: ${menuItems.length}, с изображениями: ${itemsWithImages.length}`);
    
    // Если сохранение на сервер успешно, пытаемся сохранить только метаданные в localStorage
    // (без base64 изображений) для быстрого доступа
    // ВАЖНО: Сохраняем метаданные даже для пустого массива, чтобы система знала, что меню было сохранено
    try {
      // Сохраняем только метаданные (без base64 изображений) для кеширования
      const menuMetadata = menuItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        weight: item.weight,
        description: item.description,
        category: item.category,
        // НЕ сохраняем image - это слишком большой объем данных
      }));
      // Сохраняем метаданные даже если массив пустой (это валидное состояние)
      localStorage.setItem('restaurant-menu-metadata', JSON.stringify(menuMetadata));
      console.log(`💾 saveMenu: Метаданные меню сохранены в localStorage (${menuMetadata.length} позиций)`);
    } catch (storageError) {
      // Если localStorage переполнен, просто игнорируем ошибку
      // Главное - данные сохранены на сервере
      console.warn('⚠️ saveMenu: Не удалось сохранить метаданные в localStorage:', storageError);
    }
  } else {
    console.error('❌ saveMenu: Ошибка сохранения:', result.message);
  }
  
  return result;
};

// Сохранение заявок в файл проекта - только для админ-панели
export const saveReservations = async (reservations) => {
  // Сохраняем в localStorage для быстрого доступа
  localStorage.setItem('restaurant-reservations', JSON.stringify(reservations));
  
  // Сохраняем напрямую в файл проекта через API
  const result = await saveToProjectFile(reservations, 'reservations.json');
  return result;
};

// Автоматическое сохранение заявок в файл проекта
export const autoSaveReservations = async (reservations) => {
  // Сохраняем в localStorage для быстрого доступа
  localStorage.setItem('restaurant-reservations', JSON.stringify(reservations));
  
  // Сохраняем напрямую в файл проекта через API
  const result = await saveToProjectFile(reservations, 'reservations.json');
  return result;
};

// Сохранение категорий в файл проекта
export const saveCategories = async (categories) => {
  console.log(`💾 saveCategories: Сохранение категорий, количество: ${categories?.length || 0}`);
  
  // ВАЖНО: Сохраняем категории даже если массив пустой (это валидное состояние)
  // Сохраняем в localStorage для быстрого доступа
  localStorage.setItem('restaurant-categories', JSON.stringify(categories));
  console.log(`💾 saveCategories: Категории сохранены в localStorage (${categories?.length || 0} категорий)`);
  
  // Сохраняем напрямую в файл проекта через API
  const result = await saveToProjectFile(categories, 'categories.json');
  
  if (result.success) {
    console.log(`✅ saveCategories: Категории успешно сохранены в файл (${categories?.length || 0} категорий)`);
  } else {
    console.error('❌ saveCategories: Ошибка сохранения:', result.message);
  }
  
  return result;
};

// Автоматическое сохранение (алиасы для обратной совместимости)
export const autoSaveMenu = saveMenu;
export const saveMenuToFile = saveMenu;
export const saveReservationsToFile = saveReservations;

// Загрузка фотографий из файла
export const loadPhotos = async () => {
  console.log('📸 loadPhotos: Начало загрузки фотографий...');
  
  // Загружаем фотографии с сервера (не из localStorage, так как они слишком большие)
  const result = await loadDataFromFile('photos.json');
  
  if (result.success && Array.isArray(result.data)) {
    console.log('📸 loadPhotos: Получено фотографий с сервера:', result.data.length);
    
    // Фильтруем пустые фотографии или фотографии без изображения
    const validPhotos = result.data.filter(photo => {
      const isValid = photo && 
                     photo.id && // Проверяем наличие ID
                     photo.image && 
                     photo.image.trim() && 
                     photo.image.startsWith('data:image');
      
      if (!isValid) {
        console.warn('📸 loadPhotos: Пропущена невалидная фотография:', {
          hasId: !!photo?.id,
          hasImage: !!photo?.image,
          imageType: photo?.image?.substring(0, 20)
        });
      }
      
      return isValid;
    });
    
    console.log('📸 loadPhotos: Валидных фотографий:', validPhotos.length);
    
    // НЕ сохраняем в localStorage - фотографии слишком большие
    // Они всегда загружаются с сервера
    
    return validPhotos;
  }
  
  console.warn('📸 loadPhotos: Фотографии не загружены с сервера, проверяем localStorage (fallback)...');
  
  // Если файл не найден, проверяем localStorage только для обратной совместимости
  // но это только для старых данных
  try {
    const stored = localStorage.getItem('restaurant-photos');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        console.log('📸 loadPhotos: Найдено фотографий в localStorage (fallback):', parsed.length);
        
        // Фильтруем валидные фотографии
        const validPhotos = parsed.filter(photo => {
          return photo && 
                 photo.id &&
                 photo.image && 
                 photo.image.trim() && 
                 photo.image.startsWith('data:image');
        });
        
        console.log('📸 loadPhotos: Валидных фотографий из localStorage:', validPhotos.length);
        return validPhotos;
      }
    }
  } catch (error) {
    // Игнорируем ошибки localStorage
    console.warn('⚠️ loadPhotos: Ошибка загрузки фотографий из localStorage:', error);
  }
  
  console.log('📸 loadPhotos: Фотографии не найдены');
  return [];
};

// Сохранение фотографий в файл проекта
export const savePhotos = async (photos) => {
  // НЕ сохраняем в localStorage - фотографии в base64 слишком большие
  // и могут превысить лимит localStorage (обычно 5-10MB)
  // Вместо этого сохраняем только на сервер
  
  // Сохраняем напрямую в файл проекта через API
  const result = await saveToProjectFile(photos, 'photos.json');
  
  // Если сохранение на сервер успешно, пытаемся сохранить только метаданные в localStorage
  // (без самих изображений) для быстрого доступа
  if (result.success) {
    try {
      // Сохраняем только метаданные (без base64 изображений) для кеширования
      const photosMetadata = photos.map(photo => ({
        id: photo.id,
        caption: photo.caption,
        // НЕ сохраняем image - это слишком большой объем данных
      }));
      localStorage.setItem('restaurant-photos-metadata', JSON.stringify(photosMetadata));
    } catch (storageError) {
      // Если localStorage переполнен, просто игнорируем ошибку
      // Главное - данные сохранены на сервере
      console.warn('Не удалось сохранить метаданные в localStorage:', storageError);
    }
  }
  
  return result;
};

// Автоматическое сохранение фотографий (сохраняет на сервер)
export const autoSavePhotos = async (photos) => {
  // Используем ту же логику, что и savePhotos
  return await savePhotos(photos);
};

export const savePhotosToFile = async (photos) => {
  // Алиас для обратной совместимости
  return await savePhotos(photos);
};

// Инициализация файлов (оставляем для обратной совместимости, но они не нужны)
export const initializeReservationsFile = async () => {
  return null;
};

export const initializeMenuFile = async () => {
  return null;
};

export const initializePhotosFile = async () => {
  return null;
};
