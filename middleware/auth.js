const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Требуется авторизация' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || user.isBlocked) {
      return res.status(401).json({ message: 'Пользователь не найден или заблокирован' });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Неверный токен авторизации' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.userId);
    }
  } catch {}
  next();
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Доступ только для администраторов' });
  }
  next();
};

const artistOnly = (req, res, next) => {
  if (req.user?.role !== 'artist' && req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Доступ только для артистов' });
  }
  next();
};

module.exports = { auth, optionalAuth, adminOnly, artistOnly };
