const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const BACKUP_PATH = path.join(__dirname, '../backups');
const BACKUP_INTERVAL = 6 * 60 * 60 * 1000; // 6 часов

function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(BACKUP_PATH, `backup-${timestamp}`);

  if (!fs.existsSync(BACKUP_PATH)) {
    fs.mkdirSync(BACKUP_PATH, { recursive: true });
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aridai';
  const cmd = `mongodump --uri="${mongoUri}" --out="${backupDir}"`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Backup] Ошибка: ${error.message}`);
      return;
    }
    console.log(`[Backup] Успешно создан: ${backupDir}`);
    cleanOldBackups();
  });
}

function cleanOldBackups() {
  const MAX_BACKUPS = 28; // 7 дней * 4 бэкапа в день
  const dirs = fs.readdirSync(BACKUP_PATH)
    .filter(d => d.startsWith('backup-'))
    .sort()
    .reverse();

  dirs.slice(MAX_BACKUPS).forEach(dir => {
    const fullPath = path.join(BACKUP_PATH, dir);
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`[Backup] Удалён старый бэкап: ${dir}`);
  });
}

function startBackupSchedule() {
  console.log('[Backup] Расписание: каждые 6 часов');
  setInterval(runBackup, BACKUP_INTERVAL);
  // Первый бэкап через 5 минут после запуска
  setTimeout(runBackup, 5 * 60 * 1000);
}

module.exports = { startBackupSchedule, runBackup };
