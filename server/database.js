const mysql = require('mysql2/promise');
require('dotenv').config();

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'animahub',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// 获取数据库连接
async function getConnection() {
  return await pool.getConnection();
}

// 检查数据库连接
async function testConnection() {
  try {
    const connection = await getConnection();
    console.log('连接到MySQL数据库');
    connection.release(); // 释放连接回连接池
  } catch (err) {
    console.error('数据库连接失败:', err.message);
    throw err;
  }
}

// 初始化数据库表
async function initDatabase() {
  const connection = await getConnection();
  
  try {
    // 使用 async/await 执行创建表的语句
    // 用户表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 项目表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        user_id INT,
        status ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') DEFAULT 'DRAFT',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // 角色表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS characters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT,
        name VARCHAR(255) NOT NULL,
        gender ENUM('MALE', 'FEMALE', 'OTHER'),
        age_group ENUM('CHILD', 'TEENAGER', 'ADULT', 'ELDERLY'),
        description TEXT,
        prompt TEXT,
        model VARCHAR(255),
        image_url VARCHAR(500),
        reference_image VARCHAR(500),
        status ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') DEFAULT 'DRAFT',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    `);

    // 场景表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS scenes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        prompt TEXT,
        image_url VARCHAR(500),
        status ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') DEFAULT 'DRAFT',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    `);

    // 道具表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS props (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        prompt TEXT,
        image_url VARCHAR(500),
        status ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') DEFAULT 'DRAFT',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    `);

    // 特效表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS effects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        prompt TEXT,
        image_url VARCHAR(500),
        status ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') DEFAULT 'DRAFT',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    `);

    // 合成图片表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS composite_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        prompt TEXT,
        image_url VARCHAR(500),
        status ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') DEFAULT 'DRAFT',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    `);

    // 生成的视频表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS generated_videos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        start_image_url VARCHAR(500),
        generation_model VARCHAR(255),
        duration INT DEFAULT 5,
        video_url VARCHAR(500),
        status ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') DEFAULT 'DRAFT',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )
    `);

    console.log('数据库表创建完成');
  } catch (err) {
    console.error('数据库表创建失败:', err.message);
    throw err;
  } finally {
    connection.release(); // 释放连接回连接池
  }
}

module.exports = { pool, getConnection, testConnection, initDatabase };