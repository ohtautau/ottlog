const BASE_URL = '/api'

function getToken() {
  return uni.getStorageSync('token') || ''
}

function request(options) {
  return new Promise((resolve, reject) => {
    const token = getToken()

    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
        ...options.header,
      },
      success(res) {
        if (res.statusCode === 401) {
          uni.removeStorageSync('token')
          uni.removeStorageSync('user')
          uni.navigateTo({ url: '/pages/login/index' })
          reject(new Error('unauthorized'))
          return
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (res.data.code === 0) {
            resolve(res.data.data)
          } else {
            uni.showToast({ title: res.data.message || '请求失败', icon: 'none' })
            reject(new Error(res.data.message))
          }
        } else {
          uni.showToast({ title: res.data.message || '网络错误', icon: 'none' })
          reject(new Error(res.data.message))
        }
      },
      fail(err) {
        uni.showToast({ title: '网络连接失败', icon: 'none' })
        reject(err)
      },
    })
  })
}

export function get(url, data) {
  return request({ url, method: 'GET', data })
}

export function post(url, data) {
  return request({ url, method: 'POST', data })
}

export function put(url, data) {
  return request({ url, method: 'PUT', data })
}

export function patch(url, data) {
  return request({ url, method: 'PATCH', data })
}

export function del(url, data) {
  return request({ url, method: 'DELETE', data })
}

export default request
