const apiKey = 'b2b355392c45da4dad92e5cac927bab4';

/* ---------------------------------------------- /*
        Preloader page
/* ---------------------------------------------- */

(function () {
    $(window).on("load", function () {
      $(".loader").fadeOut();
      $(".page-loader").delay(1000).fadeOut("slow");
    });
    $(document).ready(function () {});
  })(jQuery);
