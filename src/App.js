import logo from './logo.svg';
//import './App.css';
import axios from 'axios';
import React, { useState, useEffect } from 'react';
import "./loading.scss"

function getLastWeek() {
  var today = new Date();
  var lastWeek = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
  return lastWeek;
}

function getToday() {
  var today = new Date();
  var lastWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  return lastWeek;
}

function getStandardDeviation (array) {
  if(array === null){return 0}
  let volumes = array.map(ohlcv =>{
    return ohlcv[5]
  })
  //console.log(volumes)
  const n = volumes.length
  const mean = volumes.reduce((a, b) => a + b) / n
  return [Math.sqrt(volumes.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n), mean]
}

async function getTokens(){
  const response = await fetch("https://data.messari.io/api/v2/assets?limit=500&with-profiles")
  const tokenData = await response.json();
  return tokenData.data
}
async function getWeekVol(ticker){
  var lastWeek = getLastWeek();
  var lastWeekMonth = lastWeek.getMonth() + 1;
  var lastWeekDay = lastWeek.getDate();
  var lastWeekYear = lastWeek.getFullYear();
  var lastWeekDisplay = lastWeekYear + "-" + lastWeekMonth + "-" + lastWeekDay
  const response = await fetch("https://data.messari.io/api/v1/assets/" + ticker + "/metrics/price/time-series?start=" + lastWeekDisplay  + "&interval=1d")
  const weekVol = await response.json();
  return weekVol
}

async function getDayVol(ticker){
  var today = getToday()
  var todayMonth = today.getMonth() + 1
  var todayDay = today.getDate()
  var todayYear = today.getFullYear()
  var today = todayYear + "-" + todayMonth + "-" + todayDay
  const response = await fetch("https://data.messari.io/api/v1/assets/" + ticker + "/metrics/price/time-series?start=" + today  + "&interval=1d")
  const dayVol = await response.json();
  return dayVol
}

async function getInfo(coin){
  const response = await fetch("https://data.messari.io/api/v2/assets/" + coin.toLowerCase() + "/profile")
  const info = await response.json()
  console.log(info.data.profile.general.overview.official_links)
  return info

}



function App() {
  const [rawTickers, setRawTickers] = useState([]);
  const [tickers, setTickers] = useState([]);
  const [weekAvg, setWeekAvg] = useState([]);
  const[anomalies, setAnomalies] = useState([])
  const[loading, setLoading] = useState(true)
  const[display, setDisplay] = useState([])
  const[buttons, set] = useState([])

  useEffect(() => {
    var lastWeek = getLastWeek();
    var lastWeekMonth = lastWeek.getMonth() + 1;
    var lastWeekDay = lastWeek.getDate();
    var lastWeekYear = lastWeek.getFullYear();
    var lastWeekDisplay = lastWeekYear + "-" + lastWeekMonth + "-" + lastWeekDay

    var today = getToday()
    var todayMonth = today.getMonth() + 1
    var todayDay = today.getDate()
    var todayYear = today.getFullYear()
    var today = todayYear + "-" + todayMonth + "-" + todayDay


    const fetchAllTheThings = async () => {
      const tickers = await getTokens();
      console.log(tickers)
      const allSymbolPromises = tickers.map(ticker => {
        const result1Promise = getWeekVol(ticker.symbol);
        const result2Promise = getDayVol(ticker.symbol);
        return Promise.all([result1Promise, result2Promise]);
      })
      
      const allSymbolValues = await Promise.all(allSymbolPromises);
      console.log(allSymbolValues)
      let set_anomalies = []
      allSymbolValues.map(volumes => {
        if(volumes[0].status.error_code !== 404){
          let stats = getStandardDeviation(volumes[0].data.values)
          //console.log(stats)
          let dataStd = stats[0]
          let dataMean = stats[1]
          let anomaly_cutoff = dataStd * 3
          let upper_limit = dataMean + anomaly_cutoff
    
          if(volumes[1].status.error_code !== 404 && volumes[1].data.values !== null ){
            console.log(volumes[1])
            let dayVol = volumes[1].data.values[0][5]
            //console.log(dayVol)
            //console.log(upper_limit)
            if (dayVol > upper_limit){
              //console.log(volumes[1].data.name)
              set_anomalies.push([volumes[1].data.name, volumes[1].data.symbol, dayVol, dataMean, volumes[1].data.values[0][3]])
            }
          }
        }
      })

      const anomalyPromises = set_anomalies.map(coin => {
        const result1Promise = getInfo(coin[1]);
        return Promise.all([result1Promise, coin[2], coin[3], coin[4]]);
      })
      
      const anomalyValues = await Promise.all(anomalyPromises);



      //console.log(anomalyValues)
      let set_display = []
      anomalyValues.map(coinInfo => {
        console.log(coinInfo)
        set_display.push(
          <div class="frame">
          <div class="center">
            
            <div class="profile">		
              <div class="name">{coinInfo[0].data.name}</div>
              <div class="job">({coinInfo[0].data.symbol})</div>
              
              <div class="actions">
                <button class="btn"><a href={coinInfo[0].data.profile.general.overview.official_links[0].link}>{coinInfo[0].data.profile.general.overview.official_links[0].name}</a></button>
                <button class="btn"><a href={coinInfo[0].data.profile.general.overview.official_links[0].link}>{coinInfo[0].data.profile.general.overview.official_links[1].name}</a></button>
                
              </div>
            </div>
            
            <div class="stats">
              <div class="box">
                <span class="value">${coinInfo[3].toLocaleString('en',{ maximumSignificantDigits: 2 })}</span>
                <span class="parameter">Price (USD)</span>
              </div>
              <div class="box">
                <span class="value">${coinInfo[2].toLocaleString('en',{ maximumSignificantDigits: 2 })}</span>
                <span class="parameter">Avg Volume</span>
              </div>
              <div class="box">
                <span class="value">${coinInfo[1].toLocaleString('en',{ maximumSignificantDigits: 2 })}</span>
                <span class="parameter">24hr Volume</span>
              </div>
            </div>
          </div>
        </div>
          

      )
      })
      setAnomalies(set_anomalies)
      setLoading(false)
      setDisplay(set_display)
    }

    fetchAllTheThings()

    
  }, []);

  console.log(tickers)
  console.log(weekAvg)



  
  

  while(loading){
    return (
      <div>
        <div className="header">
          <h1><code>Volume Anomaly Detector</code></h1>
        </div>
      
      <div class="spinner">
        
      </div>
      </div>
    );
  }
  return (
    <div className="App">
      {display}
    </div>
  );
}

export default App;
