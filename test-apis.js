/**
 * API接口测试文件
 * 用于验证前端调用的API接口是否已正确实现
 */

const axios = require('axios');

// API基础URL
const BASE_URL = 'http://localhost:3001/api';

// 测试接口列表
const testEndpoints = [
  // 图像相关接口
  { method: 'GET', path: '/images/history', description: '获取图像生成历史' },
  { method: 'POST', path: '/images/generate', description: '生成图像', data: { prompt: 'test prompt' } },
  
  // 上传相关接口
  { method: 'POST', path: '/upload/image', description: '上传图像', data: { imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' } },
  
  // Sora相关接口
  { method: 'POST', path: '/sora/generate-video', description: '生成视频', data: { prompt: 'test video prompt' } },
  { method: 'GET', path: '/sora/video-status/task-test', description: '获取视频生成状态' },
];

async function testAPIs() {
  console.log('开始测试API接口...\n');
  
  for (const endpoint of testEndpoints) {
    try {
      const url = `${BASE_URL}${endpoint.path}`;
      console.log(`测试: ${endpoint.description}`);
      console.log(`请求: ${endpoint.method} ${endpoint.path}`);
      
      let response;
      if (endpoint.method === 'GET') {
        response = await axios.get(url, {
          headers: {
            'Authorization': 'Bearer test-token' // 测试用token
          },
          timeout: 5000
        });
      } else if (endpoint.method === 'POST') {
        response = await axios.post(url, endpoint.data || {}, {
          headers: {
            'Authorization': 'Bearer test-token', // 测试用token
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });
      }
      
      console.log(`状态: ${response.status} - 成功`);
      console.log(`响应: ${JSON.stringify(response.data, null, 2)}`);
      console.log('---');
    } catch (error) {
      if (error.response) {
        console.log(`状态: ${error.response.status} - 失败`);
        console.log(`错误: ${JSON.stringify(error.response.data, null, 2)}`);
      } else if (error.request) {
        console.log(`状态: 连接失败 - 服务器可能未运行`);
      } else {
        console.log(`状态: 请求配置错误 - ${error.message}`);
      }
      console.log('---');
    }
  }
  
  console.log('\nAPI接口测试完成！');
}

// 运行测试
testAPIs();