const Koa = require('koa')
const app = new Koa()
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// 定义资源类型常量列表
const mimes = {
  css: 'text/css',
  less: 'text/css',
  gif: 'image/gif',
  html: 'text/html',
  ico: 'image/x-icon',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  js: 'text/javascript',
  json: 'application/json',
  pdf: 'application/pdf',
  png: 'image/png',
  svg: 'image/svg+xml',
  swf: 'application/x-shockwave-flash',
  tiff: 'image/tiff',
  txt: 'text/plain',
  wav: 'audio/x-wav',
  wma: 'audio/x-ms-wma',
  wmv: 'video/x-ms-wmv',
  xml: 'text/xml',
}

// 解析资源类型
function parseMime(url) {
  // path.extname获取路径中文件的后缀名
  let extName = path.extname(url)
  extName = extName ? extName.slice(1) : 'unknown'
  return mimes[extName]
}

const parseStatic = (dir) => {
  return new Promise((resolve) => {
    resolve(fs.readFileSync(dir), 'binary')
  })
}

function getFileStat(filePath) {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, function (err, stats) {
      if (stats) {
        resolve(stats)
      } else {
        reject(err)
      }
    })
  })
}

app.use(async (ctx) => {
  const url = ctx.request.url
  if (url === '/') {
    // 访问根路径返回index.html
    ctx.set('Content-Type', 'text/html')
    ctx.body = await parseStatic('./index.html')
  } else {
    const filePath = path.resolve(__dirname, `.${url}`)
    ctx.set('Content-Type', parseMime(url))
    /**
     * @title 强缓存
     * @descript Expires设置10秒后过期
     */
    ctx.set('Expires', new Date(Date.now() + 10000).toGMTString())
    ctx.body = await parseStatic(filePath)

    /**
     * @title 强缓存
     * @descript Cache-Control max-age=10 设置10秒后过期
     */
    ctx.set('Cache-Control', 'max-age=10')
    ctx.body = await parseStatic(filePath)


    /**
     * @title 协商缓存
     * @descript etag、if-none-match  Last-Modified、if-modified-since
     */
    ctx.set('Cache-Control', 'no-cache')
    const fileBuffer = await parseStatic(filePath)
    const ifNoneMatch = ctx.request.headers['if-none-match']
    const hash = crypto.createHash('md5')
    hash.update(fileBuffer)
    const ifModifiedSince = ctx.request.header['if-modified-since']
    const fileStat = await getFileStat(filePath)

    const etag = `"${hash.digest('hex')}"`
    if (ifModifiedSince === fileStat.mtime.toGMTString()) { // 资源没有变
      if (ifNoneMatch === etag) { // 资源没有变
        ctx.status = 304 // 状态码放回304
        // 资源直接去浏览器拿
      } else { // etag 没有匹配上
        // 服务器返回 资源
        ctx.set('Last-Modified', fileStat.mtime.toGMTString())
        ctx.set('etag', etag)
        ctx.body = fileBuffer
      }
    } else { // 文件修改的时间 没有匹配上
       // 服务器返回 资源
      ctx.set('Last-Modified', fileStat.mtime.toGMTString())
      ctx.set('etag', etag)
      ctx.body = fileBuffer
    }
  }
})

app.listen(3000, () => {
  console.log('starting at port 3000')
})
