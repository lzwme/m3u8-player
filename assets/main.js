(function () {
  const urlParams = h5Utils.getUrlParams();
  const uri = urlParams.url ? decodeURIComponent(urlParams.url) : '';

  if (uri.startsWith('http:') && location.protocol === 'https:') {
    if (!uri.startsWith('http://localhost')) {
      h5Utils.alert('由于浏览器安全限制，您访问的 https 页面下无法播放 http 协议的资源，请手动修改访问 URL 改为 http:// 格式并重新访问');
    } else {
      document.querySelector('a.am-topbar-logo').setAttribute('href', (location.href.replace('https:', 'http:')));
    }
  }

  function saveToStorage(key, arr) {
    localStorage.setItem(key, JSON.stringify(arr));
  }
  function getFromStorage(key) {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  const MP = {
    defaultUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    inc: {
      dp: null,
      hls: null,
      flvPlayer: null,
      wtClient: null,
    },
    data: {
      playList: getFromStorage('playlist') || [],
    },
    el: {
      urlInput: document.querySelector('input#urlInput'),
      m3u8Content: document.querySelector('textarea#m3u8Content'),
      vedioSelect: document.querySelector('#vedioSelect'),
      playBtn: document.querySelector('#playBtn'),
      rotateBtn: document.querySelector('#rotateBtn'),
      downloadBtn: document.querySelector('#downloadBtn'),
      inputForm: document.querySelector('#inputForm'),
      dplayer: document.querySelector('#dplayer'),
      historyFavList: document.querySelector('#history-fav-list'),
      playList: document.querySelector('#playList'),
    },
    init() {
      MP.el.urlInput.setAttribute('placeholder', MP.defaultUrl);
      MP.renderList('history');
      MP.renderList('fav');
      MP.initEvent();

      if ((MP.data.playList.length && !uri) || MP.data.playList.find(d => d.url === uri)) {
        MP.renderPlayList();
      }

      if (uri) {
        MP.el.urlInput.value = uri;
        if (urlParams.autoplay !== '0') MP.play(uri);

        if (self !== window.top || urlParams.type === '1') {
          document.querySelector('body').classList.add('fullscreen');
          document.querySelector('#twikooComment').remove();
          document.querySelector('main').classList.remove('container');
          if (urlParams.showInput != '1') MP.el.inputForm.classList.add('hidden');
        }
      } else if (!MP.data.playList.length && urlParams.autoplay) {
        MP.play(MP.defaultUrl);
      }
    },

    initEvent() {
      MP.el.playBtn.addEventListener('click', ev => {
        let url = MP.el.urlInput.value.trim() || MP.defaultUrl;
        let m3u8Str = MP.el.m3u8Content.value.trim();
        let type = '';

        if (m3u8Str) {
          if (m3u8Str.includes('.ts')) {
            const m = /EXT-X-KEY: *METHOD=AES-\d+,URI=['"]*\//.exec(m3u8Str);
            if (m) {
              if (url.startsWith('http')) {
                m3u8Str = m3u8Str.replace(m[0], `EXT-X-KEY:METHOD=AES-128,URI="${new URL(url).origin}/`);
              } else {
                return h5Utils.alert('您输入的 M3U8 内容为加密资源，若播放失败，请同时输入来源页面 URL 地址尝试获取解密信息');
              }
            }

            type = 'customHls';
            url = URL.createObjectURL(new Blob([m3u8Str], { type: 'text/plain;charset=utf-8' }));
          } else if (m3u8Str.includes('.m3u8')) {
            // 支持内容为 m3u8 剧集列表
            const list = m3u8Str
              .split('\n')
              .filter(d => d.includes('.m3u8'))
              .map((d, i) => {
                const [url, name = `第${i + 1}集`] = d.split(/[$\s]+/);
                if (name.startsWith('http')) [url, name] = [name, url];
                return { url, name };
              });

            if (list.length) {
              this.data.playList = list;
              saveToStorage('playlist', list);
              this.renderPlayList();
              url = list[0].url;
            }
          }
        }
        MP.play(url, type);
      });

      let vedioRotate = 0;
      MP.el.rotateBtn.addEventListener('click', ev => {
        ev.preventDefault();
        vedioRotate += 90;
        if (vedioRotate === 360) vedioRotate = 0;

        MP.el.dplayer.style.transform = `rotate(${vedioRotate}deg)`;
      });

      MP.el.downloadBtn.addEventListener('click', () => {
        let url = MP.el.urlInput.value;

        if (!url) return h5Utils.alert('请输入 m3u8 的 url 地址');
        if (!url.includes('.m3u8')) return h5Utils.alert('仅支持 m3u8 格式的视频下载');

        if (url === 'test.m3u8') url = location.origin + location.pathname + url;
        window.open('https://lzw.me/x/m3u8-downloader?source=' + encodeURIComponent(url));
      });

      MP.el.vedioSelect.addEventListener('change', ev => {
        console.log(ev.target.files);
        const file = ev.target.files[0];
        if (!file) return;
        const url = window.URL.createObjectURL(ev.target.files[0]);

        MP.play(url, file.name.includes('.m3u8') ? 'customHls' : '');
        // player.onload = () => window.URL.revokeObjectURL(url);
      });

      const dropzone = document.querySelector('main.container');
      dropzone.addEventListener(
        'dragover',
        function (event) {
          event.preventDefault();
        },
        false
      );
      dropzone.addEventListener(
        'drop',
        e => {
          e.preventDefault();
          const fileList = e.dataTransfer.files;
          const file = fileList[0];
          if (file.name.endsWith('.m3u8')) {
            file.text().then(m3u8Str => {
              MP.el.m3u8Content.value = m3u8Str;
              MP.el.playBtn.click();
            });
          }
          return false;
        },
        false
      );

      // tab 切换
      document.getElementById('tab-history').onclick = function () {
        this.classList.add('border-blue-400', 'text-blue-300');
        document.getElementById('tab-fav').classList.remove('border-blue-400', 'text-blue-300');
        document.getElementById('history-list').classList.remove('hidden');
        document.getElementById('fav-list').classList.add('hidden');
      };
      document.getElementById('tab-fav').onclick = function () {
        this.classList.add('border-blue-400', 'text-blue-300');
        document.getElementById('tab-history').classList.remove('border-blue-400', 'text-blue-300');
        document.getElementById('fav-list').classList.remove('hidden');
        document.getElementById('history-list').classList.add('hidden');
      };
      // 复制、收藏、删除、清空
      document.addEventListener('click', function (e) {
        if (e.target.classList.contains('copy-btn')) {
          h5Utils.copy(e.target.dataset.url).then(d => console.log(d));
          e.target.textContent = '已复制';
          setTimeout(() => (e.target.textContent = '复制'), 1000);
        } else if (e.target.classList.contains('fav-btn')) {
          const url = e.target.dataset.url;
          let fav = getFromStorage('m3u8_fav');
          if (!fav.find(i => i.url === url)) {
            fav.unshift({ url, time: Date.now() });
            saveToStorage('m3u8_fav', fav);
            MP.renderList('fav');
            h5Utils.toast('收藏成功');
          } else h5Utils.toast('已收藏');
        } else if (e.target.classList.contains('del-btn')) {
          const idx = +e.target.dataset.idx;
          const type = e.target.closest('#history-list') ? 'm3u8_history' : 'm3u8_fav';
          let arr = getFromStorage(type);
          arr.splice(idx, 1);
          saveToStorage(type, arr);
          MP.renderList(type === 'm3u8_history' ? 'history' : 'fav');
        } else if (e.target.id === 'clear-history') {
          localStorage.removeItem('m3u8_history');
          MP.renderList('history');
        } else if (e.target.classList.contains('play-btn')) {
          const url = e.target.dataset.url;
          MP.el.urlInput.value = url;
          MP.el.playBtn.click();
        }
      });
    },
    renderPlayList(list) {
      if (!list) list = this.data.playList;
      const container = MP.el.playList;
      if (!list?.length) return container.classList.add('hidden');

      container.classList.remove('hidden');

      let html = [];

      list.forEach((item, idx) => {
        html.push(
          `<button class="play-btn text-xs text-gray-100 p-1 m-1 bg-blue-600 hover:bg-blue-700 rounded" data-idx="${idx}" data-url="${item.url}">${item.name}</button>`
        );
      });
      container.innerHTML = html.join('');
    },
    // 渲染列表
    renderList(type) {
      const list = getFromStorage(type === 'history' ? 'm3u8_history' : 'm3u8_fav');
      const container = document.getElementById(type === 'history' ? 'history-list' : 'fav-list');
      container.innerHTML = '';
      if (!list.length) {
        container.innerHTML = `<div class="text-gray-400 text-sm">暂无${type === 'history' ? '历史记录' : '收藏'}</div>`;
        return;
      }
      list.forEach((item, idx) => {
        container.innerHTML += `
        <div class="flex items-center justify-between bg-gray-900 rounded px-3 py-2">
          <div class="flex-1 min-w-0">
            <a href="#" class="text-blue-300 break-all hover:underline" title="${item.url}">${item.url}</a>
            <div class="text-xs text-gray-400 mt-1">${MP.formatTime(item.time)}</div>
          </div>
          <div class="flex-shrink-0 flex space-x-2 ml-2">
            <button class="play-btn text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded" data-url="${item.url}">播放</button>
            <button class="copy-btn text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded" data-url="${item.url}">复制</button>
            ${
              type === 'history'
                ? `<button class="fav-btn text-xs px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded" data-url="${item.url}">收藏</button>`
                : ''
            }
            <button class="del-btn text-xs px-2 py-1 bg-red-600 hover:bg-red-700 rounded" data-idx="${idx}">删除</button>
          </div>
        </div>
      `;
      });
    },
    addHistory(url) {
      if (!url) return;
      let history = getFromStorage('m3u8_history');
      history = history.filter(i => i.url !== url).slice(0, 199);
      history.unshift({ url, time: Date.now() });
      saveToStorage('m3u8_history', history);
      MP.renderList('history');
    },
    // see https://dplayer.diygod.dev/zh/guide.html
    play(url, type) {
      if (url) url = decodeURIComponent(url);
      else return h5Utils.alert('请输入 m3u8 的 URL 或者内容');
      document.documentElement.scrollTo({ top: MP.el.dplayer.offsetTop - 10, behavior: 'smooth' });
      // MP.el.dplayer.scrollIntoView();

      if (!type) {
        if (url.includes('.m3u8')) {
          type = 'auto';
          if (Hls.isSupported()) type = 'customHls';
        } else if (url.includes('torrent') || url.includes('magnet:')) type = 'customWebTorrent';
        else if (url.includes('.ts')) type = 'customHls';
        else if (url.includes('.mp4')) type = 'mp4';
        else if (url.includes('.flv')) type = 'customFlv';
        else type = 'auto';
      }

      if (!url.startsWith('blob:')) {
        MP.addHistory(url);
        // 设置为 url 参数
        if (url !== uri) {
          const params = new URLSearchParams(location.search);
          params.set('url', encodeURIComponent(url));
          history.replaceState({}, '', location.pathname + '?' + params.toString());
        }

        if (MP.data.playList.length) {
          const idx = MP.data.playList.findIndex(i => i.url === url);
          if (idx > -1) {
            MP.el.playList.querySelectorAll(`button`).forEach((el, i) => {
              if (i === idx) {
                el.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                el.classList.add('bg-green-500', 'hover:bg-green-600');
              } else if (el.classList.contains('bg-green-500')) {
                el.classList.remove('bg-green-500', 'hover:bg-green-600');
                el.classList.add('bg-blue-600', 'hover:bg-blue-700');
              }
            });
          }
        }
      }

      if (MP.inc.dp) MP.inc.dp.destroy();
      MP.el.dplayer.classList.remove('hidden');

      MP.inc.dp = new DPlayer({
        container: MP.el.dplayer,
        autoplay: true,
        airplay: true,
        theme: '#FADFA3',
        loop: true,
        lang: 'zh-cn',
        screenshot: true,
        hotkey: true,
        chromecast: true,
        preload: 'auto',
        // logo: 'logo.png',
        volume: 0.7,
        playbackSpeed: [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 8],
        mutex: true,
        video: {
          url,
          type,
          customType: {
            customHls: function (video, _player) {
              if (MP.inc.hls) MP.inc.hls.destroy();
              MP.inc.hls = new Hls();
              MP.inc.hls.loadSource(video.src);
              MP.inc.hls.attachMedia(video);
            },
            customFlv: function (video, _player) {
              if (MP.inc.flvPlayer) MP.inc.flvPlayer.destroy();
              MP.inc.flvPlayer = flvjs.createPlayer({
                type: 'flv',
                url: video.src,
              });
              MP.inc.flvPlayer.attachMediaElement(video);
              MP.inc.flvPlayer.load();
            },
            customWebTorrent: function (video, player) {
              player.container.classList.add('dplayer-loading');
              if (MP.inc.wtClient) MP.inc.wtClient.destroy();
              const tracker = {
                // @see https://github.com/webtorrent/bittorrent-tracker#client
                announce: [
                  // https://github.com/ngosang/trackerslist/
                  // https://cdn.jsdelivr.net/gh/ngosang/trackerslist@master/trackers_all_ws.txt
                  'udp://explodie.org:6969',
                  'wss://tracker.btorrent.xyz:443',
                  'wss://tracker.webtorrent.dev:443',
                  'wss://tracker.ghostchu-services.top:443/announce',
                  'wss://tracker.files.fm:7073/announce',
                  'wss://tracker.webtorrent.io',
                  'wss://tracker.openwebtorrent.com',
                  'wss://tracker.fastcast.nz',
                  'ws://tracker.ghostchu-services.top:80/announce',
                  'ws://tracker.files.fm:7072/announce',
                  'https://tr.zukizuki.org:443/announce',
                  'https://tracker.yemekyedim.com:443/announce',
                  'https://tracker.moeblog.cn:443/announce',
                  'https://tracker.bt4g.com:443/announce',
                  'https://tracker.zhuqiy.top:443/announce',
                  'https://tracker.leechshield.link:443/announce',
                  'https://tracker.itscraftsoftware.my.id:443/announce',
                  'https://tracker.ghostchu-services.top:443/announce',
                  'https://tracker.gcrenwp.top:443/announce',
                  'https://tracker.expli.top:443/announce',
                  'https://tr.zukizuki.org:443/announce',
                  'https://tr.nyacat.pw:443/announce',
                  'https://sparkle.ghostchu-services.top:443/announce',
                ],
                // RTCPeerConnection config
                rtcConfig: {
                  iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' },
                    { urls: 'stun:stun.services.mozilla.com' },
                    { urls: 'stun:stunserver.org' },
                    { urls: 'stun:stun.xten.com' },
                    { urls: ['turn:numb.viagenie.ca'], username: 'webrtc@live.com', credential: 'muazkh' },
                  ],
                  // sdpSemantics: 'unified-plan',
                  // iceTransportPolicy: 'relay',
                },
              };
              MP.inc.wtClient = new WebTorrent({ tracker });
              MP.inc.wtClient.add(video.src, { announce: tracker.announce }, torrent => {
                console.log('Torrent name:', torrent.name, torrent.files);
                const file = torrent.files.find(file => file.name.endsWith('.mp4'));
                file.renderTo(video, { autoplay: player.options.autoplay }, () => player.container.classList.remove('dplayer-loading'));
              });
            },
          },
        },
        pluginOptions: {
          hls: {},
          // @see https://github.com/bilibili/flv.js/blob/master/docs/api.md#flvjscreateplayer
          flv: { mediaDataSource: {}, config: {} },
          // webtorrent config
          webtorrent: {},
        },
        contextmenu: [{ text: '更多工具', link: 'https://lzw.me/tools' }],
      });
      MP.inc.dp.on('error', e => {
        if (e && e.message) h5Utils.alert(`播放失败：${e.message || '请检查 URL 是否正确'}`, { icon: 'error' });
      });

      // 当播放完毕时，查找 playlist 中下一个视频播放
      MP.inc.dp.on('ended', () => {
        console.log('播放完毕', url);

        if (MP.data.playList.length) {
          const idx = MP.data.playList.findIndex(i => i.url === url);
          if (idx > -1) {
            const item = MP.data.playList[idx + 1];
            if (item) MP.play(item.url, item.type);
          }
        }
      });
    },
    formatTime(ts) {
      const d = new Date(ts);
      const now = new Date();
      const diff = Math.floor((now - d) / 60000);
      if (diff < 1) return '刚刚';
      if (diff < 60) return `${diff}分钟前`;
      return d.toLocaleString();
    },
  };

  window.MP = MP;
  MP.init();
})();
