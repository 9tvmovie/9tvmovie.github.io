const apiKey = 'b2b355392c45da4dad92e5cac927bab4';
const authorization = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2YTcwYTMwYjk1ODE5Y2IzMjA3ZTUxZjE4ZGFiNDgzNCIsInN1YiI6IjYxY2YxOTEyYWY2ZTk0MDA5ODQ3OGRkZSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.pNjePjoP03wPNnH-lYvGa9Uqn0g6WIm1WzQXaOY3Vj8';
/* ---------------------------------------------- /*
        Preloader page
/* ---------------------------------------------- */

(function () {
    $(window).on("load", function () {
      $(".loader").fadeOut();
      $(".page-loader").delay(5000).fadeOut("slow");
    });
    $(document).ready(function () {});
  })(jQuery);
