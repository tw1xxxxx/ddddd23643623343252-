import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useReservation } from '../App';
import { loadPhotos } from '../utils/fileStorage';
import './Home.css';

const Home = () => {
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef(null);
  const { openReservationModal } = useReservation();
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [imagePosition, setImagePosition] = useState(null);
  const imageRefs = useRef({});
  const [isClosing, setIsClosing] = useState(false);
  const modalContentRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        const heroHeight = heroRef.current.offsetHeight;
        
        // Вычисляем прогресс скролла относительно hero секции
        // Когда секция полностью видна сверху, прогресс = 0
        // Когда секция полностью прокручена, прогресс = 1
        let scrollProgress = 0;
        
        if (rect.top < 0 && rect.bottom > 0) {
          // Секция частично или полностью прокручена
          scrollProgress = Math.min(Math.abs(rect.top) / heroHeight, 1);
        } else if (rect.top >= 0) {
          // Секция еще не начала прокручиваться
          scrollProgress = 0;
        } else {
          // Секция полностью прокручена
          scrollProgress = 1;
        }
        
        setScrollY(scrollProgress);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Вызываем сразу для начальной позиции

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const loadPhotosFromFile = async () => {
      try {
        console.log('📸 Home: Загрузка фотографий...');
        const loadedPhotos = await loadPhotos();
        console.log('📸 Home: Загружено фотографий:', loadedPhotos.length);
        
        if (Array.isArray(loadedPhotos) && loadedPhotos.length > 0) {
          // Проверяем, что все фотографии валидны
          const validPhotos = loadedPhotos.filter(photo => {
            const isValid = photo && 
                           photo.id && 
                           photo.image && 
                           photo.image.trim() && 
                           photo.image.startsWith('data:image');
            if (!isValid) {
              console.warn('📸 Home: Пропущена невалидная фотография:', photo);
            }
            return isValid;
          });
          
          console.log('📸 Home: Валидных фотографий:', validPhotos.length);
          setPhotos(validPhotos);
        } else {
          console.log('📸 Home: Фотографии не найдены');
          setPhotos([]);
        }
      } catch (error) {
        console.error('❌ Home: Ошибка загрузки фотографий:', error);
        setPhotos([]);
      }
    };

    loadPhotosFromFile();
    
    // Обновляем фотографии каждые 5 секунд, чтобы подхватывать новые
    const interval = setInterval(loadPhotosFromFile, 5000);
    
    // Также обновляем при фокусе на вкладке
    const handleFocus = () => {
      loadPhotosFromFile();
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

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

  // Обработчик клика на изображение
  const handleImageClick = (photo, event) => {
    const img = event.currentTarget;
    const rect = img.getBoundingClientRect();
    
    // Вычисляем максимальную ширину для масштабирования
    const maxWidth = Math.min(window.innerWidth * 0.9, 1200);
    const scale = rect.width / maxWidth;
    
    // Сохраняем позицию и размер исходного изображения
    // getBoundingClientRect() возвращает позицию относительно viewport
    // Для fixed модального окна это именно то, что нужно
    const position = {
      x: rect.left + rect.width / 2, // Центр изображения по X
      y: rect.top + rect.height / 2, // Центр изображения по Y
      width: rect.width,
      height: rect.height,
      scale: scale // Предвычисленный масштаб для предотвращения рывка
    };
    
    // Сохраняем выбранное фото и позицию одновременно
    // Это предотвращает рывок при рендеринге
    setSelectedPhoto(photo);
    setImagePosition(position);
    
    // Компенсируем ширину скроллбара перед блокировкой скролла
    // Это предотвращает сдвиг контента при исчезновении скроллбара
    const scrollbarWidth = getScrollbarWidth();
    applyScrollbarCompensation(scrollbarWidth);
    
    // Блокируем скролл страницы
    document.body.style.overflow = 'hidden';
  };

  // Закрытие модального окна с плавной анимацией
  const closeModal = () => {
    // Запускаем анимацию закрытия
    setIsClosing(true);
    
    // После завершения анимации закрытия (0.4s) удаляем элемент
    setTimeout(() => {
      setSelectedPhoto(null);
      setImagePosition(null);
      setIsClosing(false);
      // Разблокируем скролл страницы и убираем компенсацию скроллбара
      document.body.style.overflow = '';
      removeScrollbarCompensation();
    }, 400); // Время анимации закрытия
  };

  // Устанавливаем начальное состояние transform перед рендерингом для предотвращения рывка
  useLayoutEffect(() => {
    if (selectedPhoto && imagePosition && modalContentRef.current && !isClosing) {
      // Вычисляем начальное состояние
      const maxWidth = Math.min(window.innerWidth * 0.9, 1200);
      const scale = imagePosition.width / maxWidth;
      const translateX = imagePosition.x - window.innerWidth / 2;
      const translateY = imagePosition.y - window.innerHeight / 2;
      
      // Устанавливаем начальное состояние синхронно перед рендерингом
      // Это предотвращает визуальный рывок
      const element = modalContentRef.current;
      element.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
      element.style.opacity = '0.7';
      
      // Запускаем анимацию в следующем кадре после установки начального состояния
      requestAnimationFrame(() => {
        if (element && !isClosing) {
          element.style.animation = 'zoomIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
        }
      });
    }
  }, [selectedPhoto, imagePosition, isClosing]);

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && selectedPhoto) {
        closeModal();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedPhoto]);

  // Вычисляем стили для эффекта параллакса
  const backgroundScale = 1 + scrollY * 0.1; // Увеличиваем масштаб при скролле (более тонкий эффект)
  const backgroundY = scrollY * 50; // Смещение фона
  const overlayOpacity = 0.5 + scrollY * 0.3; // Увеличиваем затемнение при скролле

  return (
    <div className="home">
      {/* Hero Section */}
      <section 
        ref={heroRef}
        className="hero"
      >
        <div 
          className="hero-background"
          style={{
            backgroundImage: `url(${process.env.PUBLIC_URL}/background.png)`,
            transform: `scale(${backgroundScale}) translateY(${backgroundY}px)`,
          }}
        />
        <div 
          className="hero-overlay"
          style={{
            opacity: overlayOpacity
          }}
        />
        <div className="hero-content">
          <div className="glass-container">
            <h1 
              className="hero-title"
              style={{
                transform: `translateY(${scrollY * 30}px)`,
                opacity: 1 - scrollY * 0.8
              }}
            >
              Добро пожаловать в "Тбилиси"
            </h1>
            <p 
              className="hero-subtitle"
              style={{
                transform: `translateY(${scrollY * 20}px)`,
                opacity: 1 - scrollY * 0.8
              }}
            >
              Место, где встречаются вкус и уют
            </p>
            <button 
              className="cta-button"
              onClick={openReservationModal}
              style={{
                transform: `translateY(${scrollY * 15}px)`,
                opacity: 1 - scrollY * 0.8
              }}
            >
              Забронировать стол
            </button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about">
        <div className="container">
          <h2>О нашем ресторане</h2>
          <div className="about-content">
            <p>
              Ресторан «Тбилиси» — это место, где вы можете насладиться аутентичной грузинской кухней и домашней атмосферой. Гости отмечают, что интерьер ресторана выполнен в грузинском стиле, с оружием на стенах и настоящим камином.
            </p>
            <p>
              Наша команда шеф-поваров тщательно отбирает ингредиенты и создает 
              меню, которое удовлетворит даже самого искушенного гурмана. 
              У нас вы найдете идеальное сочетание вкуса, качества и атмосферы.
              Кроме того, в ресторане играет живая музыка, что делает его идеальным местом для отдыха с друзьями или семьей
            </p>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="gallery">
        <div className="container">
          <h2>Наша галерея</h2>
          {photos.length > 0 ? (
            <div className="gallery-grid">
              {photos.map(photo => {
                // Проверяем, что фотография валидна
                if (!photo || !photo.id || !photo.image || !photo.image.startsWith('data:image')) {
                  console.warn('📸 Home: Пропущена невалидная фотография:', photo);
                  return null;
                }
                
                return (
                  <div key={photo.id} className="gallery-item">
                    <img 
                      ref={(el) => imageRefs.current[photo.id] = el}
                      src={photo.image}
                      alt={photo.caption || 'Фото ресторана Тбилиси'}
                      className="gallery-image"
                      loading="lazy"
                      onClick={(e) => handleImageClick(photo, e)}
                      style={{ cursor: 'pointer' }}
                      onError={(e) => {
                        console.error('❌ Home: Ошибка загрузки изображения для фото ID:', photo.id);
                        e.target.src = 'https://via.placeholder.com/300x200/8B7355/FFFFFF?text=Тбилиси';
                      }}
                      onLoad={() => {
                        console.log('✅ Home: Изображение загружено для фото ID:', photo.id);
                      }}
                    />
                    {photo.caption && photo.caption.trim() && (
                      <div className="gallery-caption">{photo.caption}</div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="no-photos">Фотографии скоро появятся</p>
          )}
        </div>
      </section>

      {/* Модальное окно для просмотра изображения */}
      {selectedPhoto && imagePosition && (
        <div 
          className={`image-modal-overlay ${isClosing ? 'closing' : ''}`}
          onClick={closeModal}
        >
          <div 
            ref={modalContentRef}
            className={`image-modal-content ${isClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              '--initial-x': `${imagePosition.x}px`,
              '--initial-y': `${imagePosition.y}px`,
              '--initial-width': `${imagePosition.width}px`,
              '--initial-height': `${imagePosition.height}px`
            }}
          >
            <button className="image-modal-close" onClick={closeModal} aria-label="Закрыть">
              ×
            </button>
            <img 
              src={selectedPhoto.image}
              alt={selectedPhoto.caption || 'Фото ресторана Тбилиси'}
              className="image-modal-image"
            />
            {selectedPhoto.caption && selectedPhoto.caption.trim() && (
              <div className="image-modal-caption">{selectedPhoto.caption}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;