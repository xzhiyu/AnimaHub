const express = require('express');
const { getConnection } = require('../database');
const { authenticateToken } = require('../middleware');
const aiService = require('../services/aiService');
const router = express.Router();

// 图像生成历史记录
router.get('/history', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const connection = await getConnection();
    
    try {
      // 获取用户的所有图像生成历史
      const query = `
        SELECT 
          id, 
          prompt, 
          image_url as imageUrl, 
          revised_prompt as revisedPrompt,
          model,
          ratio,
          created_at as createdAt
        FROM image_generations 
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `;

      const [history] = await connection.execute(query, [userId]);
      
      res.json(history);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('获取图像生成历史失败:', error);
    res.status(500).json({ error: '获取历史记录失败' });
  }
});

// 生成图像
router.post('/generate', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { prompt, model = 'nano-banana-2-4k', size = '1024x1024', referenceImage, ratio = '1:1' } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: '提示词不能为空' });
  }

  try {
    // 调用AI服务生成图像
    const aiResult = await aiService.call('nano-banana', {
      prompt,
      model,
      size,
      referenceImage
    });

    if (!aiResult.success) {
      return res.status(500).json({ error: aiResult.error || '图像生成失败' });
    }

    const { imageUrl, revisedPrompt } = aiResult.data;

    // 保存到数据库
    const connection = await getConnection();
    
    try {
      const insertQuery = `
        INSERT INTO image_generations (
          user_id, prompt, image_url, revised_prompt, model, ratio
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      const [result] = await connection.execute(
        insertQuery,
        [userId, prompt, imageUrl, revisedPrompt, model, ratio]
      );

      res.json({
        url: imageUrl,
        revisedPrompt,
        id: result.insertId
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('图像生成失败:', error);
    res.status(500).json({ error: '图像生成失败' });
  }
});

module.exports = router;