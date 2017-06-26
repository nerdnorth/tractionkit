(function( $ ) {
  'use strict';

  var $this;
  var completable_list;
  
  $(function() {
    // add click event handlers for plugin completion buttons...
    $('body').on('click', 'a.wpc-button-complete', function(e) {
      e.preventDefault();
      $this = $(this);
      var button_id = $(this).data('button');
      var data = {
        _ajax_nonce: wpcompletable.nonce,
        action: 'mark_completed',
        button: button_id
      }

      // change button to disable and indicate saving...
      $this.attr('disabled', 'disabled').find('span').toggle();
      $.ajax({
        url: wpcompletable.ajax_url,
        type: 'POST',
        dataType: 'json',
        data: data,
        success: wpc_handleResponse,
        error: function(xhr, textStatus, errorThrown) {
          $this.attr('disabled', false).html('Error');
          alert("Uh oh! We ran into an error marking the button as completed.");
          console.log(textStatus);
          console.log(errorThrown);
        }
      });
      return false;
    });
    $('body').on('click', 'a.wpc-button-completed', function(e) {
      e.preventDefault();
      $this = $(this);
      var button_id = $(this).data('button');
      var data = {
        _ajax_nonce: wpcompletable.nonce,
        action: 'mark_uncompleted',
        button: button_id
      }

      // change button to disable and indicate saving...
      $this.attr('disabled', 'disabled').find('span').toggle();
      $.ajax({
        url: wpcompletable.ajax_url,
        type: 'POST',
        dataType: 'json',
        data: data,
        success: wpc_handleResponse,
        error: function(xhr, textStatus, errorThrown) {
          $this.attr('disabled', false).html('Error');
          alert("Uh oh! We ran into an error marking the button as no longer complete.");
          console.log(textStatus);
          console.log(errorThrown);
        }
      });
      return false;
    });

    // PREMIUM:
    // If we already have completable-list stored, no use hitting server:
    if ( localStorage && localStorage.getItem('wpcomplete.completable-list') ) {
      completable_list = JSON.parse(localStorage.getItem('wpcomplete.completable-list'));
      wpc_appendLinkClasses(completable_list);
    } else {
      // Do ajax call to backend to get a list of ALL the completable lessons.
      // Then filter through each link on the page and add specific classes to completed and incomplete links.
      $.ajax({
        url: wpcompletable.ajax_url,
        type: 'POST',
        dataType: 'json',
        data: {
          _ajax_nonce: wpcompletable.nonce,
          action: 'get_completable_list'
        },
        success: function(response) {
          if ( localStorage ) { localStorage.setItem("wpcomplete.completable-list", JSON.stringify(response)); }
          completable_list = response;
          //console.log(response);
          wpc_appendLinkClasses(response);
          // This is for pages that have delayed loading of links that might need marking completion:
          var counter = 0;
          var interval = setInterval(function() {
            wpc_appendLinkClasses(response);
            if (counter >= 5) {
              clearInterval(interval);
            }
            counter++;
          }, 1000);
        },
        error: function(xhr, textStatus, errorThrown) {
          console.log(textStatus);
          console.log(errorThrown);
        }
      });
    }
  });

  jQuery( document.body ).on( 'post-load', function() {
    wpc_appendLinkClasses(completable_list);
  });

  function wpc_appendLinkClasses(response) {
    $('a[href]:not(.wpc-lesson)').each(function() {
      var found_link = false;
      if (response[$(this).attr('href')] !== undefined) {
        found_link = response[$(this).attr('href')];
      } else if (response[$(this).attr('href') + '/'] !== undefined) {
        found_link = response[$(this).attr('href') + '/'];        
      } else if (response[$(this).attr('href').replace(/\/$/, "")]) {
        found_link = response[$(this).attr('href').replace(/\/$/, "")];
      }

      if (found_link && !$(this).hasClass('wpc-lesson')) {
        $(this).addClass('wpc-lesson');
        if (found_link['id']) {
          $(this).addClass('wpc-lesson-' + found_link['id']);
        }
        if (found_link['status'] == 'incomplete') {
          $(this).addClass('wpc-lesson-complete');
        } else {
          $(this).addClass('wpc-lesson-' + found_link['status']);
        }
      }
    });
  }

  function wpc_handleResponse(response) {
    for (var x in response) {
      if (''+x == 'redirect') {
        window.location.href = response[x];
      } else if (''+x == 'lesson-completed') {
        $('a.wpc-lesson-' + response[x]).addClass('wpc-lesson-completed');
        $('a.wpc-lesson-' + response[x]).removeClass('wpc-lesson-complete').removeClass('wpc-lesson-partial');
      } else if (''+x == 'lesson-partial') {
        $('a.wpc-lesson-' + response[x]).addClass('wpc-lesson-partial');
        $('a.wpc-lesson-' + response[x]).removeClass('wpc-lesson-completed').removeClass('wpc-lesson-complete');
      } else if (''+x == 'lesson-incomplete') {
        $('a.wpc-lesson-' + response[x]).addClass('wpc-lesson-complete');
        $('a.wpc-lesson-' + response[x]).removeClass('wpc-lesson-completed').removeClass('wpc-lesson-partial');
      } else if (''+x == 'show-content') {
        $(response[x]).show();
      } else if (''+x == 'hide-content') {
        $(response[x]).hide();
      } else if (''+x.indexOf('.wpc-button[data') == 0) {
        $(''+x).replaceWith(response[x]);
      } else if (''+x.indexOf('[data-') >= 0) {
        var d = x.substring(x.indexOf('[data-')+1, x.indexOf(']'));
        $(''+x).attr(d, response[x]);
      } else if (''+x.indexOf('data-') == 0) {
        $('['+x+']').attr(''+x, response[x]);
      } else {
        $(''+x).replaceWith(response[x]);
      }
    }
    // clean up cached completion list in local storage:
    if ( localStorage && localStorage.getItem('wpcomplete.completable-list') ) { localStorage.removeItem('wpcomplete.completable-list'); }
  }

})( jQuery );
