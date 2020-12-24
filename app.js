/*
 * @Description: 项目主程序
 * @Author: sufen
 * @Date: 2020-12-24 14:35:29
 * @LastEditTime: 2020-12-24 17:17:47
 * @LastEditors: sufen
 */
const request = require('request')
const iconv = require('iconv-lite')
const cheerio = require('cheerio')
const async = require('async')
const fs = require('fs')

const fetchBrandData = [] // 存放爬取数据

/**
 * 爬取品牌 & 车系
 */
function fetchBrand() {
  const carhtmlList = [] // 存放需要爬取的车辆品牌地址
  let countBrand = 0 // 车辆品牌数
  let countSuccess = 0 // 成功数
  const letter = ['A', 'B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'W', 'X', 'Y', 'Z']

  letter.forEach((item) => {
    carhtmlList.push('http://www.autohome.com.cn/grade/carhtml/' + item + '.html')
  })

  const reptileVehicleModel = (url, callback) => {
    const startTime = Date.now() // 记录该次爬取的开始时间
    request.get(url, { encoding: null }, (err, res, body) => {
      if (err || res.statusCode !== 200) {
        console.error(err)
        console.log('抓取该页面失败，重新抓取该页面……')
        reptileVehicleModel(url, callback)
        return false
      }
      const html = iconv.decode(body, 'gb2312')
      const $ = cheerio.load(html)
      const curBrands = $('dl')
      const curBrandsLen = curBrands.length
      for (let i = 0; i < curBrandsLen; i++) {
        countBrand++
        const brandObj = {
          name: curBrands.eq(i).find('dt div a').text(),
          logo: `https:${curBrands.eq(i).find('dt a img').attr('src')}`,
          group: []
        }

        // 车辆品牌分类，如华晨宝马、进口宝马
        const curBrandGroup = curBrands.eq(i).find('dd div.h3-tit')
        const curBrandSeries = curBrands.eq(i).find('dd ul.rank-list-ul')
        for (let j = 0; j < curBrandGroup.length; j++) {
          const groupObj = {
            name: curBrandGroup.eq(j).text(),
            series: []
          }

          // 品牌分类下的车系，如 3 系、5 系、7 系
          const series = curBrandSeries.eq(j).find('h4 a')
          for (let k = 0; k < series.length; k++) {
            groupObj.series.push({ name: series.eq(k).text(), models: [] })
          }
          brandObj.group.push(groupObj)
        }

        fetchBrandData.push(brandObj)

        console.log(brandObj)
      }
      countSuccess++
      const time = Date.now() - startTime
      console.log(countSuccess + ', ' + url + ', 耗时 ' + time + 'ms')
      callback(null, url + 'Call back content')
    })
  }

  // 使用async控制异步抓取
  // mapLimit(arr, limit, iterator, [callback])
  async.mapLimit(
    carhtmlList,
    1,
    (url, callback) => {
      console.log('异步回调的url:' + url)
      reptileVehicleModel(url, callback)
    },
    (err, result) => {
      console.log('----------------------------')
      console.log('车辆品牌抓取完毕！共有数据：' + countBrand)
      console.log('----------------------------')

      // 生成本地 json 文件
      const data = JSON.stringify(fetchBrandData)
      fs.writeFileSync('data.json', data)
    }
  )
}

fetchBrand()
