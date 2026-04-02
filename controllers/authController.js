const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Вход администратора (email + пароль)
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Введите email и пароль' });
    }

    const user = await User.findOne({ email, role: 'admin' });
    if (!user) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    if (!user.password) {
      return res.status(401).json({ message: 'Пароль не установлен' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Аккаунт заблокирован' });
    }

    const token = generateToken(user._id);
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка авторизации', error: error.message });
  }
};

// Google OAuth
exports.googleAuth = async (req, res) => {
  try {
    const { googleId, email, name, avatar } = req.body;

    let user = await User.findOne({ googleId });
    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        user.googleId = googleId;
        if (!user.avatar) user.avatar = avatar;
        await user.save();
      } else {
        user = await User.create({ googleId, email, name, avatar });
      }
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Аккаунт заблокирован' });
    }

    const token = generateToken(user._id);
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка авторизации', error: error.message });
  }
};

// Получить текущего пользователя
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('likedTracks')
      .populate('savedTracks');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
};

// Стать артистом
exports.becomeArtist = async (req, res) => {
  try {
    const { artistName, artistBio } = req.body;
    const user = req.user;

    if (user.role === 'artist') {
      return res.status(400).json({ message: 'Вы уже являетесь артистом' });
    }

    user.role = 'artist';
    user.artistName = artistName;
    user.artistBio = artistBio || '';

    if (req.file) {
      user.artistImage = `/uploads/covers/${req.file.filename}`;
    }

    await user.save();
    res.json({ message: 'Вы стали артистом!', user });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
};

// Обновить профиль
exports.updateProfile = async (req, res) => {
  try {
    const { name, artistName, artistBio } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (artistName) updates.artistName = artistName;
    if (artistBio !== undefined) updates.artistBio = artistBio;
    if (req.file) updates.artistImage = `/uploads/covers/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка обновления профиля', error: error.message });
  }
};
