import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import './Menu.css';
import { defaultMenu } from '../data/defaultMenu';
import { loadMenu, loadCategories } from '../utils/fileStorage';

const Menu = () => {
  const [expandedItem, setExpandedItem] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [showCategoryBar, setShowCategoryBar] = useState(false);
  const categoryRefs = useRef({});
  const categoryBarRef = useRef(null);
  const activeButtonRef = useRef(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [menuItemPosition, setMenuItemPosition] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const menuModalContentRef = useRef(null);

  useEffect(() => {
    const loadMenuFromFile = async () => {
      try {
        // Загружаем категории из файла
        const loadedCategories = await loadCategories();
        if (Array.isArray(loadedCategories)) {
          // Пустой массив - это валидное состояние (категории могут быть пустыми)
          // Не подставляем дефолтные категории, если массив просто пустой
          loadedCategories.sort((a, b) => a.order - b.order);
          setCategories(loadedCategories);
          if (loadedCategories.length === 0) {
            console.log('📥 Menu: Категории пустые (пользователь удалил все категории)');
          }
        } else {
          // Если данные не массив (файл не найден), используем дефолтные категории только при первой загрузке
          // (когда файл categories.json еще не создан)
          console.log('📥 Menu: Данные категорий не являются массивом, используем дефолтные категории');
          const defaultCategories = [
            { id: 1, key: 'cold', name: 'Холодные закуски', order: 1 },
            { id: 2, key: 'salads', name: 'Салаты', order: 2 },
            { id: 3, key: 'hot', name: 'Горячие блюда', order: 3 },
            { id: 4, key: 'drinks', name: 'Напитки', order: 4 }
          ];
          setCategories(defaultCategories);
        }

        // Загружаем меню из файла
        const loadedMenu = await loadMenu();
        if (Array.isArray(loadedMenu)) {
          // Пустой массив - это валидное состояние (меню может быть пустым)
          // Не подставляем дефолтное меню, если массив просто пустой
          setMenuItems(loadedMenu);
          if (loadedMenu.length === 0) {
            console.log('📥 Menu: Меню пустое (пользователь удалил все позиции)');
          }
        } else {
          // Если данные не массив, используем дефолтное меню только при первой загрузке
          // (когда файл menu.json еще не создан)
          console.log('📥 Menu: Данные не являются массивом, используем дефолтное меню');
          setMenuItems([...defaultMenu]);
        }
      } catch (error) {
        console.error('Ошибка загрузки меню:', error);
        setMenuItems([...defaultMenu]);
        setCategories([
          { id: 1, key: 'cold', name: 'Холодные закуски', order: 1 },
          { id: 2, key: 'salads', name: 'Салаты', order: 2 },
          { id: 3, key: 'hot', name: 'Горячие блюда', order: 3 },
          { id: 4, key: 'drinks', name: 'Напитки', order: 4 }
        ]);
      }
    };

    loadMenuFromFile();
  }, []);

  const toggleExpand = (itemId) => {
    setExpandedItem(expandedItem === itemId ? null : itemId);
  };

  const formatPrice = (price) => {
    const priceNum = parseInt(price);
    return isNaN(priceNum) ? '0 ₽' : `${priceNum} ₽`;
  };

  const handleImageError = (e) => {
    e.target.src = 'https://via.placeholder.com/300x200/8B7355/FFFFFF?text=Тбилиси';
  };

  // Функция для вычисления ширины скроллбара
  const getScrollbarWidth = () => {
    // Создаем временный элемент для измерения ширины скроллбара
    const outer = document.createElement('div');
    outer.style.visibility = 'hidden';
    outer.style.overflow = 'scroll';
    outer.style.msOverflowStyle = 'scrollbar'; // для IE
    document.body.appendChild(outer);
    
    const inner = document.createElement('div');
    outer.appendChild(inner);
    
    const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
    
    outer.parentNode.removeChild(outer);
    
    return scrollbarWidth;
  };

  // Функция для применения компенсации скроллбара ко всем fixed элементам
  const applyScrollbarCompensation = (scrollbarWidth) => {
    if (scrollbarWidth <= 0) return;
    
    // Компенсируем для body и html
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.documentElement.style.paddingRight = `${scrollbarWidth}px`;
    
    // Компенсируем для всех fixed элементов
    // Ищем элементы по известным классам
    const selectors = ['.header', '.category-bar', '.admin-link', '.theme-switcher'];
    const elementsToCheck = new Set();
    
    // Добавляем элементы по селекторам
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => elementsToCheck.add(el));
    });
    
    // Проверяем все элементы и находим fixed
    elementsToCheck.forEach(element => {
      const computedStyle = window.getComputedStyle(element);
      if (computedStyle.position === 'fixed') {
        // Для fixed элементов с width: 100% используем right вместо padding-right
        // Это предотвращает расширение элемента при исчезновении скроллбара
        const currentRight = computedStyle.right;
        const currentWidth = computedStyle.width;
        
        // Сохраняем оригинальные значения
        if (!element.dataset.originalRight) {
          element.dataset.originalRight = currentRight;
        }
        if (!element.dataset.originalWidth) {
          element.dataset.originalWidth = currentWidth;
        }
        
        // Если элемент имеет width: 100% или близко к этому, используем right
        if (currentWidth === '100%' || parseFloat(currentWidth) >= window.innerWidth - 10) {
          element.style.right = `${scrollbarWidth}px`;
        } else {
          // Для других fixed элементов используем padding-right
          const currentPaddingRight = computedStyle.paddingRight;
          const currentPaddingRightValue = parseFloat(currentPaddingRight) || 0;
          element.style.paddingRight = `${currentPaddingRightValue + scrollbarWidth}px`;
          if (!element.dataset.originalPaddingRight) {
            element.dataset.originalPaddingRight = currentPaddingRight;
          }
        }
      }
    });
  };

  // Функция для удаления компенсации скроллбара
  const removeScrollbarCompensation = () => {
    // Убираем компенсацию с body и html
    document.body.style.paddingRight = '';
    document.documentElement.style.paddingRight = '';
    
    // Восстанавливаем оригинальные значения для fixed элементов
    const fixedElements = document.querySelectorAll('[data-original-padding-right], [data-original-right]');
    fixedElements.forEach(element => {
      // Восстанавливаем padding-right
      const originalPadding = element.dataset.originalPaddingRight;
      if (originalPadding !== undefined) {
        element.style.paddingRight = originalPadding;
        delete element.dataset.originalPaddingRight;
      } else if (element.style.paddingRight) {
        element.style.paddingRight = '';
      }
      
      // Восстанавливаем right
      const originalRight = element.dataset.originalRight;
      if (originalRight !== undefined) {
        element.style.right = originalRight;
        delete element.dataset.originalRight;
      } else if (element.style.right) {
        element.style.right = '';
      }
    });
  };

  // Обработчик клика на элемент меню
  const handleMenuItemClick = (item, event) => {
    // Предотвращаем открытие модального окна при клике на кнопку "Подробнее" или внутри item-content
    if (event.target.closest('.details-btn') || 
        event.target.closest('.item-content') ||
        event.target.closest('.item-header') ||
        event.target.closest('.item-description')) {
      return;
    }
    
    // Открываем модальное окно только при клике на изображение или на саму карточку (но не на контент)
    const menuItem = event.currentTarget;
    const rect = menuItem.getBoundingClientRect();
    
    // Вычисляем максимальную ширину для масштабирования
    const maxWidth = Math.min(window.innerWidth * 0.9, 800);
    const scale = rect.width / maxWidth;
    
    // Сохраняем позицию и размер исходного элемента меню
    const position = {
      x: rect.left + rect.width / 2, // Центр элемента по X
      y: rect.top + rect.height / 2, // Центр элемента по Y
      width: rect.width,
      height: rect.height,
      scale: scale // Предвычисленный масштаб для предотвращения рывка
    };
    
    // Сохраняем выбранный элемент меню и позицию одновременно
    // Это предотвращает рывок при рендеринге
    setSelectedMenuItem(item);
    setMenuItemPosition(position);
    
    // Компенсируем ширину скроллбара перед блокировкой скролла
    // Это предотвращает сдвиг контента при исчезновении скроллбара
    const scrollbarWidth = getScrollbarWidth();
    applyScrollbarCompensation(scrollbarWidth);
    
    // Блокируем скролл страницы
    document.body.style.overflow = 'hidden';
  };

  // Закрытие модального окна с плавной анимацией
  const closeMenuItemModal = () => {
    // Запускаем анимацию закрытия
    setIsClosing(true);
    
    // После завершения анимации закрытия (0.4s) удаляем элемент
    setTimeout(() => {
      setSelectedMenuItem(null);
      setMenuItemPosition(null);
      setIsClosing(false);
      // Разблокируем скролл страницы и убираем компенсацию скроллбара
      document.body.style.overflow = '';
      removeScrollbarCompensation();
    }, 400); // Время анимации закрытия
  };

  // Устанавливаем начальное состояние transform перед рендерингом для предотвращения рывка
  useLayoutEffect(() => {
    if (selectedMenuItem && menuItemPosition && menuModalContentRef.current && !isClosing) {
      // Вычисляем начальное состояние
      const maxWidth = Math.min(window.innerWidth * 0.9, 800);
      const scale = menuItemPosition.width / maxWidth;
      const translateX = menuItemPosition.x - window.innerWidth / 2;
      const translateY = menuItemPosition.y - window.innerHeight / 2;
      
      // Устанавливаем начальное состояние синхронно перед рендерингом
      // Это предотвращает визуальный рывок
      const element = menuModalContentRef.current;
      element.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      element.style.opacity = '0.7';
      
      // Запускаем анимацию в следующем кадре после установки начального состояния
      requestAnimationFrame(() => {
        if (element && !isClosing) {
          element.style.animation = 'zoomInMenuItem 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
        }
      });
    }
  }, [selectedMenuItem, menuItemPosition, isClosing]);

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && selectedMenuItem) {
        closeMenuItemModal();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedMenuItem]);

  // Группируем блюда по категориям
  const categorizedItems = categories.map(category => ({
    category,
    items: menuItems.filter(item => item.category === category.key)
  })).filter(group => group.items.length > 0);

  // Отслеживание скролла для определения активной категории
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const isMobile = window.innerWidth <= 768;
      
      // Показываем панель категорий после скролла вниз (только на мобильных)
      if (isMobile) {
        const shouldShow = scrollY > 200;
        setShowCategoryBar(shouldShow);
        // Скрываем Header при показе панели категорий
        const header = document.querySelector('.header');
        if (header) {
          if (shouldShow) {
            header.style.transform = 'translateY(-100%)';
          } else {
            header.style.transform = 'translateY(0)';
          }
        }
      } else {
        setShowCategoryBar(false);
        // Показываем Header на десктопе
        const header = document.querySelector('.header');
        if (header) {
          header.style.transform = 'translateY(0)';
        }
      }
      
      // Определяем активную категорию на основе позиции скролла
      let currentActive = null;
      const offset = isMobile ? 100 : 150; // Отступ для определения активной категории
      
      categorizedItems.forEach(({ category }) => {
        const element = categoryRefs.current[category.id];
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= offset && rect.bottom > offset) {
            currentActive = category.id;
          }
        }
      });
      
      // Если мы в самом верху, выбираем первую категорию
      if (scrollY < 100 && categorizedItems.length > 0) {
        currentActive = categorizedItems[0].category.id;
      }
      
      if (currentActive !== activeCategory) {
        setActiveCategory(currentActive);
        
        // Автоматический скролл кнопок в панели, чтобы активная была по центру или левее центра (только на мобильных)
        if (isMobile && activeButtonRef.current && categoryBarRef.current) {
          // Используем setTimeout для того, чтобы дать время на обновление DOM
          setTimeout(() => {
            if (activeButtonRef.current && categoryBarRef.current) {
              const scrollContainer = categoryBarRef.current.querySelector('.category-bar-scroll');
              if (scrollContainer) {
                const button = activeButtonRef.current;
                const containerRect = scrollContainer.getBoundingClientRect();
                const buttonRect = button.getBoundingClientRect();
                
                // Вычисляем позицию, чтобы кнопка была по центру или левее центра (примерно на 1/3 от центра)
                const containerCenter = containerRect.width / 2;
                const targetPosition = containerCenter - (containerRect.width / 3); // Позиция левее центра
                const buttonLeft = button.offsetLeft; // Позиция кнопки относительно контейнера
                const scrollOffset = buttonLeft - targetPosition;
                
                scrollContainer.scrollTo({
                  left: Math.max(0, scrollOffset), // Не скроллим в отрицательную сторону
                  behavior: 'smooth'
                });
              }
            }
          }, 100);
        }
      }
    };

    const handleResize = () => {
      // При изменении размера окна проверяем, нужно ли показывать панель
      const header = document.querySelector('.header');
      if (window.innerWidth > 768) {
        setShowCategoryBar(false);
        // Показываем Header на десктопе
        if (header) {
          header.style.transform = 'translateY(0)';
        }
      } else {
        handleScroll();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    handleScroll(); // Вызываем сразу для начального состояния
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      // Восстанавливаем Header при размонтировании
      const header = document.querySelector('.header');
      if (header) {
        header.style.transform = 'translateY(0)';
      }
    };
  }, [categorizedItems, activeCategory]);

  // Функция для скролла к категории
  const scrollToCategory = (categoryId) => {
    const element = categoryRefs.current[categoryId];
    if (element) {
      const offset = 80; // Отступ сверху для панели категорий
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - offset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      
      setActiveCategory(categoryId);
      
      // Автоматический скролл кнопок в панели при клике (только на мобильных)
      if (window.innerWidth <= 768 && categoryBarRef.current) {
        setTimeout(() => {
          const scrollContainer = categoryBarRef.current.querySelector('.category-bar-scroll');
          // Находим кнопку по categoryId
          const button = scrollContainer?.querySelector(`[data-category-id="${categoryId}"]`);
          if (scrollContainer && button) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const buttonRect = button.getBoundingClientRect();
            
            // Вычисляем позицию, чтобы кнопка была по центру или левее центра (примерно на 1/3 от центра)
            const containerCenter = containerRect.width / 2;
            const targetPosition = containerCenter - (containerRect.width / 3); // Позиция левее центра
            const buttonLeft = button.offsetLeft; // Позиция кнопки относительно контейнера
            const scrollOffset = buttonLeft - targetPosition;
            
            scrollContainer.scrollTo({
              left: Math.max(0, scrollOffset), // Не скроллим в отрицательную сторону
              behavior: 'smooth'
            });
          }
        }, 150);
      }
    }
  };

  return (
    <div className={`menu-page ${showCategoryBar ? 'category-bar-visible' : ''}`}>
      {/* Панель категорий для мобильной версии */}
      {categorizedItems.length > 0 && (
        <div className={`category-bar ${showCategoryBar ? 'visible' : ''}`} ref={categoryBarRef}>
          <div className="category-bar-scroll">
            {categorizedItems.map(({ category }) => (
              <button
                key={category.id}
                ref={activeCategory === category.id ? activeButtonRef : null}
                data-category-id={category.id}
                className={`category-bar-button ${activeCategory === category.id ? 'active' : ''}`}
                onClick={() => scrollToCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="container">
        <h1 className="menu-title">Меню ресторана "Тбилиси"</h1>
        
        {categorizedItems.map(({ category, items }) => (
          <section 
            key={category.id} 
            className="menu-category"
            ref={(el) => {
              if (el) categoryRefs.current[category.id] = el;
            }}
          >
            <h2 className="category-title">{category.name}</h2>
            <div className="menu-grid">
              {items.map(item => (
                <div 
                  key={item.id} 
                  className="menu-item"
                  onClick={(e) => handleMenuItemClick(item, e)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="item-image">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      onError={handleImageError}
                    />
                  </div>
                  <div className="item-content">
                    <div className="item-header">
                      <h3 className="item-name">{item.name}</h3>
                      <div className="item-price-weight">
                        <span className="item-price">{formatPrice(item.price)}</span>
                        <span className="item-weight">· {item.weight}</span>
                      </div>
                    </div>
                    <button 
                      className="details-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(item.id);
                      }}
                    >
                      {expandedItem === item.id ? 'Скрыть' : 'Подробнее'}
                    </button>
                    {expandedItem === item.id && (
                      <div className="item-description">
                        {item.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
        
        {categorizedItems.length === 0 && (
          <div className="empty-menu-message">
            <h2>Меню временно недоступно</h2>
            <p>Пожалуйста, зайдите позже или свяжитесь с администратором</p>
          </div>
        )}
      </div>

      {/* Модальное окно для просмотра элемента меню */}
      {selectedMenuItem && menuItemPosition && (
        <div 
          className={`menu-item-modal-overlay ${isClosing ? 'closing' : ''}`}
          onClick={closeMenuItemModal}
        >
          <div 
            ref={menuModalContentRef}
            className={`menu-item-modal-content ${isClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              '--initial-x': `${menuItemPosition.x}px`,
              '--initial-y': `${menuItemPosition.y}px`,
              '--initial-width': `${menuItemPosition.width}px`,
              '--initial-height': `${menuItemPosition.height}px`
            }}
          >
            <button className="menu-item-modal-close" onClick={closeMenuItemModal} aria-label="Закрыть">
              ×
            </button>
            <div className="menu-item-modal-image-container">
              <img 
                src={selectedMenuItem.image} 
                alt={selectedMenuItem.name}
                className="menu-item-modal-image"
                onError={handleImageError}
              />
            </div>
            <div className="menu-item-modal-info">
              <h2 className="menu-item-modal-name">{selectedMenuItem.name}</h2>
              <div className="menu-item-modal-price-weight">
                <span className="menu-item-modal-price">{formatPrice(selectedMenuItem.price)}</span>
                <span className="menu-item-modal-weight">· {selectedMenuItem.weight}</span>
              </div>
              {selectedMenuItem.description && (
                <p className="menu-item-modal-description">{selectedMenuItem.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;