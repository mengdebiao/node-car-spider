/*
 * @Description: 项目主程序
 * @Author: sufen
 * @Date: 2020-12-24 14:35:29
 * @LastEditTime: 2020-12-25 17:12:32
 * @LastEditors: sufen
 */
const request = require('request')
const iconv = require('iconv-lite')
const async = require('async')
const fs = require('fs')

let fetchBrandData = [] // 存放爬取数据

/**
 *  延时函数
 *
 * @param {*} time 毫秒
 */
function sleep(time) {
  let now = new Date()
  const exitTime = now.getTime() + time
  while (true) {
    now = new Date()
    if (now.getTime() > exitTime) return
  }
}

/**
 * 重新定义车辆品牌排序，先按字母排序，再按 id 从小到大排序
 *
 * @param {*} list
 */
function brandSort(list) {
  let newList = []
  const obj = list.reduce((last, item) => {
    item.firstletter = item.bfirstletter
    delete item.bfirstletter
    if (last[item.firstletter]) {
      last[item.firstletter].push(item)
    } else {
      last[item.firstletter] = [item]
    }
    last[item.firstletter].sort((a, b) => a.id - b.id)
    return last
  }, {})
  for (const key in obj) {
    newList = [...newList, ...obj[key]]
  }
  return newList
}

/**
 * 爬取车辆品牌
 */
function fetchBrand() {
  const reptileBrand = () => {
    const startTime = Date.now() // 记录该次爬取的开始时间
    const formatUrl = 'https://www.autohome.com.cn/ashx/AjaxIndexCarFind.ashx?type=1'
    request.get(formatUrl, { encoding: null, gzip: true }, (err, res, body) => {
      if (err || res.statusCode !== 200) {
        const time = Date.now() - startTime
        console.error(err)
        console.log('抓取该页面失败，重新抓取该页面……, 耗时 ' + time + 'ms')
        reptileBrand()
        return false
      }
      const {
        result: { branditems = [] }
      } = JSON.parse(iconv.decode(body, 'gb2312'))
      fetchBrandData = brandSort(branditems) // 重新排序

      const time = Date.now() - startTime
      console.log('----------------------------')
      console.log('车辆品牌抓取完毕！共有数据：' + branditems.length + ', 耗时 ' + time + 'ms')
      console.log('----------------------------')

      fetchFactory()
    })
  }
  reptileBrand()
}

/**
 * 爬取所有车辆厂家
 *
 */
function fetchFactory() {
  let countSuccess = 0 // 成功数

  const reptileFactory = (branditems, callback) => {
    const startTime = Date.now() // 记录该次爬取的开始时间
    const formatUrl = `https://www.autohome.com.cn/ashx/AjaxIndexCarFind.ashx?type=3&value=${branditems.id}`
    request.get(formatUrl, { encoding: null, gzip: true }, (err, res, body) => {
      if (err || res.statusCode !== 200) {
        const time = Date.now() - startTime
        console.error(err)
        console.log('抓取接口失败，重新抓取该接口……, 耗时 ' + time + 'ms')
        reptileFactory(branditems, callback)
        return false
      }
      const {
        result: { factoryitems = [] }
      } = JSON.parse(iconv.decode(body, 'gb2312'))
      branditems.factoryitems = factoryitems

      countSuccess += factoryitems.length
      const time = Date.now() - startTime
      console.log(countSuccess + ', ' + branditems.country + ' ' + branditems.name + ', 耗时 ' + time + 'ms')
      sleep(50)
      callback(null, branditems + 'Call back content')
    })
  }

  // 使用async控制异步抓取
  // mapLimit(arr, limit, iterator, [callback])
  async.mapLimit(
    fetchBrandData,
    10,
    (branditems, callback) => {
      reptileFactory(branditems, callback)
    },
    (err, result) => {
      console.log('----------------------------')
      console.log('所有车辆厂家抓取完毕！共有数据：' + countSuccess)
      console.log('----------------------------')

      fetchYearModel()
    }
  )
}

/**
 * 爬取所有年份车型
 */
function fetchYearModel() {
  const seriesArr = [] // 存放需要查询的车系
  let countSeries = 0 // 车系数量
  let countSuccess = 0 // 成功数

  fetchBrandData.forEach(({ factoryitems }) => {
    factoryitems.forEach(({ seriesitems }) => {
      seriesitems.forEach((item) => {
        countSeries++
        seriesArr.push(item)
      })
    })
  })

  const reptileModel = (seriesitems, callback) => {
    const startTime = Date.now() // 记录该次爬取的开始时间
    const formatUrl = `https://www.autohome.com.cn/ashx/AjaxIndexCarFind.ashx?type=5&value=${seriesitems.id}`
    request.get(formatUrl, { encoding: null, gzip: true }, (err, res, body) => {
      if (err || res.statusCode !== 200) {
        const time = Date.now() - startTime
        console.error(err)
        console.log('抓取接口失败，重新抓取该接口……, 耗时 ' + time + 'ms')
        reptileModel(seriesitems, callback)
        return false
      }
      const {
        result: { yearitems = [] }
      } = JSON.parse(iconv.decode(body, 'gb2312'))
      seriesitems.yearitems = yearitems

      countSuccess++
      const time = Date.now() - startTime
      console.log(`${countSuccess}, ${seriesitems.name}, 耗时 ${time}ms`)
      sleep(50)
      callback(null, seriesitems + 'Call back content')
    })
  }

  // 使用async控制异步抓取
  // mapLimit(arr, limit, iterator, [callback])
  async.mapLimit(
    seriesArr,
    10,
    (seriesitems, callback) => {
      reptileModel(seriesitems, callback)
    },
    (err, result) => {
      console.log('----------------------------')
      console.log('所有车型抓取完毕！共有数据：' + countSuccess)
      console.log('----------------------------')

      // 生成本地 json 文件
      const data = JSON.stringify(fetchBrandData)
      fs.writeFileSync('data.json', data)
    }
  )
}

fetchBrand()
