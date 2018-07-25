var template = document.currentScript.parentNode.querySelector('template');
class FreelogMusicplayerWwzh extends HTMLElement {
  constructor() {
    super()
    let self = this;
    let shadowRoot = self.attachShadow({mode: 'closed'});
    const instance = template.content.cloneNode(true);
    self.root = shadowRoot
    shadowRoot.appendChild(instance)
  }

  connectedCallback (){
    clearInterval(this.timer)
    clearTimeout(this.tiemoutTimer)
    this.init()
  }

  disconnectedCallback (){

  }

  init (){
    this.isPlayingSong = false
    this.mpInfo = {
      title: 'Happy Now', singer: 'Zedd (捷德)/Elley Duhè', lang: '英语', company: '环球唱片', type: 'Single',
      publishDate: '2018-07-18', genre: 'Dance 舞曲'
    }
    this.songList = []
    // this.songList = [ 
    //   { name: '忘了时间', singer: '刘晓松', src: './111.mp3', duration: '03:30', album: '一个人' },
    //   { name: '忘了爱', singer: '雷晓松', src: './111.mp3', duration: '03:20', album: '一个人' },
    //   { name: '忘了我', singer: '肖晓松', src: './111.mp3', duration: '03:40', album: '一个人' },
    //   { name: '忘了忘了', singer: '余晓松', src: './111.mp3', duration: '03:33', album: '一个人' },
    // ]
    this.songPresentableList = []
    this.actIndex = 0
    this.songPlayedTime = 0
    
    this.getDom()
    this.bindEvent()
    
    this.showLoading()
    this.renderTableBody()
    this.renderMusicPlayerInfo()
    this.gotSongCurrentTime()
  }

  fethchResourcesList (type, targs){
    return window.QI.fetch(`/v1/presentables?nodeId=${window.__auth_info__.__auth_node_id__}&resourceType=${type}&tags=${targs}&isOnline=1`)
      .then(resp => resp.json())
  }

  fetchNodeResourceDetail (presentableId, resourceId){
    return window.QI.fetch(`/v1/auths/presentable/${presentableId}?nodeId=${window.__auth_info__.__auth_node_id__}&resourceId=${resourceId}`)
            .then(resp => resp.json())
  }

  renderMusicPlayerInfo (){
    this.showLoading()
    this.fethchResourcesList('json', 'intro')
      .then(res => {
        this.hideLoading()
        if(res.errcode == 0 && res.data.length){
          var {
            title, singer, lang, company, type,
            publishDate, genre
          } = res.data[0].resourceInfo.meta

          var str = `
            <h1 class="music-name" title="${title}">${title}</h1>
            <div class="music-singer">
                <i class="icon_singer sprite"></i>
                <span>${singer}</span>
            </div>
            <ul class="music-info clearfix">
              <li class="music-info-item">流派：${genre}</li>
              <li class="music-info-item music-info-item-even">语种：${lang}</li>
              <li class="music-info-item">发行时间：${publishDate}</li>
              <li class="music-info-item music-info-item-even">发行公司：${company}</li>
              <li class="music-info-item">类型：${type }</li>
            </ul>
          `
          this.root.querySelector('.mp-info-cont').innerHTML = str
        }
      })
      .catch(e =>{
        this.hideLoading()
      })
  }

  renderTableBody (){
    this.fethchResourcesList('audio', 'mp3')
      .then(res => {
        if(res.errcode == 0 && res.data.length){
          this.songPresentableList = res.data
          this.songList = res.data.map(item => {
            return item.resourceInfo.meta
          })
          var str = this.songList.map((song, i) => {
          const { name, singer, src, duration, album } = song
          return `<tr data-index="${i}">
                    <td scope="row">${i+1}</td>
                    <td>${name}</td>
                    <td>${duration}</td>
                    <td>${singer}</td>
                    <td>${album}</td>
                  </tr>`
          }).join('')
          this.root.querySelector('.mp-list tbody').innerHTML = str
          this.root.querySelector('#playlist-count').innerHTML = this.songList.length
          setTimeout(() => {
            this.$trs = this.root.querySelectorAll('tbody tr')
            
            Array.from(this.$trs).forEach($dom => $dom.addEventListener('click', (e) => {
              this.showLoading()
              var index = e.currentTarget.getAttribute('data-index')
              this.actIndex = +index            
              this.initSong().then(() => {
                this.isShowedPlayer = true
                this.playMusic()
                this.hideLoading()
              }).catch(e => this.hideLoading())
            }))
          }, 0);
          
        }
        
      })
  }

  renderSongTime (songPlayedTime = 0, songDuration){
    
    songPlayedTime = Math.floor(songPlayedTime)
    if(!songDuration) return 
    
    songDuration = Math.floor(songDuration)
    var playTime = this.getTimeStr(songPlayedTime)
    var totalTime = this.getTimeStr(songDuration)

    this.$songTimeBox.innerHTML = `
    <div class="mpb-play-time">${playTime}</div>
    /
    <div class="mpb-total-time">${totalTime}</div>
  `
  }

  getTimeStr (time){
    var hourTime = Math.floor(time/3600) % 60 
    hourTime = hourTime > 9 ? hourTime : (hourTime > 0 ? '0' + hourTime : 0)

    var minuteTime = Math.floor(time/60) % 60 
    minuteTime = minuteTime > 9 ? minuteTime : '0' + minuteTime

    var secondTime = time%60 
    secondTime = secondTime > 9 ? secondTime : '0' + secondTime
    
    var timeStr = hourTime == 0 ? `<span>${minuteTime}</span>:<span>${secondTime}</span>` : `<span>${hourTime}</span>:<span>${minuteTime}</span>:<span>${secondTime}</span>`
    return timeStr
  }

  getDom (){
    this.$audio = this.root.querySelector('audio')
    this.$prevSongBtn = this.root.querySelector('.mpb-btn-prev')
    this.$playSongBtn = this.root.querySelector('.mpb-btn-play')
    this.$nextSongBtn = this.root.querySelector('.mpb-btn-next')
    this.$progressBox = this.root.querySelector('.progress')
    this.$progressBar = this.root.querySelector('.progress-bar')
    this.$songTimeBox = this.root.querySelector('.mpb-remaintime')
    this.$musicPlayeBox = this.root.querySelector('.music-player-bar')
    this.$beginPlayBtn = this.root.querySelector('.music-action .btn-success')
    this.$playMusicTitle = this.root.querySelector('.mpb-title')

    this.$errorToast = this.root.querySelector('#error-toast'),
    this.$errorInfo = this.$errorToast.querySelector('#et-info'),
    this.$errorBtn = this.$errorToast.querySelector('#et-btn'),
    this.$errorDuration = this.$errorToast.querySelector('#et-duration')
    this.$errorCloseBtn = this.$errorToast.querySelector('.et-close-btn')

  }

  bindEvent (){
    
    this.$prevSongBtn.addEventListener('click', () => {
      
      var targIndex = this.actIndex - 1
      targIndex = targIndex < 0 ? 0 : targIndex
      if(targIndex == 0){
        this.toggleClass(this.$prevSongBtn, 'disabled', 'add') 
      }else{
        this.toggleClass(this.$nextSongBtn, 'disabled', 'delete')
      }
      
      if(targIndex != this.actIndex){
        this.actIndex = targIndex
        this.initSong()
        this.$progressBar.style.width = 0
      }
    })
    
    this.$nextSongBtn.addEventListener('click', this.playNextSong.bind(this))
    
    this.$playSongBtn.addEventListener('click', () => {
      if(!this.isPlayingSong){
        this.playMusic()
      }else{
        this.pauseMusic()
      }
    })

    this.$progressBox.addEventListener('click', (e) => {
      var { x, width } = e.currentTarget.getBoundingClientRect()
      
      var ratio = (e.x - x) / width
      var playTime = Math.floor(ratio * this.$audio.duration)
      
      this.$audio.currentTime = playTime
      this.renderSongTime (playTime, this.$audio.duration)
      
      this.$progressBar.style.width = +ratio.toFixed(2) * 100  + '%'
      
      this.isPlayingSong && this.gotSongCurrentTime()
      console.log(this.$audio.currentTime, playTime)
      
    })

    this.$beginPlayBtn.addEventListener('click', (e) => {
      if(!this.isShowedPlayer){
        !this.isInitingSong && this.initSong()
                                .then(() => {
                                  this.isShowedPlayer = true
                                  this.playMusic()
                                })
                                .catch(e=>console.log(e))
      }else{
        if(!this.isPlayingSong){
          this.playMusic()
        }
      }
      
    })


    this.$errorBtn.addEventListener('click', (e) => {
      this.shutdownCountdown = true
      this.toggleClass(this.$errorToast, 'showed', 'delete')
      clearTimeout(this.tiemoutTimer)
      this.timer = null
      this.presentableErrorResp && this.triggerAppEvent(this.presentableErrorResp)
    })

    this.$errorCloseBtn.addEventListener('click', this.closeErrorToast.bind(this))
  }

  initSong (){
    this.isInitingSong = true
    const { name, singer } = this.songList[this.actIndex]
    
    const { presentableId, nodeId, resourceId }  = this.songPresentableList[this.actIndex]

    this.$playMusicTitle.innerHTML = `
      <span class="mpb-music-name">${name}</span>
      -
      <span class="mpb-singer-name">${singer}</span>
    `

    return this.fetchNodeResourceDetail(presentableId, resourceId)
      .then(res => {
        this.isInitingSong = false
        this.presentableErrorResp = res
        this.handlerPresentableErrorCode( res, name )
        return Promise.reject('handlerPresentableErrorCode')
      })
      .catch(e => {
        if(e == 'handlerPresentableErrorCode') return Promise.reject()

        this.$audio.src = `api/v1/auths/presentable/${presentableId}.data?nodeId=${nodeId}&resourceId=${resourceId}`
        //this.$audio.currentTime = 0


        if(this.isPlayingSong){
          this.$audio.play()
            .then(() => {
              this.renderSongTime(0, this.$audio.duration)
            })
        }else{
          this.renderSongTime(0, this.$audio.duration)
        }
        this.showPlayerBox()
        return Promise.resolve()
      })

  }

  playMusic (){
    this.toggleClass(this.$playSongBtn, 'paused', 'add') 
    this.isPlayingSong = true
    this.$audio.play()
      .then(() => {
        this.gotSongCurrentTime()
      })
  }

  pauseMusic (){
    this.toggleClass(this.$playSongBtn, 'paused', 'delte') 
        this.isPlayingSong = false
        this.$audio.pause()
        clearInterval(this.timer)
  }

  playNextSong (){
    var targIndex = this.actIndex + 1
    targIndex = targIndex == this.songList.length ? targIndex - 1 : targIndex
    if(targIndex == (this.songList.length - 1)){
      this.toggleClass(this.$nextSongBtn, 'disabled', 'add') 
    }else{
      this.toggleClass(this.$prevSongBtn, 'disabled', 'delete') 
    }
    if(targIndex != this.actIndex){
      this.actIndex = targIndex
      this.initSong()
      this.$progressBar.style.width = 0
    }
  }

  gotSongCurrentTime (){
    clearInterval(this.timer)
    var { x, width } = this.$progressBox.getBoundingClientRect()
    this.audioX = x
    this.audioW = width

    this.timer = setInterval(() => {
      let { currentTime, duration } = this.$audio
      console.log('currentTime', currentTime)
      
      this.renderSongTime(currentTime, duration)
      
      this.$progressBar.style.width = +(currentTime / duration * 100 ).toFixed(2) + '%'
      if(currentTime == duration ){
        this.playNextSong()
        clearInterval(this.timer)
      }
    }, 1000)
  }

  handlerPresentableErrorCode (resp, songName){
    this.presentableErrorResp = resp
    switch(resp.errcode){
      case 503: {
        this.showErrorToast(
          '亲，你未创建合同，歌曲<'+ songName +'>播放不了！', // 未找到有效的presentable合约(用户尚未与请求的presentable签约或者合约已废弃)
          '去创建',
          5,
          () => {
            this.triggerAppEvent(resp)
          }
        )
        break
      }
      case 501: {
        this.showErrorToast(
          '亲，你的歌曲合同未执行！', // 未找到有效的presentable合约(用户尚未与请求的presentable签约或者合约已废弃)
          '去执行',
          5,
          () => {
            this.triggerAppEvent(resp)
          }
        )
        breal
      }
    }
  }

  triggerAppEvent (resp){
    var self = this
    var freelogApp = window.FreeLogApp
    var exception = freelogApp.ExceptionCode[resp.errcode]
    var eventName = exception.action || freelogApp.EventCode.invalidResponse

    freelogApp.trigger(eventName, {
      data: resp,
      callback: function (presentable){
        const { _contractStatus } = presentable
        switch(_contractStatus){
          // 用户未创建合同
          case -1: {
            
            break
          }
          // 合同未执行
          case 1: {
            
            break
          }
          // 合同正在执行
          case 2: {
            
            break
          }
          // 合同生效中
          case 3: {
            self.initSong()
            break
          }
        }
        
      }
    })
  }

  showErrorToast ( info, btnText, second, callback){

    if(info && btnText){
      this.$errorInfo.innerHTML = info
      this.$errorBtn.innerHTML = btnText
      this.toggleClass(this.$errorToast, 'showed', 'add')

      if(second){
        this.shutdownCountdown = false
        this.closeToastSoon(second, callback)  
      }
    }

  }

  closeErrorToast (){
    this.toggleClass(this.$errorToast, 'showed', 'delete')
    clearTimeout(this.tiemoutTimer)
    this.tiemoutTimer = null
  }

  closeToastSoon (second, callback){
    if(this.shutdownCountdown) return 
    this.$errorDuration.innerHTML = `该提示在${second}秒后自动关闭...`
    if(second == 0) {
      this.toggleClass(this.$errorToast, 'showed', 'delete')
      callback()
      clearTimeout(this.tiemoutTimer)
      this.tiemoutTimer = null
      return 
    }
    second -= 1
    this.tiemoutTimer = setTimeout(() => {
      this.closeToastSoon.call(this, second, callback)
    }, 1000);
  }

  showPlayerBox (){
    var songCount = this.songList.length
    
    if(this.actIndex == 0){
      this.toggleClass(this.$prevSongBtn, 'disabled', 'add')
    }
    if(this.actIndex == this.songList.length - 1){
      this.toggleClass(this.$nextSongBtn, 'disabled', 'add') 
    }
    this.toggleClass(this.$musicPlayeBox, 'showed', 'add')
  }

  hidePlayerBox (){
    this.toggleClass(this.$musicPlayeBox, 'showed', 'delete')
  }
  
  showLoading (){
    const $loading = this.root.querySelector('.mp-loading-box')
    this.toggleClass($loading, 'showed', 'add')
  }

  hideLoading(){
    const $loading = this.root.querySelector('.mp-loading-box')
    this.toggleClass($loading, 'showed', 'delete')
  }

  toggleClass ($dom, name, type){
    let className = $dom.className.replace(/\s+/, ' ').split(' ')
    let set = new Set(className)
    type == 'add' ? set.add(name) : set.delete(name)
    $dom.className = [...set].join(' ')
  }
}


customElements.define('freelog-musicplayer-wwzh', FreelogMusicplayerWwzh);