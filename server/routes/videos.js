const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware');
const router = express.Router();

// 为项目创建视频片段
router.post('/', authenticateToken, (req, res) => {
  const { projectId, name, description, startImageUrl, generationModel, duration } = req.body;
  const userId = req.user.id;

  // 验证项目是否属于当前用户
  const validateQuery = 'SELECT id FROM projects WHERE id = ? AND user_id = ?';
  db.get(validateQuery, [projectId, userId], (err, project) => {
    if (err) {
      return res.status(500).json({ error: '验证失败' });
    }

    if (!project) {
      return res.status(404).json({ error: '项目不存在或无权限访问' });
    }

    // 创建视频片段记录
    const insertQuery = `
      INSERT INTO generated_videos (
        project_id, name, description, start_image_url, generation_model, duration, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      insertQuery,
      [projectId, name, description, startImageUrl, generationModel, duration, 'DRAFT'],
      function (err) {
        if (err) {
          return res.status(500).json({ error: '创建视频片段失败' });
        }

        res.json({ 
          message: '视频片段创建成功', 
          id: this.lastID,
          status: 'DRAFT'
        });
      }
    );
  });
});

// 删除视频片段
router.delete('/:id', authenticateToken, (req, res) => {
  const videoId = req.params.id;
  const userId = req.user.id;

  // 验证视频片段是否属于当前用户的项目
  const validateQuery = `
    SELECT v.id 
    FROM generated_videos v
    JOIN projects p ON v.project_id = p.id
    WHERE v.id = ? AND p.user_id = ?
  `;

  db.get(validateQuery, [videoId, userId], (err, video) => {
    if (err) {
      return res.status(500).json({ error: '验证失败' });
    }

    if (!video) {
      return res.status(404).json({ error: '视频片段不存在或无权限删除' });
    }

    const deleteQuery = 'DELETE FROM generated_videos WHERE id = ?';

    db.run(deleteQuery, [videoId], function (err) => {
      if (err) {
        return res.status(500).json({ error: '删除视频片段失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '视频片段不存在' });
      }

      res.json({ message: '视频片段删除成功' });
    });
  });
});

// 更新视频片段
router.put('/:id', authenticateToken, (req, res) => {
  const videoId = req.params.id;
  const { name, description, videoUrl, status } = req.body;
  const userId = req.user.id;

  // 验证视频片段是否属于当前用户的项目
  const validateQuery = `
    SELECT v.id 
    FROM generated_videos v
    JOIN projects p ON v.project_id = p.id
    WHERE v.id = ? AND p.user_id = ?
  `;

  db.get(validateQuery, [videoId, userId], (err, video) => {
    if (err) {
      return res.status(500).json({ error: '验证失败' });
    }

    if (!video) {
      return res.status(404).json({ error: '视频片段不存在或无权限更新' });
    }

    // 构建动态更新查询
    let updateFields = [];
    let params = [];
    
    if (name !== undefined) {
      updateFields.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      params.push(description);
    }
    if (videoUrl !== undefined) {
      updateFields.push('video_url = ?');
      params.push(videoUrl);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      params.push(status);
      // 更新时间戳
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: '没有提供更新字段' });
    }
    
    const updateQuery = `UPDATE generated_videos SET ${updateFields.join(', ')} WHERE id = ?`;
    params.push(videoId);

    db.run(updateQuery, params, function (err) {
      if (err) {
        return res.status(500).json({ error: '更新视频片段失败' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '视频片段不存在' });
      }

      res.json({ message: '视频片段更新成功' });
    });
  });
});

module.exports = router;