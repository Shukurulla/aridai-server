require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const User = require('../models/User');
const Track = require('../models/Track');
const Genre = require('../models/Genre');
const Report = require('../models/Report');
const Playlist = require('../models/Playlist');

const COVERS_DIR = path.join(__dirname, '..', 'uploads', 'covers');
const TRACKS_DIR = path.join(__dirname, '..', 'uploads', 'tracks');
fs.mkdirSync(COVERS_DIR, { recursive: true });
fs.mkdirSync(TRACKS_DIR, { recursive: true });

// Yuklab olish funksiyasi (redirect support)
function downloadFile(url, dest, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    // 0 baytli yoki mavjud bo'lmasa qayta yuklash
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) { resolve(); return; }

    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      // Redirect
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && maxRedirects > 0) {
        res.resume(); // drain
        downloadFile(res.headers.location, dest, maxRedirects - 1).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => { file.close(resolve); });
      file.on('error', (e) => { fs.unlink(dest, () => {}); reject(e); });
    }).on('error', (e) => { fs.unlink(dest, () => {}); reject(e); });
  });
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aridai';
const JWT_SECRET = process.env.JWT_SECRET || 'aridai_secret_key_2024';

// ==================== ДАННЫЕ ====================

const genresData = [
  { name: 'Pop', nameRu: 'Поп', slug: 'pop', color: '#FF6B9D' },
  { name: 'Rap', nameRu: 'Рэп', slug: 'rap', color: '#C084FC' },
  { name: 'Rock', nameRu: 'Рок', slug: 'rock', color: '#EF4444' },
  { name: 'RnB', nameRu: 'R&B', slug: 'rnb', color: '#F59E0B' },
  { name: 'Electronic', nameRu: 'Электронная', slug: 'electronic', color: '#06B6D4' },
  { name: 'Folk', nameRu: 'Народная', slug: 'folk', color: '#22C55E' },
  { name: 'Jazz', nameRu: 'Джаз', slug: 'jazz', color: '#8B5CF6' },
  { name: 'Classical', nameRu: 'Классическая', slug: 'classical', color: '#0EA5E9' },
];

const artistsData = [
  {
    email: 'dimash@aridai.kz',
    name: 'Димаш Кудайберген',
    artistName: 'DIMASH',
    artistBio: 'Казахстанский певец, обладатель уникального вокального диапазона. Известен по всему миру своим невероятным голосом.',
    isVerified: true,
  },
  {
    email: 'scriptonite@aridai.kz',
    name: 'Адиль Жалелов',
    artistName: 'Скриптонит',
    artistBio: 'Казахстанский рэп-исполнитель из Павлодара. Один из самых влиятельных артистов в русскоязычном хип-хопе.',
    isVerified: true,
  },
  {
    email: 'jahkhalib@aridai.kz',
    name: 'Бахтияр Мамедов',
    artistName: 'Jah Khalib',
    artistBio: 'Казахстанский певец и рэпер. Мастер создания атмосферных треков с восточным колоритом.',
    isVerified: true,
  },
  {
    email: 'miyagi@aridai.kz',
    name: 'Азамат Кудайберген',
    artistName: 'Мияги',
    artistBio: 'Музыкант, сочетающий рэп с мелодичным вокалом. Треки отличаются глубоким смыслом и запоминающимися мелодиями.',
    isVerified: true,
  },
  {
    email: 'moldanazar@aridai.kz',
    name: 'Ерболат Молданазар',
    artistName: 'Moldanazar',
    artistBio: 'Казахстанский инди-поп артист. Его музыка — это сплав казахских традиций и современного звучания.',
    isVerified: true,
  },
  {
    email: 'imanbek@aridai.kz',
    name: 'Иманбек Зейкенов',
    artistName: 'Иманбек',
    artistBio: 'Казахстанский диджей и продюсер, обладатель премии Грэмми. Прославился ремиксами мирового уровня.',
    isVerified: true,
  },
  {
    email: 'thelimba@aridai.kz',
    name: 'Лимба',
    artistName: 'The Limba',
    artistBio: 'Казахстанский поп-артист с уникальным вокалом. Его хиты звучат на каждой вечеринке.',
    isVerified: true,
  },
  {
    email: 'ninetyone@aridai.kz',
    name: 'Ninety One',
    artistName: 'Ninety One',
    artistBio: 'Первая казахская бойбенд-группа в жанре Q-Pop. Пионеры нового музыкального направления.',
    isVerified: true,
  },
];

const listenersData = [
  { email: 'ivan.petrov@mail.ru', name: 'Иван Петров' },
  { email: 'anna.sidorova@gmail.com', name: 'Анна Сидорова' },
  { email: 'aliya.nurova@mail.ru', name: 'Алия Нурова' },
  { email: 'dmitry.volkov@gmail.com', name: 'Дмитрий Волков' },
  { email: 'aizhan.kz@mail.ru', name: 'Айжан Сериккызы' },
  { email: 'sergey.kim@gmail.com', name: 'Сергей Ким' },
  { email: 'madina.abenova@mail.ru', name: 'Мадина Абенова' },
  { email: 'artem.nikolaev@gmail.com', name: 'Артём Николаев' },
  { email: 'dana.sultanova@mail.ru', name: 'Дана Султанова' },
  { email: 'ruslan.ospanov@gmail.com', name: 'Руслан Оспанов' },
  { email: 'elena.park@mail.ru', name: 'Елена Пак' },
  { email: 'nurlan.akhmetov@gmail.com', name: 'Нурлан Ахметов' },
  { email: 'oksana.lee@mail.ru', name: 'Оксана Ли' },
  { email: 'timur.kasymov@gmail.com', name: 'Тимур Касымов' },
  { email: 'zarina.baeva@mail.ru', name: 'Зарина Баева' },
];

// Треки для каждого артиста (индекс соответствует artistsData)
const tracksPerArtist = [
  // DIMASH
  [
    { title: 'Любовь уставших лебедей', genre: 'Pop', album: 'iD', duration: 274, playCount: 1850000 },
    { title: 'Кукушка', genre: 'Rock', album: 'iD', duration: 312, playCount: 2100000 },
    { title: 'Осенняя нежность', genre: 'Classical', album: 'Синглы', duration: 245, playCount: 980000 },
    { title: 'Дайдидау', genre: 'Folk', album: 'Синглы', duration: 198, playCount: 3200000 },
    { title: 'Знай', genre: 'Pop', album: 'iD', duration: 226, playCount: 1540000 },
    { title: 'Ұмытылмас күн', genre: 'Pop', album: 'iD', duration: 257, playCount: 1120000 },
    { title: 'SOS', genre: 'Pop', album: 'Синглы', duration: 280, playCount: 4500000 },
  ],
  // Скриптонит
  [
    { title: 'Положение', genre: 'Rap', album: 'Уроборос', duration: 215, playCount: 8900000 },
    { title: 'Вечеринка', genre: 'Rap', album: 'Уроборос', duration: 198, playCount: 5600000 },
    { title: 'Где ты?', genre: 'Rap', album: 'Дом с нормальными явлениями', duration: 243, playCount: 4100000 },
    { title: 'Ламбада', genre: 'Rap', album: 'Дом с нормальными явлениями', duration: 207, playCount: 3400000 },
    { title: 'Мультибрендовый', genre: 'Rap', album: 'Уроборос', duration: 231, playCount: 2900000 },
    { title: 'Темный рыцарь', genre: 'Rap', album: 'Синглы', duration: 189, playCount: 2100000 },
    { title: 'Космос', genre: 'RnB', album: 'Уроборос', duration: 256, playCount: 1800000 },
  ],
  // Jah Khalib
  [
    { title: 'Медина', genre: 'Pop', album: 'Если чё, я Баха', duration: 213, playCount: 12000000 },
    { title: 'Лейла', genre: 'Pop', album: 'Если чё, я Баха', duration: 228, playCount: 9500000 },
    { title: 'Воу-Воу Палехче', genre: 'Rap', album: 'Мудрец', duration: 196, playCount: 6700000 },
    { title: 'Созвездие Ангела', genre: 'Pop', album: 'Мудрец', duration: 241, playCount: 5200000 },
    { title: 'ПОдАМурные', genre: 'RnB', album: 'Синглы', duration: 204, playCount: 4800000 },
    { title: 'Джадуа', genre: 'Pop', album: 'Если чё, я Баха', duration: 219, playCount: 7100000 },
  ],
  // Мияги
  [
    { title: 'Мало нам', genre: 'Rap', album: 'Yamakasi', duration: 232, playCount: 7400000 },
    { title: 'Бошка', genre: 'Rap', album: 'Yamakasi', duration: 198, playCount: 6100000 },
    { title: 'Колибри', genre: 'RnB', album: 'Синглы', duration: 244, playCount: 3800000 },
    { title: 'Там ревели горы', genre: 'Rap', album: 'Синглы', duration: 267, playCount: 4200000 },
    { title: 'Самурай', genre: 'Rap', album: 'Yamakasi', duration: 210, playCount: 5500000 },
    { title: 'Море', genre: 'Pop', album: 'Синглы', duration: 225, playCount: 2900000 },
  ],
  // Moldanazar
  [
    { title: 'Аманат', genre: 'Folk', album: 'Аманат', duration: 236, playCount: 1400000 },
    { title: 'Ауылдағы ақшам', genre: 'Folk', album: 'Аманат', duration: 201, playCount: 980000 },
    { title: 'Той жыры', genre: 'Pop', album: 'Синглы', duration: 214, playCount: 750000 },
    { title: 'Жұлдыздар', genre: 'Pop', album: 'Аманат', duration: 248, playCount: 1100000 },
    { title: 'Қарағым-ай', genre: 'Folk', album: 'Синглы', duration: 192, playCount: 620000 },
    { title: 'Сағыныш', genre: 'Pop', album: 'Аманат', duration: 218, playCount: 850000 },
  ],
  // Иманбек
  [
    { title: 'Roses Remix', genre: 'Electronic', album: 'Синглы', duration: 176, playCount: 15000000 },
    { title: 'Ночной город', genre: 'Electronic', album: 'Синглы', duration: 194, playCount: 3200000 },
    { title: 'Stereo Love Remix', genre: 'Electronic', album: 'Синглы', duration: 183, playCount: 5800000 },
    { title: 'Сияние', genre: 'Electronic', album: 'Синглы', duration: 201, playCount: 2100000 },
    { title: 'Девочка', genre: 'Pop', album: 'Синглы', duration: 168, playCount: 4400000 },
    { title: 'Энергия', genre: 'Electronic', album: 'Синглы', duration: 212, playCount: 1800000 },
    { title: 'Время', genre: 'Electronic', album: 'Синглы', duration: 189, playCount: 2700000 },
  ],
  // The Limba
  [
    { title: 'Обманула', genre: 'Pop', album: 'Синглы', duration: 192, playCount: 11000000 },
    { title: 'Букет', genre: 'Pop', album: 'Синглы', duration: 185, playCount: 8600000 },
    { title: 'Смузи', genre: 'Pop', album: 'Синглы', duration: 178, playCount: 6400000 },
    { title: 'Отпускаю', genre: 'RnB', album: 'Синглы', duration: 204, playCount: 5100000 },
    { title: 'Она тебя любит', genre: 'Pop', album: 'Синглы', duration: 196, playCount: 4300000 },
    { title: 'Ночь', genre: 'Pop', album: 'Синглы', duration: 209, playCount: 3700000 },
  ],
  // Ninety One
  [
    { title: 'Ай-яй-яй', genre: 'Pop', album: 'Q-Pop', duration: 203, playCount: 2800000 },
    { title: 'Қалай қарайсың', genre: 'Pop', album: 'Q-Pop', duration: 215, playCount: 2100000 },
    { title: 'Болашақ', genre: 'Pop', album: 'Q-Pop', duration: 198, playCount: 1700000 },
    { title: 'Сен', genre: 'Pop', album: 'Синглы', duration: 187, playCount: 1400000 },
    { title: 'Ұмыт мені', genre: 'Pop', album: 'Синглы', duration: 222, playCount: 1100000 },
  ],
];

const reportReasons = [
  'Нарушение авторских прав. Данный трек является копией оригинального произведения без разрешения правообладателя.',
  'Некачественная запись. Трек содержит посторонние шумы и искажения, которые мешают прослушиванию.',
  'Неприемлемый контент. Текст песни содержит оскорбительные высказывания и нецензурную лексику.',
  'Ошибка в метаданных. Неправильно указан исполнитель трека, это вводит слушателей в заблуждение.',
  'Дубликат трека. Этот же трек уже загружен на платформу другим пользователем ранее.',
  'Спам-загрузка. Пользователь загружает один и тот же трек под разными названиями.',
  'Трек содержит пропаганду насилия. Необходимо проверить текст и при необходимости заблокировать.',
  'Неправильно указан жанр трека. Это рэп, а не поп-музыка. Просьба исправить классификацию.',
  'Обложка трека содержит неприемлемое изображение. Просьба заменить на более подходящее.',
  'Трек обрывается на середине. Похоже, загрузка аудиофайла прошла с ошибкой.',
];

// ==================== ОСНОВНАЯ ФУНКЦИЯ ====================

async function seed() {
  try {
    console.log('🎵 Запуск seed-скрипта Aridai Music...\n');

    // Подключение к БД
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Подключено к MongoDB:', MONGODB_URI);

    // Очистка базы данных
    console.log('\n🗑️  Очистка базы данных...');
    await Promise.all([
      User.deleteMany({}),
      Track.deleteMany({}),
      Genre.deleteMany({}),
      Report.deleteMany({}),
      Playlist.deleteMany({}),
    ]);
    console.log('✅ База данных очищена');

    // ---- Жанры ----
    console.log('\n🎼 Создание жанров...');
    const genres = await Genre.insertMany(genresData);
    console.log(`✅ Создано ${genres.length} жанров`);

    // ---- Админ ----
    console.log('\n👤 Создание администратора...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await User.create({
      email: 'admin@aridai.kz',
      name: 'Администратор',
      password: hashedPassword,
      role: 'admin',
      googleId: 'admin_google_id_seed',
      avatar: '',
    });
    console.log(`✅ Админ создан: ${admin.email} / пароль: admin123`);

    // ---- Фото артистов ----
    console.log('\n📸 Загрузка фото артистов...');
    for (let i = 0; i < artistsData.length; i++) {
      const filename = `artist-${i}.jpg`;
      const dest = path.join(COVERS_DIR, filename);
      try {
        await downloadFile(`https://picsum.photos/seed/artist${i}/400/400`, dest);
        artistsData[i]._imageFile = `/uploads/covers/${filename}`;
      } catch (_) {
        artistsData[i]._imageFile = '';
      }
    }
    console.log('✅ Фото загружены');

    // ---- Артисты ----
    console.log('\n🎤 Создание артистов...');
    const artists = [];
    for (const data of artistsData) {
      const artist = await User.create({
        email: data.email,
        name: data.name,
        role: 'artist',
        artistName: data.artistName,
        artistBio: data.artistBio,
        artistImage: data._imageFile || '',
        isVerified: data.isVerified,
        googleId: `artist_google_${data.email}`,
      });
      artists.push(artist);
    }
    console.log(`✅ Создано ${artists.length} артистов`);

    // ---- Слушатели ----
    console.log('\n🎧 Создание слушателей...');
    const listeners = [];
    for (const data of listenersData) {
      const listener = await User.create({
        email: data.email,
        name: data.name,
        role: 'listener',
        googleId: `listener_google_${data.email}`,
      });
      listeners.push(listener);
    }
    console.log(`✅ Создано ${listeners.length} слушателей`);

    // ---- Обложки треков ----
    console.log('\n🖼️  Загрузка обложек треков...');
    let coverIndex = 0;
    for (let i = 0; i < tracksPerArtist.length; i++) {
      for (let j = 0; j < tracksPerArtist[i].length; j++) {
        const filename = `cover-${coverIndex}.jpg`;
        const dest = path.join(COVERS_DIR, filename);
        try {
          await downloadFile(`https://picsum.photos/seed/track${coverIndex}/500/500`, dest);
          tracksPerArtist[i][j]._coverFile = `/uploads/covers/${filename}`;
        } catch (_) {
          tracksPerArtist[i][j]._coverFile = '';
        }
        coverIndex++;
      }
    }
    console.log(`✅ Загружено ${coverIndex} обложек`);

    // ---- Треки ----
    console.log('\n🎶 Создание треков...');
    const allTracks = [];
    const genreTrackCounts = {};
    const defaultAudio = '/uploads/tracks/default.mp3';

    for (let i = 0; i < artists.length; i++) {
      const artist = artists[i];
      const artistTracks = tracksPerArtist[i];

      for (const trackData of artistTracks) {
        const likesCount = Math.floor(trackData.playCount * (0.03 + Math.random() * 0.07));
        const dislikesCount = Math.floor(likesCount * (0.01 + Math.random() * 0.05));
        const savesCount = Math.floor(likesCount * (0.3 + Math.random() * 0.4));

        // Генерация рейтингов от случайных слушателей
        const ratingCount = Math.floor(3 + Math.random() * 12);
        const ratings = [];
        const usedListeners = new Set();
        for (let r = 0; r < Math.min(ratingCount, listeners.length); r++) {
          let listenerIdx;
          do {
            listenerIdx = Math.floor(Math.random() * listeners.length);
          } while (usedListeners.has(listenerIdx));
          usedListeners.add(listenerIdx);
          ratings.push({
            user: listeners[listenerIdx]._id,
            value: Math.floor(3 + Math.random() * 3), // 3-5
          });
        }
        const averageRating = ratings.length > 0
          ? Math.round((ratings.reduce((s, r) => s + r.value, 0) / ratings.length) * 10) / 10
          : 0;

        const description = `Трек «${trackData.title}» от ${artist.artistName}. Жанр: ${trackData.genre}.`;
        const keywords = [
          trackData.title.toLowerCase(),
          artist.artistName.toLowerCase(),
          trackData.genre.toLowerCase(),
          'казахстан',
          'музыка',
          'aridai',
        ];

        const track = await Track.create({
          title: trackData.title,
          artist: artist._id,
          artistName: artist.artistName,
          album: trackData.album,
          genre: trackData.genre,
          description,
          coverImage: trackData._coverFile || '',
          audioFile: defaultAudio,
          duration: trackData.duration,
          playCount: trackData.playCount,
          likesCount,
          dislikesCount,
          savesCount,
          ratings,
          averageRating,
          keywords,
          isPublished: true,
        });

        allTracks.push(track);

        // Подсчёт треков по жанрам
        genreTrackCounts[trackData.genre] = (genreTrackCounts[trackData.genre] || 0) + 1;
      }
    }
    console.log(`✅ Создано ${allTracks.length} треков`);

    // Обновление количества треков в жанрах
    for (const genre of genres) {
      const count = genreTrackCounts[genre.name] || 0;
      await Genre.findByIdAndUpdate(genre._id, { trackCount: count });
    }
    console.log('✅ Количество треков в жанрах обновлено');

    // Заполнение лайков/сохранений у слушателей
    console.log('\n💜 Заполнение взаимодействий слушателей...');
    for (const listener of listeners) {
      const likedCount = 5 + Math.floor(Math.random() * 15);
      const savedCount = 3 + Math.floor(Math.random() * 10);
      const shuffled = [...allTracks].sort(() => Math.random() - 0.5);
      const likedTracks = shuffled.slice(0, likedCount).map(t => t._id);
      const savedTracks = shuffled.slice(0, savedCount).map(t => t._id);
      const listenHistory = shuffled.slice(0, 10).map(t => ({
        track: t._id,
        listenedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      }));

      await User.findByIdAndUpdate(listener._id, {
        likedTracks,
        savedTracks,
        listenHistory,
      });
    }
    console.log('✅ Взаимодействия слушателей заполнены');

    // ---- Жалобы ----
    console.log('\n🚨 Создание жалоб...');
    const reportStatuses = ['pending', 'pending', 'pending', 'pending', 'reviewed', 'reviewed', 'resolved', 'resolved', 'resolved', 'dismissed'];
    const reports = [];
    for (let i = 0; i < 10; i++) {
      const randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)];
      const randomListener = listeners[Math.floor(Math.random() * listeners.length)];
      const status = reportStatuses[i];

      const reportData = {
        track: randomTrack._id,
        user: randomListener._id,
        reason: reportReasons[i],
        status,
      };

      if (status === 'reviewed' || status === 'resolved' || status === 'dismissed') {
        reportData.reviewedBy = admin._id;
        reportData.reviewedAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
        if (status === 'resolved') {
          reportData.adminNote = 'Жалоба рассмотрена. Приняты необходимые меры.';
        } else if (status === 'dismissed') {
          reportData.adminNote = 'Жалоба отклонена. Нарушений не обнаружено.';
        } else {
          reportData.adminNote = 'Жалоба принята к рассмотрению.';
        }
      }

      reports.push(await Report.create(reportData));
    }
    console.log(`✅ Создано ${reports.length} жалоб`);

    // ---- Плейлисты ----
    console.log('\n📋 Создание плейлистов...');

    // Системные плейлисты
    const topTracks = [...allTracks].sort((a, b) => b.playCount - a.playCount).slice(0, 20);
    const newTracks = [...allTracks].sort((a, b) => b.createdAt - a.createdAt).slice(0, 15);

    const systemPlaylists = [
      {
        title: 'Хиты Казахстана',
        description: 'Самые популярные треки на платформе Aridai Music',
        user: admin._id,
        tracks: topTracks.map(t => t._id),
        isPublic: true,
        isSystem: true,
        systemType: 'hits',
      },
      {
        title: 'Новинки',
        description: 'Свежие релизы и новые треки от любимых исполнителей',
        user: admin._id,
        tracks: newTracks.map(t => t._id),
        isPublic: true,
        isSystem: true,
        systemType: 'new',
      },
      {
        title: 'Рекомендации',
        description: 'Подборка лучших треков специально для вас',
        user: admin._id,
        tracks: [...allTracks].sort(() => Math.random() - 0.5).slice(0, 15).map(t => t._id),
        isPublic: true,
        isSystem: true,
        systemType: 'recommended',
      },
    ];

    // Пользовательские плейлисты
    const userPlaylists = [
      {
        title: 'Для тренировки',
        description: 'Энергичные треки для спорта и тренировок',
        user: listeners[0]._id,
        tracks: allTracks.filter(t => ['Rap', 'Electronic'].includes(t.genre)).slice(0, 8).map(t => t._id),
        isPublic: true,
        isSystem: false,
      },
      {
        title: 'Вечерний вайб',
        description: 'Спокойная музыка для уютного вечера',
        user: listeners[2]._id,
        tracks: allTracks.filter(t => ['RnB', 'Jazz', 'Folk'].includes(t.genre)).slice(0, 6).map(t => t._id),
        isPublic: true,
        isSystem: false,
      },
      {
        title: 'Казахские хиты',
        description: 'Лучшие казахскоязычные треки',
        user: listeners[4]._id,
        tracks: allTracks.filter(t => t.genre === 'Folk' || t.artistName === 'Ninety One' || t.artistName === 'Moldanazar').map(t => t._id),
        isPublic: true,
        isSystem: false,
      },
      {
        title: 'Мой плейлист',
        description: 'Личная коллекция любимых треков',
        user: listeners[6]._id,
        tracks: [...allTracks].sort(() => Math.random() - 0.5).slice(0, 12).map(t => t._id),
        isPublic: false,
        isSystem: false,
      },
    ];

    const playlists = await Playlist.insertMany([...systemPlaylists, ...userPlaylists]);
    console.log(`✅ Создано ${playlists.length} плейлистов`);

    // Привязка плейлистов к пользователям
    for (const pl of playlists) {
      await User.findByIdAndUpdate(pl.user, { $push: { playlists: pl._id } });
    }

    // ---- JWT токен админа ----
    const adminToken = jwt.sign(
      { userId: admin._id, email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // ---- Итоги ----
    console.log('\n══════════════════════════════════════════════');
    console.log('  🎵 Seed-скрипт Aridai Music завершён!');
    console.log('══════════════════════════════════════════════');
    console.log(`  Администраторов: 1`);
    console.log(`  Артистов:        ${artists.length}`);
    console.log(`  Слушателей:      ${listeners.length}`);
    console.log(`  Жанров:          ${genres.length}`);
    console.log(`  Треков:          ${allTracks.length}`);
    console.log(`  Жалоб:           ${reports.length}`);
    console.log(`  Плейлистов:      ${playlists.length}`);
    console.log('══════════════════════════════════════════════');
    console.log('\n🔑 JWT токен администратора:');
    console.log(`\n${adminToken}\n`);
    console.log('══════════════════════════════════════════════\n');

    await mongoose.connection.close();
    console.log('🔌 Соединение с MongoDB закрыто');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка seed-скрипта:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seed();
