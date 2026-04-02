const Report = require('../models/Report');

exports.createReport = async (req, res) => {
  try {
    const { trackId, reason } = req.body;

    if (!reason || reason.length < 10) {
      return res.status(400).json({ message: 'Опишите причину жалобы (минимум 10 символов)' });
    }

    const existing = await Report.findOne({
      track: trackId,
      user: req.user._id,
      status: 'pending'
    });
    if (existing) {
      return res.status(400).json({ message: 'Вы уже отправили жалобу на этот трек' });
    }

    const report = await Report.create({
      track: trackId,
      user: req.user._id,
      reason
    });

    res.status(201).json({ message: 'Жалоба отправлена', report });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

exports.getReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const reports = await Report.find(query)
      .populate('track', 'title artistName coverImage')
      .populate('user', 'name email avatar')
      .populate('reviewedBy', 'name')
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Report.countDocuments(query);

    res.json({
      reports,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};

exports.updateReport = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      {
        status,
        adminNote,
        reviewedBy: req.user._id,
        reviewedAt: new Date()
      },
      { new: true }
    );
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка', error: error.message });
  }
};
