const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Загрузить .env если есть
try { require('dotenv').config(); } catch {}

const { startBackupSchedule } = require('./utils/backup');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Роуты
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tracks', require('./routes/tracks'));
app.use('/api/playlists', require('./routes/playlists'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/admin'));

// Жанры (публичный доступ)
const Genre = require('./models/Genre');
app.get('/api/genres', async (req, res) => {
  try {
    const genres = await Genre.find().sort('nameRu');
    res.json(genres);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Внутренняя ошибка сервера' });
});

// Подключение к MongoDB и запуск
const PORT = process.env.PORT || 4891;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aridai';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB подключён');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Сервер запущен: http://0.0.0.0:${PORT}`);
    });
    startBackupSchedule();
  })
  .catch(err => {
    console.error('Ошибка подключения к MongoDB:', err);
    process.exit(1);
  });

module.exports = app;
