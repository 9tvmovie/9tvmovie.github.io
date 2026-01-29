// ================================
// main.js - App Bootstrap (FIXED)
// ================================

console.log("🚀 main.js loaded")

function detectBackendURL() {
  // Prefer explicit backend URL set by config.js (useful for GitHub Pages)
  if (window.API_BASE_URL) return window.API_BASE_URL

  const host = window.location.hostname

  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return "http://127.0.0.1:8787"
  }

  return `https://${host}`
}

window.APP_CONFIG = {
  backendURL: detectBackendURL()
}

console.log("🔗 Backend URL:", window.APP_CONFIG.backendURL)

// ----------------
// Load / Save Settings
// ----------------
function loadSettings() {
  return {
    aiKey: sessionStorage.getItem("ai_api_key") || localStorage.getItem("ai_api_key") || "",
    tmdbKey: sessionStorage.getItem("tmdb_api_key") || localStorage.getItem("tmdb_api_key") || "",
    provider: sessionStorage.getItem("ai_provider") || localStorage.getItem("ai_provider") || "gemini"
  }
}

function saveSettings(settings) {
  const rememberRaw = localStorage.getItem('remember_api_keys')
  const remember = rememberRaw === null ? true : String(rememberRaw) === 'true'

  if (settings.aiKey !== undefined) {
    if (remember) {
      localStorage.setItem("ai_api_key", settings.aiKey)
      sessionStorage.removeItem("ai_api_key")
    } else {
      sessionStorage.setItem("ai_api_key", settings.aiKey)
      localStorage.removeItem("ai_api_key")
    }
  }

  if (settings.tmdbKey !== undefined) {
    if (remember) {
      localStorage.setItem("tmdb_api_key", settings.tmdbKey)
      sessionStorage.removeItem("tmdb_api_key")
    } else {
      sessionStorage.setItem("tmdb_api_key", settings.tmdbKey)
      localStorage.removeItem("tmdb_api_key")
    }
  }

  if (settings.provider) {
    if (remember) {
      localStorage.setItem("ai_provider", settings.provider)
      sessionStorage.removeItem("ai_provider")
    } else {
      sessionStorage.setItem("ai_provider", settings.provider)
      localStorage.removeItem("ai_provider")
    }
  }
}

window.AppSettings = {
  getAI() {
    const raw = localStorage.getItem("ai-settings")
    if (!raw) return null
    return JSON.parse(raw)
  },

  saveAI(settings) {
    localStorage.setItem("ai-settings", JSON.stringify(settings))

    // hot reload AI config
    if (window.AI?.init) {
      window.AI.init({
        backendURL: window.APP_CONFIG.backendURL,
        provider: settings.provider,
        apiKey: settings.keys[settings.provider]
      })
    }
  }
}

// ----------------
// Init
// ----------------
document.addEventListener("DOMContentLoaded", () => {
  console.log("📦 Initializing app...")
  const settings = loadSettings()

  window.SettingsUI?.init(settings)

  window.AI?.init({
    backendURL: window.APP_CONFIG.backendURL,
    provider: settings.provider,
    apiKey: settings.aiKey
  })

  window.TMDB?.init({
    apiKey: settings.tmdbKey
  })

  // ----- App state -----
  window.appState = {
    currentPage: 1,
    maxPage: 1,
    mediaType: 'movie',
    mediaCategory: 'popular',
    selectedGenre: '',
    selectedYear: '',
    selectedSort: 'popularity.desc',
    searchQuery: '',
    minUserScore: 0,
    minUserVotes: 0
  }

  // ----- UI elements -----
  const mediaTypeEl = document.getElementById('mediaType')
  const mediaCategoryEl = document.getElementById('mediaCategory')
  const genreFilterEl = document.getElementById('genreFilter')
  const yearFilterEl = document.getElementById('yearFilter')
  const sortFilterEl = document.getElementById('sortFilter')

  // basic maps
  const categories = {
    movie: [{value:'popular',text:'Popular'},{value:'now_playing',text:'Now Playing'},{value:'upcoming',text:'Upcoming'},{value:'top_rated',text:'Top Rated'}],
    tv: [{value:'popular',text:'Popular'},{value:'airing_today',text:'Airing Today'},{value:'on_the_air',text:'On TV'},{value:'top_rated',text:'Top Rated'}]
  }

  const movieGenres = {28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",99:"Documentary",18:"Drama",10751:"Family",14:"Fantasy",36:"History",27:"Horror",10402:"Music",9648:"Mystery",10749:"Romance",878:"Science Fiction",10770:"TV Movie",53:"Thriller",10752:"War",37:"Western"}
  const tvGenres = {10759:"Action & Adventure",16:"Animation",35:"Comedy",80:"Crime",99:"Documentary",18:"Drama",10751:"Family",10762:"Kids",9648:"Mystery",10763:"News",10764:"Reality",10765:"Sci-Fi & Fantasy",10766:"Soap",10767:"Talk",10768:"War & Politics",37:"Western"}

  function updateCategoryDropdown(){
    mediaCategoryEl.innerHTML=''
    categories[window.appState.mediaType].forEach(c=>{
      const opt = document.createElement('option'); opt.value=c.value; opt.text=c.text; mediaCategoryEl.appendChild(opt)
    })
    window.appState.mediaCategory = mediaCategoryEl.value
  }

  function updateGenreDropdown(){
    genreFilterEl.innerHTML = '<option value="">All Genres</option>'
    const genres = window.appState.mediaType === 'movie' ? movieGenres : tvGenres
    Object.entries(genres).forEach(([id,name])=>{
      const opt = document.createElement('option'); opt.value=id; opt.text=name; genreFilterEl.appendChild(opt)
    })
    window.appState.selectedGenre = ''
  }

  function updateYearDropdown(){
    yearFilterEl.innerHTML = '<option value="">All Years</option>'
    const currentYear = (new Date()).getFullYear()
    for(let y=currentYear;y>=1950;y--){ const opt=document.createElement('option'); opt.value=y; opt.text=y; yearFilterEl.appendChild(opt)}
    window.appState.selectedYear = ''
  }

  // wire UI
  mediaTypeEl.onchange = ()=>{ window.appState.mediaType = mediaTypeEl.value; updateCategoryDropdown(); updateGenreDropdown(); updateYearDropdown(); window.appState.currentPage=1; loadMedia(1) }
  mediaCategoryEl.onchange = ()=>{ window.appState.mediaCategory = mediaCategoryEl.value; window.appState.currentPage=1; loadMedia(1) }
  document.getElementById('searchBtn').onclick = doSearch
  document.getElementById('clearSearch').onclick = clearSearch
  document.getElementById('applyFilters').onclick = applyAllFilters
  document.getElementById('resetFilters').onclick = resetFilters

  // auto-apply when individual filters change
  genreFilterEl.onchange = ()=>{ window.appState.selectedGenre = genreFilterEl.value; window.appState.currentPage = 1; loadMedia(1) }
  yearFilterEl.onchange = ()=>{ window.appState.selectedYear = yearFilterEl.value; window.appState.currentPage = 1; loadMedia(1) }
  sortFilterEl.onchange = ()=>{ window.appState.selectedSort = sortFilterEl.value; window.appState.currentPage = 1; loadMedia(1) }

  // sliders
  window.onScoreChange = (v)=>{ document.getElementById('scoreLabel').textContent = v; window.appState.minUserScore = parseFloat(v) }
  window.onVotesChange = (v)=>{ document.getElementById('votesLabel').textContent = v; window.appState.minUserVotes = parseInt(v,10) }

  // init dropdowns
  updateCategoryDropdown(); updateGenreDropdown(); updateYearDropdown();

  // initial load
  loadMedia(1)
  // if URL contains an item param, open modal on load
  checkUrlForModal()
})

// -----------------------
// Core functions
// -----------------------
async function loadMedia(page = 1){
  try{
    document.getElementById('loader').style.display = 'block'
    const s = window.appState
    let data
    if(s.searchQuery){
      // Search endpoint does not support many server-side filters; apply post-filtering in client
      data = await window.TMDB.search({ media: s.mediaType, query: s.searchQuery, page })
    } else {
      // Build discover params
      const params = new URLSearchParams()
      if (s.selectedGenre) params.append('with_genres', s.selectedGenre)
      if (s.selectedYear) {
        if (s.mediaType === 'movie') params.append('primary_release_year', s.selectedYear)
        else params.append('first_air_date_year', s.selectedYear)
      }
      // rating filters
      if (typeof s.minUserScore === 'number' && s.minUserScore > 0) params.append('vote_average.gte', String(s.minUserScore))
      params.append('vote_average.lte', '10')
      if (typeof s.minUserVotes === 'number' && s.minUserVotes > 0) params.append('vote_count.gte', String(s.minUserVotes))

      // sort handling: if combined -> sort will be done client-side, otherwise send sort_by
      if (s.selectedSort && !s.selectedSort.startsWith('combined')) {
        params.append('sort_by', s.selectedSort)
      }

      // pick endpoints for special categories
      if(s.mediaCategory === 'now_playing' && s.mediaType === 'movie'){
        data = await (await fetch(`${window.TMDB.base}/movie/now_playing?api_key=${window.TMDB.apiKey}&page=${page}&${params.toString()}`)).json()
      } else if(s.mediaCategory === 'upcoming' && s.mediaType === 'movie'){
        data = await (await fetch(`${window.TMDB.base}/movie/upcoming?api_key=${window.TMDB.apiKey}&page=${page}&${params.toString()}`)).json()
      } else if(s.mediaCategory === 'airing_today' && s.mediaType === 'tv'){
        data = await (await fetch(`${window.TMDB.base}/tv/airing_today?api_key=${window.TMDB.apiKey}&page=${page}&${params.toString()}`)).json()
      } else if(s.mediaCategory === 'on_the_air' && s.mediaType === 'tv'){
        data = await (await fetch(`${window.TMDB.base}/tv/on_the_air?api_key=${window.TMDB.apiKey}&page=${page}&${params.toString()}`)).json()
      } else {
        // discover
        data = await (await fetch(`${window.TMDB.base}/discover/${s.mediaType}?api_key=${window.TMDB.apiKey}&page=${page}&${params.toString()}`)).json()
      }

    }

    window.appState.maxPage = Math.min(data.total_pages || 1, 500)
    let results = data.results || []

    // apply combined sort locally
    if((window.appState.selectedSort || '').startsWith('combined')){
      const desc = (window.appState.selectedSort||'').endsWith('.desc')
      results.sort((a,b)=>{ const score = it => (it.popularity||0) + ((it.vote_average||0)*10); return desc ? score(b)-score(a) : score(a)-score(b) })
    }

    // client-side filtering for search or safety
    const minScore = window.appState.minUserScore || 0
    const minVotes = window.appState.minUserVotes || 0
    if(minScore>0 || minVotes>0){
      results = results.filter(r=>{ const avg = r.vote_average||0; const vc = r.vote_count||0; return avg>=minScore && avg<=10 && vc>=minVotes })
    }

    // enrich movie list with details when movie to get countries
    if(window.appState.mediaType === 'movie' && results.length){
      // fetch details in batches to avoid too many parallel requests
      const concurrency = 8
      const details = []
      for (let i = 0; i < results.length; i += concurrency) {
        const chunk = results.slice(i, i + concurrency)
        // use TMDB.getDetails which has caching
        // map to promises and wait for the chunk
        const chunkRes = await Promise.all(chunk.map(r => window.TMDB.getDetails('movie', r.id).catch(() => null)))
        details.push(...chunkRes)
      }
      const mediaList = results.map((m, idx)=>{
        const d = details[idx] || {}
        const statusText = (m.release_date && new Date(m.release_date) <= new Date()) ? 'Released' : 'Upcoming'
        const countries = (d.production_countries && d.production_countries.length)
          ? d.production_countries.map(c=> (c.iso_3166_1||'').toLowerCase()).filter(Boolean).join(', ')
          : (m.origin_country?.map(c=>c.toLowerCase()).join(', ')||'-')
        return {...m, statusText, countries}
      })
      // keep last fetched list available for quick fallbacks
      window.lastMediaList = mediaList
      renderMovies(mediaList)
    } else {
      const mediaList = results.map(m=>{
        const statusText = (m.first_air_date && new Date(m.first_air_date) <= new Date()) ? 'Aired' : 'Upcoming'
        const countries = m.origin_country?.map(c=>c.toLowerCase()).join(', ') || '-'
        return {...m, statusText, countries}
      })
      renderMovies(mediaList)
    }

    renderPagination(page)
  }catch(err){
    console.error('loadMedia error', err)
    const cont = document.getElementById('movieGrid') || document.getElementById('movieList')
    if (cont) cont.innerHTML = '<p>Error loading data. Try again later.</p>'
  }finally{
    document.getElementById('loader').style.display = 'none'
  }
}

function renderMovies(mediaList){
  const container = document.getElementById('movieGrid') || document.getElementById('movieList')
  container.innerHTML = ''
  mediaList.forEach(m=>{
    const img = m.poster_path ? `https://image.tmdb.org/t/p/w300${m.poster_path}` : 'https://netmoviestvshows.github.io/movie/images/no-poster-movie-tv.png'
    const title = window.appState.mediaType === 'movie' ? (m.title || '') : (m.name || '')
    const release = window.appState.mediaType === 'movie' ? (m.release_date ? m.release_date.split('-')[0] : 'Unknown') : (m.first_air_date ? m.first_air_date.split('-')[0] : 'Unknown')
    const rating = m.vote_average != null ? (m.vote_average.toFixed ? m.vote_average.toFixed(1) : m.vote_average) : 'N/A'
    const safeTitle = String(title||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")
    const html = `
      <div class="movie" title="${title} (${release})">
        <div class="rating">⭐ ${rating}</div>
        <div class="media-type-icon">${window.appState.mediaType==='movie'?'Movie':'TV'}</div>
        <img loading="lazy" src="${img}" alt="${title}" onclick="handleItemClick(event, ${m.id}, '${safeTitle}')">
        <div class="title">${title}</div>
        <div class="year">${m.statusText} : ${release}</div>
        <div class="country">${m.countries || '-'}</div>
      </div>`
    container.insertAdjacentHTML('beforeend', html)
  })
}

function renderPagination(page){
  const pag = document.getElementById('pagination')
  pag.innerHTML = ''
  const total = window.appState.maxPage || 1
  const addBtn = (label, p, disabled=false) => pag.insertAdjacentHTML('beforeend', `<button ${disabled? 'disabled': ''} onclick="goPage(${p})">${label}</button>`)
  addBtn('« First', 1, page===1)
  addBtn('‹ Prev', Math.max(1, page-1), page===1)
  const pages = []
  pages.push(1)
  let start = Math.max(2, page-2); let end = Math.min(total-1, page+2)
  if(start>2) pages.push('...')
  for(let i=start;i<=end;i++) pages.push(i)
  if(end<total-1) pages.push('...')
  pages.push(total)
  const unique = [...new Set(pages)]
  unique.forEach(p=>{
    if(p==='...') pag.insertAdjacentHTML('beforeend','<span>…</span>')
    else if(p===page) pag.insertAdjacentHTML('beforeend', `<button class="active">${p}</button>`)
    else pag.insertAdjacentHTML('beforeend', `<button onclick="goPage(${p})">${p}</button>`)
  })
  addBtn('Next ›', Math.min(total, page+1), page>=total)
  addBtn('Last »', total, page>=total)
}

function goPage(p){ if(p<1||p>window.appState.maxPage) return; window.appState.currentPage = p; loadMedia(p) }

function doSearch(){ window.appState.searchQuery = document.getElementById('searchInput').value.trim(); window.appState.currentPage = 1; loadMedia(1) }
function clearSearch(){ document.getElementById('searchInput').value=''; window.appState.searchQuery=''; window.appState.currentPage=1; loadMedia(1) }

function applyAllFilters(){
  window.appState.selectedGenre = document.getElementById('genreFilter').value || ''
  window.appState.selectedYear = document.getElementById('yearFilter').value || ''
  window.appState.selectedSort = document.getElementById('sortFilter').value || 'popularity.desc'
  window.appState.searchQuery = document.getElementById('searchInput').value.trim() || ''
  window.appState.minUserScore = parseFloat(document.getElementById('scoreSlider').value) || 0
  window.appState.minUserVotes = parseInt(document.getElementById('votesSlider').value,10) || 0
  window.appState.currentPage = 1
  loadMedia(1)
}

function resetFilters(){
  document.getElementById('genreFilter').value = ''
  document.getElementById('yearFilter').value = ''
  document.getElementById('sortFilter').value = 'popularity.desc'
  document.getElementById('searchInput').value = ''
  document.getElementById('scoreSlider').value = 0
  document.getElementById('votesSlider').value = 0
  document.getElementById('scoreLabel').textContent = '0'
  document.getElementById('votesLabel').textContent = '0'
  window.appState.selectedGenre = ''
  window.appState.selectedYear = ''
  window.appState.selectedSort = 'popularity.desc'
  window.appState.searchQuery = ''
  window.appState.minUserScore = 0
  window.appState.minUserVotes = 0
  window.appState.currentPage = 1
  loadMedia(1)
}

// Modal: fetch details and populate
async function openModal(id){
  const modalEl = document.getElementById('modal')
  if(!modalEl){ console.warn('Modal element not found'); return }

  // show modal early with loading state
  modalEl.style.display = 'block'
  const overviewEl = document.getElementById('modalOverview')
  if(overviewEl) overviewEl.textContent = '⏳ Loading details...'


    try{
    const md = document.getElementById('modalDetails') || (()=>{ const d=document.createElement('div'); d.id='modalDetails'; modalEl.querySelector('#modalContent')?.appendChild(d); return d })()
    const mediaType = window.appState.mediaType

    // attempt to fetch rich details; if it fails we'll fallback to minimal data
    let data = null
    let usedFallback = false
    try{
      data = await window.TMDB.getDetails(mediaType, id)
    }catch(e){
      console.warn('TMDB.getDetails failed, will use fallback if available', e)
      // try to find basic item from lastMediaList
      if(Array.isArray(window.lastMediaList)){
        const found = window.lastMediaList.find(it=>String(it.id) === String(id))
        if(found){ data = found; usedFallback = true }
      }
      if(!data) throw new Error('Failed to fetch details and no fallback available')
    }

    // Remove old gallery button if it exists (feature no longer needed)
    try{
      const galleryBtn = document.getElementById('modalGalleryBtn')
      if(galleryBtn) galleryBtn.remove()
    }catch(e){}

    // Backdrop & poster: ensure elements exist, then populate
    const modalContent = modalEl.querySelector('#modalContent') || (()=>{ const c = document.createElement('div'); c.id='modalContent'; modalEl.appendChild(c); return c })()

    // ensure backdrop container
    let backdropEl = document.getElementById('modalBackdrop')
    if(!backdropEl){ backdropEl = document.createElement('div'); backdropEl.id = 'modalBackdrop'; backdropEl.className = 'modal-backdrop'; modalContent.insertAdjacentElement('afterbegin', backdropEl) }

    // ensure backdrop image element
    let backdropImageEl = document.getElementById('modalBackdropImage')
    if(!backdropImageEl){ backdropImageEl = document.createElement('img'); backdropImageEl.id = 'modalBackdropImage'; backdropImageEl.className = 'modal-backdrop-image'; backdropImageEl.alt = 'Backdrop'; backdropImageEl.style.display = 'none'; backdropEl.appendChild(backdropImageEl) }

    // ensure poster image element
    let posterEl = document.getElementById('modalPoster')
    if(!posterEl){ posterEl = document.createElement('img'); posterEl.id = 'modalPoster'; posterEl.className = 'modal-poster'; posterEl.alt = 'Poster'; posterEl.loading = 'lazy'; modalContent.appendChild(posterEl) }

    const bigBackdropUrl = data?.backdrop_path || data?.poster_path ? `https://image.tmdb.org/t/p/w780${data.backdrop_path || data.poster_path}` : ''
    backdropEl.style.backgroundImage = bigBackdropUrl ? `url(${bigBackdropUrl})` : ''
    posterEl.src = data?.poster_path ? `https://image.tmdb.org/t/p/w300${data.poster_path}` : ''
    const smallBackdropPath = data?.backdrop_path || data?.poster_path || ''
    const smallBackdropUrl = smallBackdropPath ? `https://image.tmdb.org/t/p/w300${smallBackdropPath}` : ''
    backdropImageEl.src = smallBackdropUrl
    backdropImageEl.style.display = smallBackdropUrl ? 'block' : 'none'

    // Title and metadata attributes
    const titleEl = document.getElementById('modalTitle')
    if(titleEl) titleEl.textContent = mediaType==='movie' ? (data.title || 'Untitled') : (data.name || 'Untitled')
    if(md && md.setAttribute){ md.setAttribute('data-media-id', String(id)); md.setAttribute('data-media-type', mediaType) }

    // meta container
    let metaContainer = document.getElementById('modalMeta')
    if(!metaContainer){ metaContainer = document.createElement('div'); metaContainer.id = 'modalMeta'; md.appendChild(metaContainer) }
    metaContainer.innerHTML = ''
    const addMeta = (label, value)=>{ const div=document.createElement('div'); div.className='meta-item'; div.innerHTML = `<span class='meta-label'>${label}</span><span class='meta-value'>${value||'—'}</span>`; metaContainer.appendChild(div) }
    const formatDateID = (dateStr) => {
      const s = String(dateStr || '').trim()
      if (!s || s === '—') return '—'
      const d = new Date(s)
      if (Number.isNaN(d.getTime())) return '—'
      try {
        return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
      } catch (e) {
        return s
      }
    }
    addMeta('ID', id)
    addMeta('Rating', `${data?.vote_average ?? 'N/A'} / ${data?.vote_count ?? 0} votes`)
    addMeta('Genre', (data?.genres||[]).map(g=>g.name).join(', ') || '—')
    if(mediaType==='movie') addMeta('Director', data?.credits?.crew?.find(c=>c.job==='Director')?.name || '—')
    else addMeta('Created By', (data?.created_by||[]).map(c=>c.name).join(', ') || '—')
    addMeta('Country', (data?.production_countries||[]).map(c=>c.name).join(', ') || (data?.origin_country?.join(', ') || '—'))
    addMeta('Language', (data?.spoken_languages||[]).map(l=>l.english_name).join(', ') || '—')
    if(mediaType==='movie') addMeta('Duration', data?.runtime ? `${data.runtime} min` : '—')
    else addMeta('Seasons', data?.number_of_seasons || '—')
    addMeta('Released', formatDateID(mediaType==='movie' ? data?.release_date : data?.first_air_date))
    addMeta('Production', (data?.production_companies||[]).map(p=>p.name).join(', ')||'—')

    if(overviewEl) overviewEl.textContent = data?.overview || 'No overview available.'

    // cast list (separate block)
    try{
      let castContainer = document.getElementById('modalMeta-cast')
      if(!castContainer){ const wrapper = document.getElementById('modalDetails') || md; castContainer = document.createElement('div'); castContainer.id = 'modalMeta-cast'; wrapper.appendChild(castContainer) }
      castContainer.innerHTML = ''
      const castList = (data?.credits?.cast || []).slice(0, 10)
      if(castList.length){
        castList.forEach(c=>{
          const div = document.createElement('div')
          div.className = 'cast-item'
          div.innerHTML = `
            <span class="cast-name meta-label">${c.name}</span>
            ${c.character ? `<span class="cast-role meta-value"><span class="as">as </span>${c.character}</span>` : ''}
          `
          castContainer.appendChild(div)
        })
      } else {
        castContainer.innerHTML = '<div class="cast-item">—</div>'
      }
    }catch(e){ console.warn('cast render failed', e) }

    // trailer
    try{
      const trailerDiv = document.getElementById('modalTrailer') || (()=>{ const d=document.createElement('div'); d.id='modalTrailer'; md.appendChild(d); return d })()
      trailerDiv.innerHTML = ''
      const trailer = (data?.videos?.results || []).find(v=>v.type==='Trailer' && v.site==='YouTube')
      if(trailer) trailerDiv.innerHTML = `<iframe src="https://www.youtube.com/embed/${trailer.key}" allowfullscreen allow="autoplay; encrypted-media"></iframe>`
    }catch(e){ console.warn('trailer render failed', e) }

    // keywords (moved after trailer, but inserted before trailer)
    try{
      let kwEl = document.getElementById('modalKeywordsList')
      if(!kwEl){ 
        const wrapper = document.getElementById('modalDetails') || md
        const trailerDiv = document.getElementById('modalTrailer')
        const kwDiv = document.createElement('div')
        kwDiv.id = 'modalKeywords'
        kwDiv.innerHTML = '<strong class="cast-name">Keywords:</strong> <span id="modalKeywordsList">—</span>'
        // Insert before trailer if trailer exists, otherwise append to end
        if(trailerDiv && trailerDiv.parentNode){
          trailerDiv.parentNode.insertBefore(kwDiv, trailerDiv)
        } else {
          wrapper.appendChild(kwDiv)
        }
        kwEl = document.getElementById('modalKeywordsList')
      }
      let keywordsArr = []
      if(data?.keywords){ if(Array.isArray(data.keywords)) keywordsArr = data.keywords; else if(Array.isArray(data.keywords.keywords)) keywordsArr = data.keywords.keywords; else if(Array.isArray(data.keywords.results)) keywordsArr = data.keywords.results }
      const kwNames = keywordsArr.map(k=>k.name).filter(Boolean)
      if(kwEl) kwEl.textContent = kwNames.length ? kwNames.join(', ') : '—'
    }catch(e){ console.warn('keywords render failed', e) }

    // AI Social Generator UI (compact: provider + platform dropdown, keyword & tone selectors)
    try{
      const mdWrapper = document.getElementById('modalDetails') || md

      // Collapsed AI UI: show a small button first, expand on demand
      let aiToggle = document.getElementById('aiToggleBtn')
      if(!aiToggle){
        aiToggle = document.createElement('button')
        aiToggle.id = 'aiToggleBtn'
        aiToggle.type = 'button'
        aiToggle.textContent = 'Generate Content'
        aiToggle.style.marginTop = '12px'
        aiToggle.style.marginBottom = '12px'
        aiToggle.style.padding = '8px 10px'
        aiToggle.style.borderRadius = '8px'
        aiToggle.style.border = '1px solid rgba(255,255,255,0.12)'
        aiToggle.style.background = 'rgba(255,255,255,0.04)'
        aiToggle.style.color = '#fff'
      }

      // Wrap .modalMC and #aiToggleBtn inside <div class="switch">
      try{
        let switchWrap = document.getElementById('aiSwitchWrap')
        if(!switchWrap){
          switchWrap = document.createElement('div')
          switchWrap.id = 'aiSwitchWrap'
          switchWrap.className = 'switch'
        }

        const overviewEl3 = document.getElementById('modalOverview')
        if(overviewEl3 && overviewEl3.parentNode && switchWrap.parentNode !== overviewEl3.parentNode){
          overviewEl3.parentNode.insertBefore(switchWrap, overviewEl3)
        } else if(!switchWrap.parentNode){
          mdWrapper.appendChild(switchWrap)
        }

        const modalMC = document.querySelector('#modalDetails .modalMC') || document.querySelector('.modalMC')
        if(modalMC && modalMC.parentNode !== switchWrap){
          switchWrap.appendChild(modalMC)
        }
        if(aiToggle && aiToggle.parentNode !== switchWrap){
          switchWrap.appendChild(aiToggle)
        }
      }catch(e){ console.warn('wrap modalMC + aiToggle failed', e) }

      let aiContainer = document.getElementById('aiGenContainer')
      if(!aiContainer){
        aiContainer = document.createElement('div')
        aiContainer.id = 'aiGenContainer'
        aiContainer.style.marginTop = '12px'
        aiContainer.innerHTML = `
          <h3 style="margin:6px 0 8px;">Generate Social Content</h3>
          <div class="generate-social-content">
          <label style="font-size:13px;opacity:0.8">Language</label>
            <select id="aiLangSelect" style="padding:6px;border-radius:6px;background:#111;color:#fff;border:1px solid #333;min-width:110px">
              <option value="id">Indonesia</option>
              <option value="en">English</option>
            </select>  
          <label style="font-size:13px;opacity:0.8">AI Provider</label>
            <select id="aiProviderSelect" style="padding:6px;border-radius:6px;background:#111;color:#fff;border:1px solid #333">
              <option value="gemini">Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="openrouter">OpenRouter</option>
            </select>
            
            <label style="font-size:13px;opacity:0.8">Model</label>
            <select id="aiModelSelect" style="padding:6px;border-radius:6px;background:#111;color:#fff;border:1px solid #333;min-width:180px">
              <option value="">(auto)</option>
            </select>
            <label style="font-size:13px;opacity:0.8">Platform</label>
            <select id="aiPlatformSelect" style="padding:6px;border-radius:6px;background:#111;color:#fff;border:1px solid #333">
              <option value="youtube">YouTube Short</option>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook Post</option>
              <option value="x">X (Twitter)</option>
            </select>
            <label style="font-size:13px;opacity:0.8">Keyword</label>
            <select id="aiKeywordSelect" style="padding:6px;border-radius:6px;background:#111;color:#fff;border:1px solid #333;min-width:120px">
              <option value="">(auto)</option>
            </select>
            <label style="font-size:13px;opacity:0.8">Tone</label>
            <select id="aiToneSelect" style="padding:6px;border-radius:6px;background:#111;color:#fff;border:1px solid #333">
              <option value="neutral">Neutral</option>
              <option value="energetic">Energetic</option>
              <option value="dramatic">Dramatic</option>
              <option value="friendly">Friendly</option>
              <option value="formal">Formal</option>
            </select>
            <button id="aiGenerateBtn" style="margin-left:8px;padding:6px 10px;border-radius:6px;">Generate</button>
          </div>
          <div id="aiResultPanel" style="display:block;gap:8px;">
            <div style="margin-bottom:6px;display:flex;justify-content:space-between;align-items:flex-start">
              <strong>Title:</strong>
              <div>
                <button id="aiCopyTitle" style="padding:4px 8px;border-radius:6px;margin-left:8px">Copy</button>
              </div>
            </div>
            <div id="aiTitle" style="margin-top:6px;color:#d9cd71"></div>
            <div style="margin-bottom:6px;display:flex;justify-content:space-between;align-items:flex-start">
              <strong>Description:</strong>
              <div>
                <button id="aiCopyDescription" style="padding:4px 8px;border-radius:6px;margin-left:8px">Copy</button>
              </div>
            </div>
            <div id="aiDescription" style="margin-top:6px;color:#fff"></div>
            <div style="margin-bottom:6px;display:flex;justify-content:space-between;align-items:flex-start">
              <strong>Hashtags:</strong>
              <div>
                <button id="aiCopyHashtags" style="padding:4px 8px;border-radius:6px;margin-left:8px">Copy</button>
              </div>
            </div>
            <div id="aiHashtags" style="margin-top:6px;color:#2c9dc1"></div>
          </div>
        `
        // Place AI container above overview as well
        const overviewEl4 = document.getElementById('modalOverview')
        if(overviewEl4 && overviewEl4.parentNode){
          overviewEl4.parentNode.insertBefore(aiContainer, overviewEl4)
        } else {
          mdWrapper.appendChild(aiContainer)
        }
      }

      // Move AI settings panel (provider/api key/save/test) into modal below the AI generator container.
      // TMDB API key remains in the top control pane.
      try{
        const aiSettingsPane = document.getElementById('ai-settings-pane')
        if(aiSettingsPane && aiContainer && aiSettingsPane.parentNode !== aiContainer){
          aiSettingsPane.style.marginTop = '10px'
          aiSettingsPane.style.paddingTop = '8px'
          aiSettingsPane.style.borderTop = '1px solid rgba(255,255,255,0.08)'
          aiSettingsPane.style.gap = '5px'
          aiSettingsPane.style.flexWrap = 'wrap'
          aiSettingsPane.style.alignItems = 'flex-end'
          // remember intended display mode when expanded
          aiSettingsPane.dataset.displayExpanded = 'flex'
          aiContainer.insertAdjacentElement('afterend', aiSettingsPane)
          // keep hidden until user expands AI panel
          aiSettingsPane.style.display = 'none'
        }
      }catch(e){ console.warn('move ai-settings-pane failed', e) }

      // Hide AI panels until user clicks "Generate Content"
      try{
        let quickExisting = document.getElementById('aiQuickSuggestions')
        if(aiContainer) aiContainer.style.display = 'none'
        if(quickExisting) quickExisting.style.display = 'none'
        if(aiToggle){
          aiToggle.onclick = () => {
            const quick = document.getElementById('aiQuickSuggestions')
            const aiSettingsPane = document.getElementById('ai-settings-pane')
            if(aiContainer) aiContainer.style.display = ''
            if(quick) quick.style.display = ''
            if(aiSettingsPane) aiSettingsPane.style.display = aiSettingsPane.dataset.displayExpanded || 'flex'
            // optional: scroll into view
            try{ (quick || aiContainer)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }catch(e){}
          }
        }
      }catch(e){ console.warn('AI toggle wiring failed', e) }

      // --- Model selector wiring (load models per provider, persist per provider) ---
      try{
        const providerEl = document.getElementById('aiProviderSelect')
        const modelEl = document.getElementById('aiModelSelect')
        const langEl = document.getElementById('aiLangSelect')
        const providerFromSettings = localStorage.getItem('ai_provider') || ''
        if(providerEl && providerFromSettings) providerEl.value = providerFromSettings

        // language preference (modal-only)
        const langKey = 'ai_lang'
        const savedLang = localStorage.getItem(langKey) || 'id'
        if(langEl) langEl.value = savedLang
        if(langEl) langEl.addEventListener('change', ()=>{ localStorage.setItem(langKey, langEl.value || 'id') })

        const getKeyForProvider = (prov) => {
          try{
            const raw = localStorage.getItem('ai-settings')
            if(raw){
              const s = JSON.parse(raw)
              const k = s?.keys?.[prov]
              if(k) return String(k).trim()
            }
          }catch(e){}
          // fallback: legacy single-key storage
          return String(localStorage.getItem('ai_api_key') || '').trim()
        }

        const recommendedDefaults = {
          gemini: 'models/gemini-2.5-flash',
          openai: 'gpt-4o-mini',
          // per request: pin meta-llama model for OpenRouter at the top
          openrouter: 'meta-llama/llama-3-8b-instruct'
        }
        const lsKeyFor = (prov) => `ai_model_${prov}`

        const loadModels = async (prov) => {
          if(!modelEl) return
          modelEl.innerHTML = '<option value="">(auto)</option>'

          // pin recommended models at the top
          const pinned = {
            gemini: ['models/gemini-2.5-flash', 'models/gemini-2.5-flash-lite'],
            openai: ['gpt-4o-mini'],
            openrouter: ['meta-llama/llama-3-8b-instruct']
          }
          ;(pinned[prov] || []).forEach(v => {
            const opt = document.createElement('option')
            opt.value = v
            opt.textContent = `⭐ ${v}`
            modelEl.appendChild(opt)
          })

          // must have key; otherwise leave as auto
          const key = getKeyForProvider(prov)
          if(!key || !window.AI?.backendURL){
            const saved = localStorage.getItem(lsKeyFor(prov)) || recommendedDefaults[prov] || ''
            if(saved){
              const opt = document.createElement('option')
              opt.value = saved
              opt.textContent = saved
              modelEl.appendChild(opt)
              modelEl.value = saved
            }
            return
          }

          try{
            const res = await fetch(`${window.AI.backendURL}/ai/models?provider=${encodeURIComponent(prov)}&apiKey=${encodeURIComponent(key)}`)
            const json = await res.json()
            if(json?.error) throw new Error(json.error)
            const list = Array.isArray(json?.models) ? json.models : []
            const values = list.map(m => m?.name || m?.id).filter(Boolean)
            // append full list (dedupe against pinned)
            const pinnedSet = new Set((pinned[prov] || []).map(String))
            values.filter(v => !pinnedSet.has(String(v))).forEach(v=>{
              const opt = document.createElement('option')
              opt.value = v
              opt.textContent = v
              modelEl.appendChild(opt)
            })
          }catch(e){
            console.warn('loadModels failed', e)
          }

          const saved = localStorage.getItem(lsKeyFor(prov)) || ''
          const fallback = recommendedDefaults[prov] || ''
          const choose = saved || fallback
          if(choose) modelEl.value = choose
        }

        if(providerEl && modelEl){
          modelEl.onchange = () => {
            const prov = providerEl.value || 'gemini'
            localStorage.setItem(lsKeyFor(prov), modelEl.value || '')
          }
          providerEl.addEventListener('change', async () => {
            const prov = providerEl.value || 'gemini'
            await loadModels(prov)
          })
          await loadModels(providerEl.value || 'gemini')
        }
      }catch(e){ console.warn('model selector wiring failed', e) }

      // prepare keyword suggestions from TMDB keywords/genres
      const keywordSelect = document.getElementById('aiKeywordSelect')
      let kwList = []
      try{
        // normalisasi struktur keywords TMDB (array langsung, .keywords, atau .results)
        let keywordsArr = []
        if(data?.keywords){
          if(Array.isArray(data.keywords)) keywordsArr = data.keywords
          else if(Array.isArray(data.keywords.keywords)) keywordsArr = data.keywords.keywords
          else if(Array.isArray(data.keywords.results)) keywordsArr = data.keywords.results
        }
        kwList = keywordsArr.slice(0,8).map(k=>k.name).filter(Boolean)
      }catch(e){
        console.warn('TMDB keyword list build failed', e)
      }
      if(keywordSelect){
        keywordSelect.innerHTML = '<option value="">(auto)</option>' + kwList.map(k=>`<option value="${k}">${k}</option>`).join('')
      }

      // Quick suggestion chips + tone chips UI
      try{
        let quick = document.getElementById('aiQuickSuggestions')
        if(!quick){
          quick = document.createElement('div')
          quick.id = 'aiQuickSuggestions'
          // default hidden; will be shown when user clicks "Generate Content"
          quick.style.display = 'none'
          quick.style.margin = '8px 0 10px'
          quick.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <strong style="font-size:13px">Keyword suggestions</strong>
              <label style="font-size:13px;color:#9aa;display:flex;align-items:center;gap:6px;margin-left:8px"><input id="aiUseAISuggestions" type="checkbox"> Use AI</label>
              <button id="aiFetchSuggestionsBtn" style="margin-left:10px;padding:6px 8px;border-radius:6px">Fetch AI</button>
            </div>
            <div id="aiKeywordChips" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px"></div>
            <div style="margin-top:6px;font-size:13px;color:#9aa;margin-bottom:6px">Tone suggestions</div>
            <div id="aiToneChips" style="display:flex;flex-wrap:wrap;gap:8px"></div>
          `
          aiContainer.insertAdjacentElement('beforebegin', quick)
        }

        const keywordChipsEl = document.getElementById('aiKeywordChips')
        const toneChipsEl = document.getElementById('aiToneChips')

        function renderKeywordChips(list){
          if(!keywordChipsEl) return
          keywordChipsEl.innerHTML = ''
          list.forEach(k=>{
            const b = document.createElement('button')
            b.type = 'button'
            b.className = 'ai-chip'
            b.textContent = k
            b.style.padding = '6px 10px'
            b.style.borderRadius = '8px'
            b.style.background = 'transparent'
            b.style.border = '1px solid rgb(42, 40, 43)'
            b.style.color = '#fff'
            b.addEventListener('click', ()=>{
              // set dropdown and highlight
              if(keywordSelect){
                // pastikan option untuk keyword ini ada di dropdown
                const exists = Array.from(keywordSelect.options).some(o=>o.value===k)
                if(!exists){
                  const opt = document.createElement('option')
                  opt.value = k
                  opt.textContent = k
                  keywordSelect.appendChild(opt)
                }
                keywordSelect.value = k
              }
              document.querySelectorAll('#aiKeywordChips .ai-chip').forEach(x=>x.style.boxShadow='')
              b.style.boxShadow = '#009688 0px 0px 0px 2px inset'
            })
            keywordChipsEl.appendChild(b)
          })
        }

        const defaultTones = ['energetic','urgent','dramatic','suspenseful','humorous','emotional','friendly','formal']
        function renderToneChips(list){
          if(!toneChipsEl) return
          toneChipsEl.innerHTML = ''
          list.forEach(t=>{
            const b = document.createElement('button')
            b.type='button'
            b.className='ai-chip-tone'
            b.textContent = t
            b.style.padding='6px 10px'
            b.style.borderRadius='8px'
            b.style.background='transparent'
            b.style.border='1px solid rgb(42, 40, 43)'
            b.style.color='#fff'
            b.addEventListener('click', ()=>{
              const toneSelect = document.getElementById('aiToneSelect')
              if(toneSelect){
                const exists = Array.from(toneSelect.options).some(o=>o.value===t)
                if(!exists){
                  const opt = document.createElement('option')
                  opt.value = t
                  opt.textContent = t
                  toneSelect.appendChild(opt)
                }
                toneSelect.value = t
              }
              document.querySelectorAll('#aiToneChips .ai-chip-tone').forEach(x=>x.style.boxShadow='')
              b.style.boxShadow = 'rgb(0 142 255) 0px 0px 0px 2px inset'
            })
            toneChipsEl.appendChild(b)
          })
        }

        // initial render

        // initial render
        renderKeywordChips(kwList.length ? kwList : ['—'])
        renderToneChips(defaultTones)

        // store last AI suggestions (used only for visual reference)
        let lastAISuggestions = { keywords: [], tones: [] }

        // fetch suggestions (source = TMDB when checkbox off, or AI when checkbox on)
        async function fetchAISuggestions(){
          const prov = document.getElementById('aiProviderSelect')?.value || 'gemini'
          const model = document.getElementById('aiModelSelect')?.value || ''
          const lang = document.getElementById('aiLangSelect')?.value || 'id'
          const apiKey = (typeof getKeyForProvider === 'function') ? getKeyForProvider(prov) : (window.AI?.apiKey || '')
          const title = String(data?.title || data?.name || document.getElementById('modalTitle')?.textContent || '').trim()
          const overview = String(data?.overview || document.getElementById('modalOverview')?.textContent || '').trim()
          const genres = Array.isArray(data?.genres) ? data.genres.map(g=>g?.name).filter(Boolean).slice(0,5) : []
          const knownKeywords = Array.isArray(kwList) ? kwList.slice(0,8) : []

          const fetchBtn = document.getElementById('aiFetchSuggestionsBtn')
          const useAIChecked = document.getElementById('aiUseAISuggestions')?.checked
          // lightweight status label near the fetch button
          let statusEl = document.getElementById('aiSuggestionsStatus')
          if(!statusEl && fetchBtn && fetchBtn.parentNode){
            statusEl = document.createElement('span')
            statusEl.id = 'aiSuggestionsStatus'
            statusEl.style.fontSize = '12px'
            statusEl.style.color = '#9aa'
            statusEl.style.marginLeft = '8px'
            fetchBtn.parentNode.insertBefore(statusEl, fetchBtn.nextSibling)
          }

          const prompt = `
You are a helpful assistant for social content ideas about a movie/TV show.
Generate up to 8 short keyword phrases and up to 8 tone words.

Context:
Title: ${title || '(unknown)'}
Synopsis: ${overview || '(empty)'}
Genres: ${genres.join(', ') || '(unknown)'}
Known keywords: ${knownKeywords.join(', ') || '(none)'}

Language:
- If lang is "id": output words in Indonesian (except proper nouns). Use Indonesian tone words.
- If lang is "en": output words in English.
lang="${lang}"

Rules for keywords:
- Each keyword MUST be 1–3 words (max 3 words).
- No full sentences. No punctuation. No quotes.
- Must be relevant to the movie/show. Avoid generic words like "movie", "film", "series".
- Do not repeat keywords.

Rules for tones:
- Each tone MUST be 1 word (max 2 words if absolutely needed).
- Tone must be actionable (a clear writing style/energy), e.g. "suspenseful", "gritty", "playful".
- Do not repeat tones.

Return ONLY valid JSON in exactly this shape (no extra text):
{"keywords":["k1","k2"],"tones":["t1","t2"]}
          `.trim()

          try{
            if(fetchBtn){ fetchBtn.disabled = true; fetchBtn.textContent = 'Fetching…' }

            // Jika checkbox "Use AI suggestions" TIDAK dicentang,
            // gunakan saja kombinasi keywords TMDB + genres + default tones (tanpa call AI).
            if(!useAIChecked){
              const genreNames = (data?.genres || []).map(g=>g.name).filter(Boolean)
              const combinedKeywords = Array.from(new Set([
                ...kwList,
                ...genreNames
              ])).slice(0, 12)

              if(keywordSelect){
                keywordSelect.innerHTML = '<option value="">(auto)</option>' +
                  combinedKeywords.map(k=>`<option value="${k}">${k}</option>`).join('')
              }
              renderKeywordChips(combinedKeywords.length ? combinedKeywords : ['—'])
              renderToneChips(defaultTones)
              lastAISuggestions = { keywords: [], tones: [] }
              if(statusEl) statusEl.textContent = 'TMDB'
              return
            }

            // Jika checkbox dicentang → panggil AI untuk mendapatkan suggestions.
            if(statusEl) statusEl.textContent = 'Fetching AI…'

            let raw = null
            if(!window.AI?.backendURL) throw new Error('AI backendURL not set')
            if(!apiKey) throw new Error('AI API key is empty for selected provider (set it in Settings, then Save)')
            if(window.AI?.generate){ raw = await window.AI.generate({ provider: prov, apiKey, prompt, model }) }
            else throw new Error('No AI client available (window.AI.generate missing)')

            const text = String(raw || '')
            const banned = new Set(['—','-','n/a','na','none','null','undefined','unknown','no response','error'])
            const norm = (s) => String(s||'').trim().replace(/\s+/g,' ')
            const normKey = (s) => norm(s).toLowerCase()
            const cleanKeyword = (s) => {
              let x = norm(s)
              x = x.replace(/["'`]/g,'')
              x = x.replace(/[.,;:!?()[\]{}<>]/g,' ')
              x = x.replace(/\s+/g,' ').trim()
              if(!x) return ''
              const words = x.split(' ').filter(Boolean)
              if(words.length > 3) x = words.slice(0,3).join(' ')
              const lk = normKey(x)
              if(banned.has(lk)) return ''
              if(['movie','film','series','tv','episode'].includes(lk)) return ''
              return x
            }
            const cleanTone = (s) => {
              let x = norm(s)
              x = x.replace(/["'`]/g,'')
              x = x.replace(/[.,;:!?()[\]{}<>]/g,' ')
              x = x.replace(/\s+/g,' ').trim()
              if(!x) return ''
              const words = x.split(' ').filter(Boolean)
              if(words.length > 2) x = words.slice(0,2).join(' ')
              const lk = normKey(x)
              if(banned.has(lk)) return ''
              // avoid sentence-like tones
              if(lk.includes(' and ') || lk.includes(' or ') || lk.split(' ').length > 2) return ''
              return x
            }
            const dedupeLimit = (arr, cleaner, max) => {
              const out = []
              const seen = new Set()
              ;(arr||[]).forEach(v=>{
                const c = cleaner(v)
                if(!c) return
                const k = normKey(c)
                if(seen.has(k)) return
                seen.add(k)
                out.push(c)
              })
              return out.slice(0, max)
            }
            const m = text.match(/\{[\s\S]*\}/)
            if(m) {
              try {
                const parsed = JSON.parse(m[0])
                lastAISuggestions.keywords = Array.isArray(parsed.keywords) ? dedupeLimit(parsed.keywords, cleanKeyword, 8) : []
                lastAISuggestions.tones = Array.isArray(parsed.tones) ? dedupeLimit(parsed.tones, cleanTone, 8) : []
                if(lastAISuggestions.keywords.length) {
                  // isi dropdown + chips dari AI
                  if(keywordSelect){
                    keywordSelect.innerHTML = '<option value="">(auto)</option>' +
                      lastAISuggestions.keywords.map(k=>`<option value="${k}">${k}</option>`).join('')
                  }
                  renderKeywordChips(lastAISuggestions.keywords)
                }
                if(lastAISuggestions.tones.length) { renderToneChips(lastAISuggestions.tones) }
                if(statusEl) statusEl.textContent = 'AI'
                return
              } catch(e) {}
            }
            // fallback: re-prompt once forcing JSON only
            try{
              const reprompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no explanations. If you cannot, output {"keywords":[],"tones":[]} only.`.trim()
              const raw2 = await window.AI.generate({ provider: prov, apiKey, prompt: reprompt, model })
              const text2 = String(raw2 || '')
              const m2 = text2.match(/\{[\s\S]*\}/)
              if(m2){
                try{
                  const parsed2 = JSON.parse(m2[0])
                  lastAISuggestions.keywords = Array.isArray(parsed2.keywords) ? dedupeLimit(parsed2.keywords, cleanKeyword, 8) : []
                  lastAISuggestions.tones = Array.isArray(parsed2.tones) ? dedupeLimit(parsed2.tones, cleanTone, 8) : []
                  if(lastAISuggestions.keywords.length) {
                    if(keywordSelect){
                      keywordSelect.innerHTML = '<option value="">(auto)</option>' +
                        lastAISuggestions.keywords.map(k=>`<option value="${k}">${k}</option>`).join('')
                    }
                    renderKeywordChips(lastAISuggestions.keywords)
                  }
                  if(lastAISuggestions.tones.length) { renderToneChips(lastAISuggestions.tones) }
                  if(statusEl) statusEl.textContent = 'AI'
                  return
                }catch(e){}
              }
            }catch(e){ /* ignore reprompt failures */ }
            // fallback: simple split by newline or commas
            const lines = text.split(/\n|,/) .map(s=>s.trim()).filter(Boolean)
            if(lines.length) {
              lastAISuggestions.keywords = dedupeLimit(lines.slice(0,16), cleanKeyword, 8)
              if(keywordSelect){
                keywordSelect.innerHTML = '<option value="">(auto)</option>' +
                  lastAISuggestions.keywords.map(k=>`<option value="${k}">${k}</option>`).join('')
              }
              renderKeywordChips(lastAISuggestions.keywords)
            }
            renderToneChips(defaultTones)
            if(statusEl) statusEl.textContent = 'AI*'
          }catch(err){
            console.warn('AI suggestions fetch failed', err)
            if(statusEl) statusEl.textContent = `Error: ${err?.message || err}`
          } finally {
            if(fetchBtn){ fetchBtn.disabled = false; fetchBtn.textContent = 'Fetch AI suggestions' }
          }
        }

        const fetchBtn = document.getElementById('aiFetchSuggestionsBtn')
        if(fetchBtn) fetchBtn.addEventListener('click', fetchAISuggestions)

        // ensure the 'Use AI suggestions' checkbox exists and is visible near the Fetch button
        try{
          let useCheckbox = document.getElementById('aiUseAISuggestions')
          if(!useCheckbox){
            // create checkbox and label and insert before fetchBtn
            const label = document.createElement('label')
            label.style.fontSize = '13px'
            label.style.color = '#9aa'
            label.style.display = 'flex'
            label.style.alignItems = 'center'
            label.style.gap = '6px'
            label.style.marginLeft = '8px'
            useCheckbox = document.createElement('input')
            useCheckbox.type = 'checkbox'
            useCheckbox.id = 'aiUseAISuggestions'
            label.appendChild(useCheckbox)
            label.appendChild(document.createTextNode('Use AI suggestions'))
            if(fetchBtn && fetchBtn.parentNode){ fetchBtn.parentNode.insertBefore(label, fetchBtn) }
          }
        }catch(e){ console.warn('ensure useAI checkbox failed', e) }

      }catch(e){ console.warn('quick suggestions UI failed', e) }


        async function generateForSelection(){
        const prov = document.getElementById('aiProviderSelect')?.value || 'gemini'
        const model = document.getElementById('aiModelSelect')?.value || ''
        const lang = document.getElementById('aiLangSelect')?.value || 'id'
        const apiKey = (typeof getKeyForProvider === 'function') ? getKeyForProvider(prov) : (window.AI?.apiKey || '')
        const platform = document.getElementById('aiPlatformSelect')?.value || 'youtube'
        const chosenKeyword = document.getElementById('aiKeywordSelect')?.value || ''
        const tone = document.getElementById('aiToneSelect')?.value || 'neutral'
        const mediaId = md?.getAttribute('data-media-id')
        const mediaType = md?.getAttribute('data-media-type') || window.appState.mediaType || 'movie'
        const title = document.getElementById('modalTitle')?.textContent || ''
        const overview = document.getElementById('modalOverview')?.textContent || ''
        const genres = (data?.genres||[]).map(g=>g.name).filter(Boolean).slice(0,4)
        const cast = (data?.credits?.cast || []).slice(0,6).map(c=>`${c.name}${c.character?` as ${c.character}`:''}`)

        const titleEl = document.getElementById('aiTitle')
        const descEl = document.getElementById('aiDescription')
        const tagsEl = document.getElementById('aiHashtags')
        if(titleEl) titleEl.textContent = 'Generating…'
        if(descEl) descEl.textContent = 'Generating…'
        if(tagsEl) tagsEl.textContent = ''

        // tailor prompt per platform and tone
        const platformInstructions = {
          youtube: [
            'YouTube Shorts rules:',
            '- Title <= 60 chars, hooky.',
            '- Description 1–2 short sentences + CTA (watch/follow).',
            '- Hashtags: 6–10, adventurous/trending, mix broad + niche, avoid duplicates.'
          ].join('\n'),
          tiktok: [
            'TikTok rules:',
            '- Title <= 70 chars, punchy.',
            '- Description 1–2 short lines, conversational, can include 1–2 emojis.',
            '- Hashtags: 8–15, adventurous/trending, mix broad + niche.'
          ].join('\n'),
          instagram: [
            'Instagram Reels rules:',
            '- Title <= 70 chars.',
            '- Description 2–3 lines, energetic, 2–4 emojis allowed.',
            '- Hashtags: 12–25, adventurous, include 2–4 branded-style tags (but not real brands), mix broad + niche.'
          ].join('\n'),
          facebook: [
            'Facebook post rules:',
            '- Title <= 80 chars.',
            '- Description 2–4 sentences with context + engagement question.',
            '- Hashtags: 3–8, adventurous but not spammy.'
          ].join('\n'),
          x: [
            'X (Twitter) rules:',
            '- Title <= 70 chars.',
            '- Description must fit in a single tweet (<= 240 chars).',
            '- Keep it sharp, no more than 1 emoji.',
            '- Hashtags: 1–3 only, adventurous/trending, no duplicates.'
          ].join('\n')
        }

        const prompt = `
You are a creative social copywriter.
Platform: ${platform}.
Write in ${lang === 'id' ? 'Indonesian' : 'English'}.

Context:
- Title: "${title}"
- Overview: "${overview}"
- Genres: ${genres.join(', ') || '—'}
- Cast: ${cast.join('; ') || '—'}
- Keyword focus: ${chosenKeyword||'none'}
- Tone: ${tone}

${platformInstructions[platform] || ''}

Virality / FYP rules:
- Start description with a hook in the first 6–10 words (curiosity, question, or bold claim).
- Add a clear CTA suited to the platform (follow/like/comment/save).
- Hashtags must be relevant and adventurous: mix broad + niche + trend-style tags; no duplicates; avoid banned tags.

Output JSON only:
{"title":"...","description":"...","hashtags":["#..","#.."]}
Return only the JSON.
        `.trim()

        const extractJson = (txt) => {
          const m = String(txt||'').match(/\{[\s\S]*\}/)
          if(!m) return null
          try{ return JSON.parse(m[0]) }catch(e){ return null }
        }
        const forceJsonPrompt = (basePrompt) => {
          return `${basePrompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no explanations. If you cannot, output {"title":"","description":"","hashtags":[]} only.`.trim()
        }

        try{
          let raw = null
          if(!apiKey) throw new Error('AI API key is empty for selected provider (set it in Settings, then Save)')
          if(window.AI?.generateSocial){ raw = await window.AI.generateSocial({ provider: prov, apiKey, mediaId, mediaType, platform, prompt, model }) }
          else if(window.AI?.generate){ raw = await window.AI.generate({ provider: prov, apiKey, prompt, platform, mediaId, mediaType, model }) }
          else if(window.AI?.summarize){ raw = await window.AI.summarize({ provider: prov, movieId: mediaId, title, overview, prompt }) }
          else throw new Error('No AI client available (window.AI)')

          const text = String(raw || '')
          let parsed = extractJson(text)
          // fallback: re-prompt once if output is not JSON
          if(!parsed){
            try{
              const reprompt = forceJsonPrompt(prompt)
              const raw2 = await window.AI.generate({ provider: prov, apiKey, prompt: reprompt, model })
              parsed = extractJson(raw2)
            }catch(e){ /* ignore */ }
          }
          if(!parsed){ if(descEl) descEl.textContent = text || 'No result.'; if(titleEl) titleEl.textContent = ''; return }
          if(titleEl) titleEl.textContent = parsed.title || ''
          if(descEl) descEl.textContent = parsed.description || ''
          if(tagsEl) tagsEl.textContent = Array.isArray(parsed.hashtags) ? parsed.hashtags.join(' ') : (parsed.hashtags || '')
        }catch(err){ console.error('AI generation failed', err); if(titleEl) titleEl.textContent = 'Error'; if(descEl) descEl.textContent = 'AI generation failed. See console.' }
      }

      const genBtn = document.getElementById('aiGenerateBtn')
      if(genBtn) genBtn.addEventListener('click', generateForSelection)
    }catch(e){ console.warn('AI UI render failed', e) }

    // wire copy buttons for results
    try{
      const copyText = async (text) => { if(!text) return; try{ await navigator.clipboard.writeText(text); return true }catch(e){ try{ const ta = document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); return true }catch(e2){ return false } } }
      const copyTitleBtn = document.getElementById('aiCopyTitle')
      const copyDescBtn = document.getElementById('aiCopyDescription')
      const copyTagsBtn = document.getElementById('aiCopyHashtags')
      if(copyTitleBtn) copyTitleBtn.addEventListener('click', async ()=>{ const t = document.getElementById('aiTitle')?.textContent || ''; const ok = await copyText(t); copyTitleBtn.textContent = ok ? 'Copied' : 'Copy'; setTimeout(()=>copyTitleBtn.textContent='Copy',1200) })
      if(copyDescBtn) copyDescBtn.addEventListener('click', async ()=>{ const t = document.getElementById('aiDescription')?.textContent || ''; const ok = await copyText(t); copyDescBtn.textContent = ok ? 'Copied' : 'Copy'; setTimeout(()=>copyDescBtn.textContent='Copy',1200) })
      if(copyTagsBtn) copyTagsBtn.addEventListener('click', async ()=>{ const t = document.getElementById('aiHashtags')?.textContent || ''; const ok = await copyText(t); copyTagsBtn.textContent = ok ? 'Copied' : 'Copy'; setTimeout(()=>copyTagsBtn.textContent='Copy',1200) })
    }catch(e){ console.warn('copy buttons wiring failed', e) }

  }catch(err){
    console.error('openModal error', err)
    const overviewEl2 = document.getElementById('modalOverview')
    if(overviewEl2) overviewEl2.textContent = '❌ Failed to load details.'
  }
}

function closeModal(){
  const modal = document.getElementById('modal')
  if(modal) modal.style.display = 'none'
  // remove item query param (pattern used: ?=id-slug) without adding a history entry
  try{
    if(window.location.search && window.location.search.startsWith('?=')){
      history.replaceState(null, '', window.location.pathname)
    }
  }catch(e){ /* ignore */ }
}

// Close modal when clicking backdrop or elements with data-action="close-modal"; Esc to close
document.addEventListener('click', (ev)=>{
  try{
    const modal = document.getElementById('modal')
    if(!modal) return
    const target = ev.target
    if(target === modal || target.closest('[data-action="close-modal"]')){
      closeModal()
    }
  }catch(e){}
})

document.addEventListener('keydown', (ev)=>{
  if(ev.key === 'Escape'){
    const modal = document.getElementById('modal')
    if(modal && modal.style.display !== 'none') closeModal()
  }
})

// Ensure explicit close button (id="closeModal") calls closeModal when clicked
document.addEventListener('DOMContentLoaded', ()=>{
  const btn = document.getElementById('closeModal')
  if(btn) btn.addEventListener('click', closeModal)
})

// If URL contains ?=id-slug open modal for that id
function checkUrlForModal(){
  try{
    const qs = window.location.search
    if(qs && qs.startsWith('?=')){
      const raw = qs.slice(2)
      const id = parseInt(raw.split('-')[0], 10)
      if(!isNaN(id)) openModal(id)
    }
  }catch(e){ console.error('checkUrlForModal', e) }
}

// handle back/forward navigation
window.addEventListener('popstate', ()=>{ checkUrlForModal() })

// AI generate using backend proxy via window.AI.summarize
async function generateAIContent(){
  const md = document.getElementById('modalDetails')
  const id = md?.getAttribute('data-media-id')
  const mediaType = md?.getAttribute('data-media-type')
  if(!id || !mediaType) { alert('No media selected'); return }
  const title = document.getElementById('modalTitle')?.textContent || ''
  const overview = document.getElementById('modalOverview')?.textContent || ''
  try{
    const text = await window.AI.summarize({ movieId: id, title, overview })
    // expect JSON in result; attempt to extract JSON object
    const jsonMatch = String(text).match(/\{[\s\S]*\}/)
    if(!jsonMatch) throw new Error('Invalid AI output')
    const parsed = JSON.parse(jsonMatch[0])
    document.getElementById('aiTitle').textContent = parsed.title || '-'
    document.getElementById('aiDescription').textContent = parsed.description || '-'
    document.getElementById('aiHashtags').textContent = Array.isArray(parsed.hashtags) ? parsed.hashtags.map(h=>`#${h}`).join(' ') : '-'
    document.getElementById('aiResult').style.display = 'block'
  }catch(err){ console.error('AI generate error', err); alert('AI generate failed. See console.') }
}

// expose handlers used by inline attributes
window.handleItemClick = function(e,id,title){ try{ const slug = String(title||'').toLowerCase().trim().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-'); history.pushState(null,'', window.location.pathname + `?=${id}-${slug}`) }catch(e){}; openModal(id) }

// --- Gallery (based on original.html implementation) ---
// openGallery supports two modes:
//  - called with no args or a number: uses window._currentGallery (objects)
//  - called with an array of URL strings as first argument: will convert to gallery objects
function openGallery(arg, startIndex = 0){
  try{
    // normalize to window._currentGallery array of objects { original, medium, thumb, download }
    if(Array.isArray(arg) && typeof arg[0] === 'string'){
      window._currentGallery = arg.map(u => ({ original: u, medium: u, thumb: u, download: u }))
      window._currentGalleryType = 'posters'
      window._currentGalleryIndex = startIndex || 0
    } else if(typeof arg === 'number'){
      window._currentGalleryIndex = arg || 0
    } else {
      window._currentGalleryIndex = startIndex || window._currentGalleryIndex || 0
    }

    const gallery = window._currentGallery || []
    if(!gallery.length) return

    const overlay = document.getElementById('galleryOverlay')
    const gridPosters = document.getElementById('galleryGrid')
    const gridBackdrops = document.getElementById('galleryGridBackdrop')
    const galleryType = window._currentGalleryType || 'posters'
    if(!overlay) return

    overlay.style.display = 'flex'

    // choose which grid to use and show/hide appropriately
    let grid
    if(galleryType === 'backdrops'){
      if(gridPosters){ gridPosters.style.display = 'none'; gridPosters.innerHTML = '' }
      if(gridBackdrops){ gridBackdrops.style.display = 'grid'; gridBackdrops.innerHTML = '' }
      grid = gridBackdrops || gridPosters
    } else {
      if(gridBackdrops){ gridBackdrops.style.display = 'none'; gridBackdrops.innerHTML = '' }
      if(gridPosters){ gridPosters.style.display = 'grid'; gridPosters.innerHTML = '' }
      grid = gridPosters || gridBackdrops
    }

    // populate grid with cards and lazy-load placeholders
    const placeholder = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
    gallery.forEach((g, i)=>{
      const card = document.createElement('div')
      card.className = (galleryType === 'backdrops') ? 'gallery-backdrop-card' : 'gallery-card'

      const img = document.createElement('img')
      const realUrl = g.thumb || g.medium || g.original || ''
      if(realUrl) img.dataset.src = realUrl
      img.src = placeholder
      img.alt = `${galleryType === 'backdrops' ? 'Backdrop' : 'Poster'} ${i+1}`
      img.loading = 'lazy'
      img.decoding = 'async'
      img.style.cursor = realUrl ? 'zoom-in' : 'default'

      // click opens high-res in new tab
      img.onclick = (e) => {
        e.stopPropagation()
        const openUrl = g.original || g.medium || g.thumb || ''
        if(openUrl) window.open(openUrl, '_blank')
      }

      // download button
      const downloadUrl = g.download || g.original || g.medium || g.thumb || ''
      const dlBtn = document.createElement('button')
      dlBtn.className = 'gallery-download-btn'
      dlBtn.type = 'button'
      dlBtn.title = galleryType === 'backdrops' ? 'Download high-res (w1280)' : 'Download high-res (w780)'
      dlBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
            <path stroke-dasharray="32" d="M12 21c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="32;0"></animate></path>
            <path stroke-dasharray="2 4" stroke-dashoffset="6" d="M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9" opacity="0"><set fill="freeze" attributeName="opacity" begin="0.45s" to="1"></set><animateTransform fill="freeze" attributeName="transform" begin="0.45s" dur="0.6s" type="rotate" values="-180 12 12;0 12 12"></animateTransform><animate attributeName="stroke-dashoffset" begin="0.85s" dur="0.6s" repeatCount="indefinite" to="0"></animate></path>
            <path stroke-dasharray="10" stroke-dashoffset="10" d="M12 8v7.5"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.85s" dur="0.2s" to="0"></animate></path>
            <path stroke-dasharray="8" stroke-dashoffset="8" d="M12 15.5l3.5 -3.5M12 15.5l-3.5 -3.5"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1.05s" dur="0.2s" to="0"></animate></path>
          </g>
        </svg>`
      dlBtn.style.cursor = downloadUrl ? 'pointer' : 'default'
      dlBtn.onclick = (ev) => { ev.stopPropagation(); ev.preventDefault(); if(!downloadUrl) return; const baseTitle = document.getElementById('modalTitle')?.textContent || ''; const suffix = galleryType === 'backdrops' ? 'backdrop' : 'poster'; downloadHighRes(downloadUrl, baseTitle, suffix) }

      const meta = document.createElement('div')
      meta.className = 'card-meta'
      meta.textContent = `${galleryType === 'backdrops' ? 'Backdrop' : 'Poster'} ${i+1}`

      card.appendChild(img)
      card.appendChild(dlBtn)
      card.appendChild(meta)
      if(grid) grid.appendChild(card)
    })

    // setup IntersectionObserver to lazy-load images
    try{
      if(window._galleryObserver){ try{ window._galleryObserver.disconnect() }catch(e){} }
      const rootEl = document.getElementById('galleryInner')
      const imgs = grid ? grid.querySelectorAll('img[data-src]') : []
      const obs = new IntersectionObserver((entries, observer)=>{
        entries.forEach(ent=>{
          if(ent.isIntersecting){
            const el = ent.target
            if(el.dataset && el.dataset.src){ el.src = el.dataset.src; el.removeAttribute('data-src') }
            observer.unobserve(el)
          }
        })
      }, { root: rootEl, rootMargin: '200px', threshold: 0.01 })
      imgs.forEach(iimg=>obs.observe(iimg))
      window._galleryObserver = obs
    }catch(e){ console.warn('gallery lazy observer failed', e) }

    // Accessibility + visible class
    overlay.classList.add('gallery-visible')
    overlay.removeAttribute('aria-hidden')
    // ensure gallery starts at top and first card is visible
    try{
      const inner = document.getElementById('galleryInner')
      if(inner) inner.scrollTop = 0
      const firstCard = (grid) ? (grid.querySelector('.gallery-card') || grid.querySelector('.gallery-backdrop-card')) : null
      if(firstCard && firstCard.scrollIntoView) {
        // delay a bit to allow images/layout to settle, then ensure first card is top-left
        setTimeout(()=>{
          try{ firstCard.scrollIntoView({ behavior: 'auto', block: 'start', inline: 'start' }) }catch(e){}
          try{ if(inner) inner.scrollLeft = 0 }catch(e){}
        }, 120)
      }
    }catch(e){}
  }catch(err){ console.error('openGallery error', err) }
}
window.openGallery = openGallery

function closeGallery(){
  const overlay = document.getElementById('galleryOverlay')
  if(!overlay) return
  overlay.style.display = 'none'
  try{ const g1 = document.getElementById('galleryGrid'); if(g1) g1.innerHTML = '' }catch(e){}
  try{ const g2 = document.getElementById('galleryGridBackdrop'); if(g2) g2.innerHTML = '' }catch(e){}
  try{ if(window._galleryObserver){ window._galleryObserver.disconnect(); window._galleryObserver = null } }catch(e){}
}
window.closeGallery = closeGallery

async function downloadHighRes(url, baseTitle, suffix){
  window._downloadNameCounts = window._downloadNameCounts || {}
  const base = (typeof baseTitle === 'string' && baseTitle.trim()) ? String(baseTitle).trim().replace(/[^a-z0-9-]/gi, '_') : ''
  const safeSuggested = base ? `${base}_${suffix||'image'}` : (suffix||'image')
  const ext = 'jpg'
  const key = `${safeSuggested}.${ext}`
  const count = window._downloadNameCounts[key] ? window._downloadNameCounts[key] + 1 : 1
  window._downloadNameCounts[key] = count
  const filename = count === 1 ? `${safeSuggested}.${ext}` : `${safeSuggested}_${count}.${ext}`
  try{
    const res = await fetch(url, { mode: 'cors' })
    if(!res.ok) throw new Error('Network response was not ok')
    const blob = await res.blob()
    const a = document.createElement('a')
    const objectUrl = URL.createObjectURL(blob)
    a.href = objectUrl; a.download = filename; document.body.appendChild(a); a.click(); a.remove()
    setTimeout(()=>URL.revokeObjectURL(objectUrl), 1000)
  }catch(err){ console.error('Download failed', err); try{ window.open(url, '_blank') }catch(e){} }
}

function galleryPrev(){ const g = window._currentGallery || []; if(!g.length) return; window._currentGalleryIndex = (window._currentGalleryIndex - 1 + g.length) % g.length; updateGalleryImage() }
function galleryNext(){ const g = window._currentGallery || []; if(!g.length) return; window._currentGalleryIndex = (window._currentGalleryIndex + 1) % g.length; updateGalleryImage() }
function updateGalleryImage(){ const g = window._currentGallery || []; if(!g.length) return; const idx = Math.max(0, Math.min(window._currentGalleryIndex||0, g.length-1)); window._currentGalleryIndex = idx; const img = document.getElementById('galleryImage'); if(img) img.src = g[idx].original || g[idx].medium || g[idx].thumb || ''; const thumbs = document.querySelectorAll('.gallery-thumb'); thumbs.forEach((t,i)=> t.classList.toggle('active', i===idx)) }

// Wire gallery close handlers and poster/backdrop clicks to open gallery
document.addEventListener('DOMContentLoaded', ()=>{
  const overlay = document.getElementById('galleryOverlay')
  const closeBtn = document.getElementById('galleryClose')
  if(closeBtn) closeBtn.addEventListener('click', ()=>{ closeGallery() })
  if(overlay) overlay.addEventListener('click', (ev)=>{ if(ev.target === overlay) closeGallery() })
  document.addEventListener('keydown', (ev)=>{ if(ev.key === 'Escape'){ const o = document.getElementById('galleryOverlay'); if(o && getComputedStyle(o).display==='flex'){ closeGallery() } } })

  const modalPoster = document.getElementById('modalPoster')
  const modalBackdropImage = document.getElementById('modalBackdropImage')
  function attachClick(el, preferType){ if(!el) return; el.style.cursor='pointer'; el.addEventListener('click', async ()=>{
    const md = document.getElementById('modalDetails'); const id = md?.getAttribute('data-media-id'); const mediaType = md?.getAttribute('data-media-type') || 'movie'; if(!id) return; let data = null; try{ data = await window.TMDB.getDetails(mediaType, id) }catch(e){ return }
    let postersArr = (data?.images?.posters || [])
    let backdropsArr = (data?.images?.backdrops || [])
    if((!postersArr.length && !backdropsArr.length)){
      try{ const url = `${window.TMDB.base}/${mediaType}/${id}/images?api_key=${window.TMDB.apiKey}`; const res = await fetch(url); if(res.ok){ const json = await res.json(); postersArr = json.posters || postersArr; backdropsArr = json.backdrops || backdropsArr } }
      catch(err){ console.warn('attachClick: images fallback fetch error', err) }
    }
    const posters = (postersArr||[]).map(p=>({ original: p.file_path?window.TMDB.imageUrl(p.file_path,'w1280'): '', download: p.file_path?window.TMDB.imageUrl(p.file_path,'w780'): '', medium: p.file_path?window.TMDB.imageUrl(p.file_path,'w500'): '', thumb: p.file_path?window.TMDB.imageUrl(p.file_path,'w300'): '' })).filter(x=>x.original||x.medium||x.thumb||x.download)
    const backdrops = (backdropsArr||[]).map(b=>({ original: b.file_path?window.TMDB.imageUrl(b.file_path,'w1280'):'', download: b.file_path?window.TMDB.imageUrl(b.file_path,'w1280'):'', medium: b.file_path?window.TMDB.imageUrl(b.file_path,'w500'):'', thumb: b.file_path?window.TMDB.imageUrl(b.file_path,'w300'):'' })).filter(x=>x.original||x.medium||x.thumb||x.download)
    // choose based on preferType: if preferType indicates backdrop, prefer backdrops first
    const preferBackdrops = String(preferType || '').toLowerCase().includes('backdrop')
    if(preferBackdrops){
      if(backdrops.length){ window._currentGallery = backdrops; window._currentGalleryType='backdrops'; window._currentGalleryIndex = 0; openGallery(0); }
      else if(posters.length){ window._currentGallery = posters; window._currentGalleryType='posters'; window._currentGalleryIndex = 0; openGallery(0); }
    } else {
      if(posters.length){ window._currentGallery = posters; window._currentGalleryType='posters'; window._currentGalleryIndex = 0; openGallery(0); }
      else if(backdrops.length){ window._currentGallery = backdrops; window._currentGalleryType='backdrops'; window._currentGalleryIndex = 0; openGallery(0); }
    }
  }) }
    attachClick(modalPoster, 'poster')
    attachClick(modalBackdropImage, 'backdrop')
})