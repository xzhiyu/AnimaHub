const express = require('express');
const { getConnection } = require('../database');
const { authenticateToken } = require('../middleware');
const aiService = require('../services/aiService');
const router = express.Router();

// 存储视频生成任务状态（实际项目中可能需要使用Redis等）
const videoTasks = new Map();

// 生成视频
router.post('/generate-video', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { prompt, referenceImages = [], duration = 5 } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: '视频描述不能为空' });
  }

  try {
    // 调用AI服务生成视频
    const aiResult = await aiService.call('sora2', {
      prompt,
      referenceImages,
      duration
    });

    if (!aiResult.success) {
      return res.status(500).json({ error: aiResult.error || '视频生成失败' });
    }

    const { taskId, status } = aiResult.data;

    // 保存任务到内存中（实际项目中应使用数据库或Redis）
    videoTasks.set(taskId, {
      id: taskId,
      userId,
      prompt,
      status: 'processing',
      referenceImages,
      duration,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // 保存到数据库
    const connection = await getConnection();
    
    try {
      const insertQuery = `
        INSERT INTO video_generations (
          user_id, prompt, task_id, status, reference_images, duration
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      const referenceImagesStr = JSON.stringify(referenceImages);
      const [result] = await connection.execute(
        insertQuery,
        [userId, prompt, taskId, 'processing', referenceImagesStr, duration]
      );

      res.json({
        taskId,
        status: 'processing',
        id: result.insertId
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('视频生成失败:', error);
    res.status(500).json({ error: '视频生成失败' });
  }
});

// 获取视频生成状态
router.get('/video-status/:taskId', authenticateToken, async (req, res) => {
  const taskId = req.params.taskId;
  const userId = req.user.id;

  try {
    // 首先检查内存中的任务状态
    const task = videoTasks.get(taskId);
    
    if (!task) {
      // 如果内存中没有，从数据库查询
      const connection = await getConnection();
      
      try {
        const query = `
          SELECT 
            task_id as taskId, 
            status, 
            video_url as videoUrl,
            prompt,
            error_message as errorMessage
          FROM video_generations 
          WHERE task_id = ? AND user_id = ?
        `;

        const [rows] = await connection.execute(query, [taskId, userId]);
        
        if (rows.length === 0) {
          return res.status(404).json({ error: '任务不存在或无权限访问' });
        }

        return res.json(rows[0]);
      } finally {
        connection.release();
      }
    }

    // 如果任务属于当前用户，返回任务状态
    if (task.userId !== userId) {
      return res.status(403).json({ error: '无权限访问此任务' });
    }

    // 模拟任务完成（实际项目中这里应该是异步处理完成后的状态）
    // 在实际应用中，视频生成是异步的，需要后台任务处理
    if (task.status === 'completed' && task.videoUrl) {
      res.json({
        taskId: task.id,
        status: task.status,
        videoUrl: task.videoUrl,
        prompt: task.prompt
      });
    } else {
      // 模拟处理过程，这里可以设置一些逻辑来模拟视频生成进度
      res.json({
        taskId: task.id,
        status: task.status,
        prompt: task.prompt
      });
    }
  } catch (error) {
    console.error('获取视频状态失败:', error);
    res.status(500).json({ error: '获取视频状态失败' });
  }
});

// 更新视频生成状态（内部API，用于模拟完成任务）
router.post('/update-status/:taskId', authenticateToken, async (req, res) => {
  const taskId = req.params.taskId;
  const { status, videoUrl, errorMessage } = req.body;
  const userId = req.user.id;

  try {
    const task = videoTasks.get(taskId);
    
    if (!task || task.userId !== userId) {
      return res.status(403).json({ error: '无权限或任务不存在' });
    }

    // 更新内存中的任务状态
    task.status = status;
    if (videoUrl) task.videoUrl = videoUrl;
    if (errorMessage) task.errorMessage = errorMessage;
    task.updatedAt = new Date();

    // 更新数据库
    const connection = await getConnection();
    
    try {
      let updateFields = [];
      let params = [];

      if (status) {
        updateFields.push('status = ?');
        params.push(status);
      }
      if (videoUrl) {
        updateFields.push('video_url = ?');
        params.push(videoUrl);
      }
      if (errorMessage) {
        updateFields.push('error_message = ?');
        params.push(errorMessage);
      }
      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      const updateQuery = `UPDATE video_generations SET ${updateFields.join(', ')} WHERE task_id = ? AND user_id = ?`;
      params.push(taskId, userId);

      const [result] = await connection.execute(updateQuery, params);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: '任务不存在' });
      }

      res.json({ message: '状态更新成功' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('更新视频状态失败:', error);
    res.status(500).json({ error: '更新视频状态失败' });
  }
});

module.exports = router;