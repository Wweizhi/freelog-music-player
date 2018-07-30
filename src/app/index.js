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
    this.mpInfo = { }
    this.songList = []
    this.songPresentableList = []
    this.songPresentableAuthInfos = []
    this.actIndex = -1
    this.songPlayedTime = 0
    this.playTpye = 'loop'
    
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
    return window.QI.fetch(`/v1/auths/presentable/${presentableId}.info?nodeId=${window.__auth_info__.__auth_node_id__}&resourceId=${resourceId}`)
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
          this.renderSongAuthInfo()
          this.songList = res.data.map(item => {
            return item.resourceInfo.meta
          })
          var str = this.songList.map((song, i) => {
          const { name, singer, src, duration, album } = song
          return `<tr data-index="${i}">
                    <td scope="row">${i+1}<div class="lock-tag" data-index="lock-${i}"></div></td>
                    <td class="td-name">${name}</td>
                    <td><div class="play-btn" data-index="${i}"></div></td>
                    <td>${duration}</td>
                    <td>${singer}</td>
                    <td>${album}</td>
                  </tr>`
          }).join('')
          this.root.querySelector('.mp-list tbody').innerHTML = str
          this.root.querySelector('#playlist-count').innerHTML = this.songList.length

          setTimeout(() => {
            this.$trPlayBtns = this.root.querySelectorAll('tbody tr .play-btn')
            this.$trLockTags = this.root.querySelectorAll('tbody tr .lock-tag')

            Array.from(this.$trPlayBtns).forEach($dom => $dom.addEventListener('click', (e) => {
              var index = e.currentTarget.getAttribute('data-index')
              if(this.isInitingSong && index == this.actIndex){
                return 
              }
              this.showLoading()
              var targIndex = +index            
              // this.initSong().then(() => {
              //   this.isShowedPlayer = true
              //   this.playMusic()
              //   this.hideLoading()
              // }).catch(e => this.hideLoading())
              this.isPlayingSong = true
              this.playOneSong(targIndex)
            }))

            Array.from(this.$trLockTags).forEach($dom => $dom.addEventListener('click', e => {
              var index = e.currentTarget.getAttribute('data-index')
              index = +index.replace('lock-', '')
              var authInfo = this.songPresentableAuthInfos[index]
              this.triggerAppEvent(authInfo)
            }))
          }, 0)
          
        }
        
      })
  }

  renderSongAuthInfo (){
    this.songPresentableList.forEach((item, index) => {
      const { presentableId, resourceId } = item
      this.fetchNodeResourceDetail(presentableId, resourceId)
        .then(authInfo => {
          this.songPresentableAuthInfos[index] = authInfo
          if(authInfo.errcode != 0){
            this.toggleClass(this.root.querySelector(`[data-index="lock-${index}"]`), 'showed', 'add')
          }
        })
    })
  }

  renderSongTime (songPlayedTime = 0, songDuration){
    
    songPlayedTime = Math.floor(songPlayedTime)
    if(typeof songDuration == 'undefined') return 
    
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
    
    if(time == 0 || !/\d+/.test(time) ) return '<span>00</span>:<span>00</span>'
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

    this.$playTypeBtns = this.root.querySelectorAll('.mpb-play-type')
    this.$themeBtns = this.root.querySelectorAll('.exchange-theme div')
    this.$bgMask = this.root.querySelector('.mp-bg-mask')
  }

  bindEvent (){
    
    this.$prevSongBtn.addEventListener('click', () => {
      
      var targIndex = this.actIndex - 1
      targIndex = targIndex < 0 ? 0 : targIndex
      this.playOneSong (targIndex)
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
      
    })

    this.$beginPlayBtn.addEventListener('click', (e) => {
      if(!this.isShowedPlayer){
        !this.isInitingSong && this.songEndCallback()
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

    Array.from(this.$playTypeBtns).forEach(($btn, index) => {
      $btn.addEventListener('click', (e) => {
        var $dom = e.currentTarget
        var index = +$dom.getAttribute('data-index')
        index = index == 4 ? 1 : index+1
        this.showPlayTypeBtn(index)
      })
    })

    Array.from(this.$themeBtns).forEach($dom => $dom.addEventListener('click', e => {
      this.$bgMask.className = 'mp-bg-mask ' + e.currentTarget.className 
    }))

    this.$errorCloseBtn.addEventListener('click', this.closeErrorToast.bind(this))
  }

  initSong (){
    console.log('No.', this.actIndex + 1)
    this.isShowedPlayer = true
    this.isInitingSong = true
    
    const { name, singer } = this.songList[this.actIndex]
    

    this.$playMusicTitle.innerHTML = `
      <span class="mpb-music-name">${name}</span>
      -
      <span class="mpb-singer-name">${singer}</span>
    `
    clearInterval(this.timer)
    this.$progressBar.style.width = 0

    var tempPromise = null
    const { presentableId, nodeId, resourceId }  = this.songPresentableList[this.actIndex]
    const authInfo = this.songPresentableAuthInfos[this.actIndex]
    if(authInfo.errcode == 0){
      return startSong.call(this)
    }else{
      return this.fetchNodeResourceDetail(presentableId, resourceId)
        .then(res => {
          if(res.errcode == 0){
            let actIndex = this.actIndex
            this.songPresentableAuthInfos[actIndex] = res
            this.toggleClass(this.root.querySelector(`[data-index="lock-${actIndex}"]`), 'showed', 'delete')
            return startSong.call(this)
          }else{
            this.isInitingSong = false
            this.presentableErrorResp = authInfo
            this.handlerPresentableErrorCode( authInfo, name )
            this.renderSongTime(0, 0)
            this.$audio.src = ''
            return Promise.reject()
          }
        })
    }

    function startSong (){
      const { presentableId, nodeId, resourceId }  = this.songPresentableList[this.actIndex]
      this.$audio.src = `api/v1/auths/presentable/${presentableId}.data?nodeId=${nodeId}&resourceId=${resourceId}`

      if(this.isPlayingSong){
        this.playMusic()
      }else{
        this.renderSongTime(0, this.$audio.duration)
      }
      this.showPlayerBox()
      this.isShowedPlayer = true
      return Promise.resolve()
    }
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
    this.playOneSong (targIndex)
  }

  playOneSong (targIndex){

    console.log('targIndex --', targIndex, this.songList.length - 1)
    if(targIndex == (this.songList.length - 1)){
      this.toggleClass(this.$nextSongBtn, 'disabled', 'add') 
      this.toggleClass(this.$prevSongBtn, 'disabled', 'delete')
      
    }if(targIndex == 0){
      this.toggleClass(this.$prevSongBtn, 'disabled', 'add') 
      this.toggleClass(this.$nextSongBtn, 'disabled', 'delete')
    }else{
      this.toggleClass(this.$nextSongBtn, 'disabled', 'delete')
      this.toggleClass(this.$prevSongBtn, 'disabled', 'delete') 
    }
    // if(targIndex != this.actIndex){
    //   this.actIndex = targIndex
    //   this.showLoading()
    //   this.initSong().then(() => this.hideLoading()).catch(e => this.hideLoading())
    //   this.$progressBar.style.width = 0
    // }
    this.actIndex = targIndex
      this.showLoading()
      this.initSong().then(() => {
        this.playMusic()
        this.hideLoading()
      }).catch(e => this.hideLoading())
      this.$progressBar.style.width = 0
  }

  gotSongCurrentTime (){
    clearInterval(this.timer)
    var { x, width } = this.$progressBox.getBoundingClientRect()
    this.audioX = x
    this.audioW = width

    this.timer = setInterval(() => {
      let { currentTime, duration } = this.$audio
      
      this.renderSongTime(currentTime, duration)
      
      this.$progressBar.style.width = +(currentTime / duration * 100 ).toFixed(2) + '%'
      if(currentTime == duration ){
        clearInterval(this.timer)
        this.songEndCallback()
      }
    }, 1000)
  }

  songEndCallback (){
    this.showLoading()
    this.isPlayingSong = true
    switch(this.playTpye){
      case 'loop': {
        var targIndex = this.actIndex + 1
        while(this.songPresentableAuthInfos[targIndex].errcode != 0){
          targIndex += 1
        }
        if(targIndex >= this.songList.length ){
          targIndex = 1
        }
        this.playOneSong(targIndex)
        break
      }
      case 'list': {
        var targIndex = this.actIndex + 1
        while(this.songPresentableAuthInfos[targIndex].errcode != 0){
          targIndex += 1
        }
        if(targIndex >= (this.songList.length - 1) ){
          this.isPlayingSong = false
          return 
        }
        this.playOneSong(targIndex)
        break
      }
      case 'random': {
        var targIndex = Math.floor(Math.random(1) * this.songList.length)
        while(this.songPresentableAuthInfos[targIndex].errcode != 0 || targIndex == this.actIndex){
          targIndex = Math.floor(Math.random(1) * this.songList.length) + 1
        }
        this.playOneSong(targIndex)
        break
      }
      case 'single': {
        this.$audio.currentTime = 0
        this.playMusic()
        break
      }
    }
    return 
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
          '亲，你的歌曲合同未执行！', // 用户合同未激活
          '去执行',
          5,
          () => {
            this.triggerAppEvent(resp)
          }
        )
        break
      }
      case 401: {
        this.showErrorToast(
          '亲，该歌曲的节点合同未激活', // 节点合同未激活
          '通知节点',
          5,
          () => {
            this.triggerAppEvent(resp)
          }
        )
        break
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

  showPlayTypeBtn (index){
    this.$playTypeBtns.forEach($btn => {
      var i = $btn.getAttribute('data-index')
      if(i == index){
        this.playTpye = $btn.getAttribute('data-type')
        this.toggleClass($btn, 'showed', 'add')
      }else{
        this.toggleClass($btn, 'showed', 'delete')
      }
    })
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