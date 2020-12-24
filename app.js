/*
 * @Description: 项目主程序
 * @Author: sufen
 * @Date: 2020-12-24 14:35:29
 * @LastEditTime: 2020-12-25 01:20:30
 * @LastEditors: sufen
 */
const request = require('request')
const axios = require('axios')
const iconv = require('iconv-lite')
const cheerio = require('cheerio')
const async = require('async')
const fs = require('fs')

const fetchBrandData = [] // 存放爬取数据

/**
 *  延时函数
 *
 * @param {*} time 毫秒
 */
function delayFn(time) {
  let now = new Date()
  const exitTime = now.getTime() + time
  while (true) {
    now = new Date()
    if (now.getTime() > exitTime) return
  }
}

/**
 * 爬取品牌 & 车系
 */
function fetchBrand() {
  const carhtmlList = [] // 存放需要爬取的车辆品牌地址
  let countBrand = 0 // 车辆品牌数
  let countSuccess = 0 // 成功数
  const letter = ['A', 'B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'W', 'X', 'Y', 'Z']

  letter.forEach((item) => {
    carhtmlList.push('https://www.autohome.com.cn/grade/carhtml/' + item + '.html')
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
          id: parseInt(curBrands.eq(i).attr('id'), 10),
          name: curBrands.eq(i).find('dt div a').text(),
          logo: `https:${curBrands.eq(i).find('dt a img').attr('src')}`,
          firstLetter: url.split('.html')[0].split('/').pop(), // 车辆品牌首字母
          group: []
        }

        // 车辆品牌分类，如华晨宝马、进口宝马
        const curBrandGroup = curBrands.eq(i).find('dd div.h3-tit')
        const curBrandSeries = curBrands.eq(i).find('dd ul.rank-list-ul')
        for (let j = 0; j < curBrandGroup.length; j++) {
          // 通过分类链接截取后得到分类 id
          const groupUrl = curBrandGroup.eq(j).find('a').attr('href')
          const groupId = parseInt(groupUrl.split('.html')[0].split('-').pop())
          // 分类对象
          const groupObj = {
            id: groupId,
            name: curBrandGroup.eq(j).text(),
            series: []
          }

          // 品牌分类下的车系，如 3 系、5 系、7 系
          const series = curBrandSeries.eq(j).find('li').not('.dashline')
          for (let k = 0; k < series.length; k++) {
            // 通过车系链接截取后得到车系 id
            const seriesUrl = series.eq(k).find('h4 a').attr('href')
            const seriesId = parseInt(seriesUrl.split('/#levelsource')[0].split('/').pop())
            // 车系对象
            const seriesObj = {
              id: seriesId,
              name: series.eq(k).find('h4 a').text(),
              website: `https:${seriesUrl}`,
              models: []
            }
            groupObj.series.push(seriesObj)
          }

          brandObj.group.push(groupObj)
        }

        fetchBrandData.push(brandObj)
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
      // const data = JSON.stringify(fetchBrandData)
      // fs.writeFileSync('data.json', data)

      fetchSeries()
    }
  )
}

function fetchSeries() {
  const seriesArr = [] // 存放需要查询的车系
  let countSeries = 0 // 车系数量
  let countSuccess = 0 // 成功数

  fetchBrandData.forEach(({ group }) => {
    group.forEach(({ series }) => {
      series.forEach((item) => {
        countSeries++
        seriesArr.push(item)
      })
    })
  })

  const reptileBrandModel = (series, callback) => {
    const startTime = Date.now() // 记录该次爬取的开始时间
    const formatUrl = `https://www.autohome.com.cn/ashx/AjaxIndexCarFind.ashx?type=5&value=${series.id}`

    axios
      .get(formatUrl, { headers: { 'content-type': 'text/plain;charset=gb2312' } })
      .then(function (res) {
        series.models = res.data.result.yearitems
        delete series.website

        countSuccess++
        const time = Date.now() - startTime
        console.log(countSuccess + ', ' + series.name + ', 耗时 ' + time + 'ms')
        delayFn(50)
        callback(null, series + 'Call back content')
      })
      .catch(function (error) {
        console.error(error)
        console.log('抓取接口失败，重新抓取该接口……')
        reptileBrandModel(series, callback)
        return false
      })

    // request.get(formatUrl, {}, (err, res, body) => {
    //   if (err || res.statusCode !== 200) {
    //     console.error(err)
    //     console.log('抓取接口失败，重新抓取该接口……')
    //     reptileBrandModel(series, callback)
    //     return false
    //   }
    //   const html = iconv.decode(body, 'gb2312')
    //   console.log(html)

    //   countSuccess++
    //   const time = Date.now() - startTime
    //   console.log(countSuccess + ', ' + series.name + ', 耗时 ' + time + 'ms')
    //   delayFn(1000)
    //   callback(null, series + 'Call back content')
    // })
  }

  // 使用async控制异步抓取
  // mapLimit(arr, limit, iterator, [callback])
  async.mapLimit(
    seriesArr,
    10,
    (series, callback) => {
      reptileBrandModel(series, callback)
    },
    (err, result) => {
      console.log('----------------------------')
      console.log('品牌车系抓取完毕！共有数据：' + countSeries)
      console.log('----------------------------')

      // 生成本地 json 文件
      const data = JSON.stringify(fetchBrandData)
      fs.writeFileSync('data.json', data)
    }
  )
}

fetchBrand()
