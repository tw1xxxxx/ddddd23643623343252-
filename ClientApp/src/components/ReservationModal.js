import React, { useState, useEffect, useRef } from 'react';
import './ReservationModal.css';
import { autoSaveReservations, loadReservations } from '../utils/fileStorage';

const ReservationModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date: '',
    time: '',
    guests: '2',
    comments: ''
  });

  const modalRef = useRef(null);

  // Блокируем скролл страницы когда модальное окно открыто
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Сохраняем заявку
    const reservation = {
      id: Date.now(),
      ...formData,
      createdAt: new Date().toISOString()
    };

    // Загружаем существующие заявки из файла и добавляем новую
    const existing = await loadReservations();
    const updated = [...existing, reservation];
    
    // Сохраняем в файл проекта
    const saveResult = await autoSaveReservations(updated);
    
    if (saveResult.success) {
      alert('Стол успешно забронирован! Файл с заявкой скачан. Мы свяжемся с вами для подтверждения.');
    } else {
      alert(`Заявка сохранена локально. ${saveResult.message}`);
    }
    
    // Сбрасываем форму и закрываем модальное окно
    setFormData({
      name: '',
      phone: '',
      date: '',
      time: '',
      guests: '2',
      comments: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="reservation-modal-overlay" onClick={onClose}>
      <div className="reservation-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
        <div className="reservation-modal-content">
          <h2>Бронирование стола</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="modal-name">Имя *</label>
              <input
                type="text"
                id="modal-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="modal-phone">Телефон *</label>
              <input
                type="tel"
                id="modal-phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="modal-date">Дата *</label>
                <input
                  type="date"
                  id="modal-date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="modal-time">Время *</label>
                <input
                  type="time"
                  id="modal-time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="modal-guests">Количество гостей *</label>
                <select
                  id="modal-guests"
                  name="guests"
                  value={formData.guests}
                  onChange={handleChange}
                  required
                >
                  <option value="1">1 человек</option>
                  <option value="2">2 человека</option>
                  <option value="3">3 человека</option>
                  <option value="4">4 человека</option>
                  <option value="5">5 человек</option>
                  <option value="6">6 человек</option>
                  <option value="7">7 человек</option>
                  <option value="8">8+ человек</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="modal-comments">Комментарии (необязательно)</label>
              <textarea
                id="modal-comments"
                name="comments"
                value={formData.comments}
                onChange={handleChange}
                rows="2"
                placeholder="Особые пожелания, аллергии, повод посещения..."
              />
            </div>

            <button type="submit" className="submit-btn">
              Забронировать стол
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReservationModal;

