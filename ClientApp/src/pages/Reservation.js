import React, { useState } from 'react';
import './Reservation.css';
import { autoSaveReservations, loadReservations } from '../utils/fileStorage';

const Reservation = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date: '',
    time: '',
    guests: '2',
    comments: ''
  });

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
    
    // Сбрасываем форму
    setFormData({
      name: '',
      phone: '',
      date: '',
      time: '',
      guests: '2',
      comments: ''
    });
  };

  return (
    <div className="reservation-page">
      <div className="container">
        <div className="reservation-form">
          <h1>Бронирование стола</h1>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Имя *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Телефон *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">Дата *</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="time">Время *</label>
                <input
                  type="time"
                  id="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="guests">Количество гостей *</label>
                <select
                  id="guests"
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
              <label htmlFor="comments">Комментарии (необязательно)</label>
              <textarea
                id="comments"
                name="comments"
                value={formData.comments}
                onChange={handleChange}
                rows="4"
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

export default Reservation;