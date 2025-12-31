const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware');
const router = express.Router();

// 获取用户的所有项目
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id;

  const query = `
    SELECT 
      p.id,
      p.title,
      p.description,
      p.status,
      p.updated_at as updatedAt
    FROM projects p
    WHERE p.user_id = ?
    ORDER BY p.updated_at DESC
  `;

  db.all(query, [userId], (err, projects) => {
    if (err) {
      return res.status(500).json({ error: '获取项目列表失败' });
    }

    res.json(projects);
  });
});

// 创建新项目
router.post('/', authenticateToken, (req, res) => {
  const { title, description } = req.body;
  const userId = req.user.id;

  if (!title) {
    return res.status(400).json({ error: '项目名称不能为空' });
  }

  const query = 'INSERT INTO projects (title, description, user_id) VALUES (?, ?, ?)';
  
  db.run(query, [title, description, userId], function (err) {
    if (err) {
      return res.status(500).json({ error: '创建项目失败' });
    }

    res.json({ 
      id: this.lastID, 
      title, 
      description, 
      status: 'DRAFT',
      updatedAt: new Date().toISOString()
    });
  });
});

// 获取单个项目详情
router.get('/:id', authenticateToken, (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;

  // 首先验证项目属于当前用户
  const projectQuery = `
    SELECT id, title, description, status
    FROM projects 
    WHERE id = ? AND user_id = ?
  `;

  db.get(projectQuery, [projectId, userId], (err, project) => {
    if (err) {
      return res.status(500).json({ error: '获取项目详情失败' });
    }

    if (!project) {
      return res.status(404).json({ error: '项目不存在或无权限访问' });
    }

    // 获取项目的所有资源
    const assetsQuery = `
      SELECT 
        c.id, c.name, c.image_url as imageUrl, c.status, c.updated_at as updatedAt
      FROM characters c
      WHERE c.project_id = ?
      UNION ALL
      SELECT 
        s.id, s.name, s.image_url as imageUrl, s.status, s.updated_at as updatedAt
      FROM scenes s
      WHERE s.project_id = ?
      UNION ALL
      SELECT 
        p.id, p.name, p.image_url as imageUrl, p.status, p.updated_at as updatedAt
      FROM props p
      WHERE p.project_id = ?
      UNION ALL
      SELECT 
        e.id, e.name, e.image_url as imageUrl, e.status, e.updated_at as updatedAt
      FROM effects e
      WHERE e.project_id = ?
    `;

    // 获取项目中的视频片段
    const videosQuery = `
      SELECT 
        id, name, description, video_url as videoUrl, status, created_at as createdAt
      FROM generated_videos
      WHERE project_id = ?
    `;

    // 分别查询所有资源
    db.all(assetsQuery, [projectId, projectId, projectId, projectId], (err, assets) => {
      if (err) {
        return res.status(500).json({ error: '获取项目资源失败' });
      }

      db.all(videosQuery, [projectId], (err, videos) => {
        if (err) {
          return res.status(500).json({ error: '获取项目视频失败' });
        }

        // 按类型分组资源
        const characters = assets.filter(asset => 
          asset.imageUrl && (asset.imageUrl.includes('character') || asset.name.includes('角色'))
        );
        const scenes = assets.filter(asset => 
          asset.imageUrl && (asset.imageUrl.includes('scene') || asset.name.includes('场景'))
        );
        const props = assets.filter(asset => 
          asset.imageUrl && (asset.imageUrl.includes('prop') || asset.name.includes('道具'))
        );
        const effects = assets.filter(asset => 
          asset.imageUrl && (asset.imageUrl.includes('effect') || asset.name.includes('特效'))
        );

        res.json({
          ...project,
          assetCharacters: characters,
          assetScenes: scenes,
          assetProps: props,
          assetEffects: effects,
          generatedVideos: videos || []
        });
      });
    });
  });
});

// 更新项目
router.put('/:id', authenticateToken, (req, res) => {
  const projectId = req.params.id;
  const { title, description } = req.body;
  const userId = req.user.id;

  const query = 'UPDATE projects SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?';

  db.run(query, [title, description, projectId, userId], function (err) {
    if (err) {
      return res.status(500).json({ error: '更新项目失败' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: '项目不存在或无权限更新' });
    }

    res.json({ message: '项目更新成功' });
  });
});

// 删除项目
router.delete('/:id', authenticateToken, (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;

  const query = 'DELETE FROM projects WHERE id = ? AND user_id = ?';

  db.run(query, [projectId, userId], function (err) {
    if (err) {
      return res.status(500).json({ error: '删除项目失败' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: '项目不存在或无权限删除' });
    }

    res.json({ message: '项目删除成功' });
  });
});

// 同步所有项目状态（简单实现，实际项目中可能需要更复杂的逻辑）
router.post('/sync-all', authenticateToken, (req, res) => {
  // 这里可以实现同步逻辑，如检查后台任务状态等
  // 目前返回成功状态
  res.json({ message: '同步完成' });
});

// 同步单个项目资源
router.post('/:id/assets/sync', authenticateToken, (req, res) => {
  const projectId = req.params.id;
  const userId = req.user.id;

  // 验证项目属于当前用户
  const validateQuery = 'SELECT id FROM projects WHERE id = ? AND user_id = ?';
  db.get(validateQuery, [projectId, userId], (err, project) => {
    if (err) {
      return res.status(500).json({ error: '验证失败' });
    }

    if (!project) {
      return res.status(404).json({ error: '项目不存在或无权限访问' });
    }

    // 这里可以实现同步逻辑，如检查后台任务状态等
    // 目前返回成功状态
    res.json({ message: '同步完成' });
  });
});

module.exports = router;