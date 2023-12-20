const type = ''; // Initialize the type variable
      
        // Function to create HTML elements for movie cards
        const createMovieCard = (movie) => {
            const roundedVoteAverage = movie.vote_average ? movie.vote_average.toFixed(1) : 'n/a';
          const posterPath = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
          const title = movie.title;
          const titleOri = movie.original_title;
          const releaseDate = movie.release_date;
          const mtYear = releaseDate ? new Date(releaseDate).getFullYear() : '';
      
          return `
          <div class="col-md-2 mb-4 resPost">
            <div class="card position-relative">
                <div style="cursor:pointer;" class="overlay" onclick="redirectToMoviePage('${movie.id}', '${movie.title}')">
                <i class="fas fa-play-circle play-icon"></i>
              </div>
              <div class="rang"><i class="fa-solid fa-star"></i>${roundedVoteAverage}</div>
              <div class="rang-right">HD</div>
              <img src="${posterPath}" class="card-img-top posterPath" alt="${title} ${titleOri}">
              <div class="card-body">
                <h5 class="card-title">${title}<span class='yearS'>${mtYear}</span></h5>
                <p class="card-text">${releaseDate}</p>
              </div>
            </div>
            </div>`;
        };
      
        // Function to append movie cards to the specified target element
        const appendMovieCards = (movies, targetElement) => {
          const movieList = $(targetElement);
          movieList.empty(); // Clear previous content
      
          movies.forEach((movie) => {
            const movieCardHtml = createMovieCard(movie);
            movieList.append(movieCardHtml);
          });
        };


  // Function to get movie data from TMDB
  const getMovieData = (url, targetElement) => {
    const settings = {
      async: true,
      crossDomain: true,
      url: url,
      method: 'GET',
      headers: {
        accept: 'application/json',
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2YTcwYTMwYjk1ODE5Y2IzMjA3ZTUxZjE4ZGFiNDgzNCIsInN1YiI6IjYxY2YxOTEyYWY2ZTk0MDA5ODQ3OGRkZSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.pNjePjoP03wPNnH-lYvGa9Uqn0g6WIm1WzQXaOY3Vj8'
      }
    };

    // Load movie data when the document is ready
    $(document).ready(function() {
      $.ajax(settings).done(function (response) {
        console.log(response);

        // Display movie data on the page
        if (response.results && response.results.length > 0) {
          appendMovieCards(response.results, targetElement);
        } else {
          console.log('No movie data found.');
        }
      });
    });
  };

  // Check if the page is /movie/?trending
  if (window.location.pathname === '/movie/lists/trending.html') {
    // Call getMovieData function for trending movies
    getMovieData('https://api.themoviedb.org/3/trending/movie/day?language=en-US', '#movieTrending');
  }

  // Check if the page is /movie/?popular
  if (window.location.pathname === '/movie/lists/nowplay.html') {
    // Call getMovieData function for popular movies
    getMovieData('https://api.themoviedb.org/3/movie/now_playing?language=en-US', '#movieNowPlay');
  }

  // Check if the page is /movie/?popular
  if (window.location.pathname === '/movie/lists/popular.html') {
    // Call getMovieData function for popular movies
    getMovieData('https://api.themoviedb.org/3/movie/popular?language=en-US', '#moviePopular');
  }

  // Check if the page is /movie/?popular
  if (window.location.pathname === '/movie/lists/upcoming.html') {
    // Call getMovieData function for popular movies
    getMovieData('https://api.themoviedb.org/3/movie/upcoming?language=en-US', '#movieUpComing');
  }

  // Call appendMovieCards function for trending movies
appendMovieCards(response.results, '#movieTrending', 'trending');
appendMovieCards(response.results, '#movieNowPlay', 'nowplay');
appendMovieCards(response.results, '#moviePopular', 'popular');
appendMovieCards(response.results, '#movieUpComing', 'upcoming');



// Redirect MOVIE ELEMENT
fetchTvGenres();

function redirectToMoviePage(movieId, title) {
  const formattedTitle = title.replace(/\s+/g, '-').replace(/:/g, '').toLowerCase();
const moviePageUrl = `https://www.ninetvmovie.online/p/movie.html?id=${movieId}/${formattedTitle}`;

      window.open(moviePageUrl, '_blank');
    }
