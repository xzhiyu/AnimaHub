const express = require('express');
const { authenticateToken } = require('../middleware');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保uploads目录存在
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // 只允许图片文件
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 限制10MB
  }
});

// 上传图片（处理base64格式）
router.post('/image', authenticateToken, async (req, res) => {
  const { imageData, fileName } = req.body;

  if (!imageData) {
    return res.status(400).json({ error: '缺少图片数据' });
  }

  try {
    // 检查是否是base64格式
    let base64Data;
    if (imageData.includes('base64,')) {
      // 如果是完整的data URL格式 (data:image/png;base64,xxxxx)
      base64Data = imageData.split(',')[1];
    } else {
      // 如果只是base64字符串
      base64Data = imageData;
    }

    // 解码base64数据
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // 验证是否为有效图片
    if (!isValidImageBuffer(imageBuffer)) {
      return res.status(400).json({ error: '无效的图片数据' });
    }

    // 生成文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = getExtensionFromBuffer(imageBuffer) || '.jpg';
    const filename = `upload-${uniqueSuffix}${ext}`;
    const filepath = path.join(uploadDir, filename);

    // 保存文件
    await fs.promises.writeFile(filepath, imageBuffer);

    // 返回文件URL
    const imageUrl = `/uploads/${filename}`;
    
    res.json({
      url: imageUrl,
      filename: filename,
      message: '图片上传成功'
    });
  } catch (error) {
    console.error('图片上传失败:', error);
    res.status(500).json({ error: '图片上传失败' });
  }
});

// 上传图片文件（multipart/form-data格式）
router.post('/image-file', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '未上传文件或文件格式不正确' });
  }

  try {
    const imageUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      url: imageUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      message: '图片上传成功'
    });
  } catch (error) {
    console.error('处理上传文件失败:', error);
    res.status(500).json({ error: '处理上传文件失败' });
  }
});

// 验证图片缓冲区是否有效
function isValidImageBuffer(buffer) {
  // 检查常见的图片文件头
  if (buffer.length < 4) return false;

  // 检查PNG文件头
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return true;
  }

  // 检查JPG文件头
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    return true;
  }

  // 检查GIF文件头
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return true;
  }

  // 检查BMP文件头
  if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
    return true;
  }

  return false;
}

// 根据文件头获取扩展名
function getExtensionFromBuffer(buffer) {
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return '.png';
  }
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    return '.jpg';
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return '.gif';
  }
  if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
    return '.bmp';
  }
  return null;
}

module.exports = router;