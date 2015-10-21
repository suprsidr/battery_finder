global.$ = global.jQuery = require('jquery');
global._ = require('lodash');
require('dataTables');
require('./vendor/jquery.qtip');
jQuery(function(){
  'use strict';
  var minimongo = require("minimongo");

  var LocalDb = minimongo.MemoryDb;

  // Create local db (in memory database with no backing)
  var db = new LocalDb();


  // Add a collection to the database
  db.addCollection("products");

  var o = {},
    atts = ['facet_Battery_Type', 'facet_Battery_Capacity', 'Spec_facet_Connector_Type', 'Spec_facet_Battery_Voltage'],
    me = '';

  // document events
  $('#batteryfinder')
    .on('db:ready', function (e) {
      //console.log('dbReady');
      _executeQuery([{}]);
    })
    .on('mouseenter', '.img-ico', function(e) {
      var self = $(this), txt = self.closest('td').find('a').first().text()
      $(this).qtip({
        content : {
          title: '<h3 class="text-center">'+txt+'</h3>',
          text: '<img src="http://s7d5.scene7.com/is/image/horizonhobby/'+txt+'_a0?hei=150">'
        },
        style: {
          classes: 'qtip-bootstrap'
        },
        position : {
          my: 'left center',
          at: 'right center',
          target : 'mouse',
          viewport : $('.socket'),
          adjust : {
            x: 30,
            mouse : false
          }
        },
        show : {
          ready : true
        },
        hide : {
          event : 'mouseleave'
        },
        events : {
          hide : function(event, api) {
            api.destroy();
          }
        }
      })
    })
    .on('click', '.hlp-ico', function(e) {
      return false;
    })
    .on('mouseenter', '.hlp-ico', function(e) {
      var self = $(this), txt = self.data('text'), title = self.parent().text();
      $(this).qtip({
        content : {
          title: '<h3 class="text-center">'+title+'</h3>',
          text: txt
        },
        style: {
          classes: 'qtip-bootstrap'
        },
        position : {
          my: 'left center',
          at: 'right center',
          target : 'mouse',
          viewport : $('.socket'),
          adjust : {
            x: 30,
            mouse : false
          }
        },
        show : {
          ready : true
        },
        hide : {
          event : 'mouseleave'
        },
        events : {
          hide : function(event, api) {
            api.destroy();
          }
        }
      })
    })
    .on('click', '.filter-reset', function(e) {
      e.preventDefault();
      me = '';
      $('.battery-filters select').each(function() {
        $(this).val('All').find('option').first().attr('selected', true);
      });
      _executeQuery([{}]);
    })
    .on('click', 'table.dataTable.display tbody tr', function(e) {
      e.preventDefault();
      location.href = $(this).find('a').first().attr('href');
    });
  // end document events

  function _buildQuery() {
    var q = [];
    $('.battery-filters select').each(function() {
      var el = $(this);
      if(el.val() !== 'All') {
        q.push({Attributes: {$elemMatch: {ID: el.attr('class'), Name: el.val()}}});
      }
    });
    if(q.length === 0) {
      q.push({});
    }
    _executeQuery(q);
  }
  function _executeQuery(q) {
    db.products.find({$and: q}, {limit: 0, sort: {ProdID: 1}, fields: {ProdID: 1, BrandName: 1, Name: 1, Price: 1, Attributes: 1, _id: -1}}).fetch(function(res) {
      //console.log(res.length);
      var data = {length: res.length, products: []}
      $.each(res, function() {
        // our dataTable is expecting an array arrays of entries in the same order you setup the columns
        data.products.push([
          '<div class="small-12 large-6 columns text-center"><a href="http://www.horizonhobby.com/'+this.ProdID+'">' + this.ProdID +
          '</a></div><div class="small-12 large-6 columns text-center hide-for-small"><a class="img-ico" href="' + this.ProdID +
          '"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABGklEQVRYhe2X223CQBBFtwSXkBIoYbRn9p8S6CSUQAehA1qgA0rAHZAO4CM2svzaWSEPkGSk+bBk+x7fvZr1hvDnS1UFOKvq1bMbTQlA7S3ehQjtxROc/9H9lQDADjg36/zpCgDsRtZ76wagqt+jYXsyQP0wgKpKjHFjuG+7yBK08yKltLJAAHXzzEC8GKD7VcBFRKochAHSBiAiFXDpWXpyAwD2E2P0q1QU2BcBqKrMzXJLKEO4u3jo6lgBjrkNJRdKEalU9dTXyQLEGDfGHW0ylCmlVT8/JoCJ4M31IJTAeuwdJoCJYZJz4h7KOfeyACLyUSpe0lkAS/CWBlhM/B/gPQC86qUABr9QXg3U7dHM/XTUaIq3869XN/O/cf3fElPRAAAAAElFTkSuQmCC"></a></div>',
          this.BrandName,
          this.Name,
          '$' + this.Price])
        //console.log(this.ProdID);
      });
      _buildTable(data);
      if(data.length > 0) {
        _updateFilters(res);
      }
    });
  }
  function _updateFilters(data) {
    _scrubData(data);
    $('.battery-filters select').not(me).each(function() {
      var el = $(this), className = el.attr('class'), val = el.val();
      el.html($('<option />', {text: 'All', value: 'All', selected: (val === 'All')}));
      $.each(o[className], function() {
        var option = $('<option />', {text: this, value: this, selected: (val === this)})
        el.append(option);
      });
    });
  }
  function _buildTable(data) {
    $('.results-count').html('<h3>Results: '+data.length+'</h3>');
    $('.socket').html('<table id="results" class="display"></table>');

    $('#results').dataTable({
      "data" : data.products,
      "columns" : [{
        "title" : "ProdID"
      }, {
        "title" : "BrandName"
      }, {
        "title" : "Name"
      }, {
        "title" : "Price",
        "class" : "text-center"
      }],
      "language": {
        "lengthMenu": "Show _MENU_"
      }
    });
  }
  // take our data from our query and re-organize it for our selectors
  function _scrubData(data) {
    $.each(atts, function(i) {
      o[atts[i]] = [];
    });
    //console.log(data.length);
    // get our data organized
    $.each(data, function(i) {
      $.each(data[i].Attributes, function() {
        if(atts.indexOf(this.ID) > -1) {
          if(typeof this.Name === 'object') {
            var self = this;
            $.each(self.Name, function() {
              if(o[self.ID].indexOf(this) < 0) {
                o[self.ID].push(this);
              }
            })
          } else {
            if(o[this.ID].indexOf(this.Name) < 0) {
              o[this.ID].push(this.Name);
            }
          }
        }
      })
    });
    // unique and sorted
    $.each(atts, function(i) {
      if(o[atts[i]][0] && (o[atts[i]][0].endsWith('mAh') || o[atts[i]][0].endsWith('V'))) {
        // must double sort *mAh to guarentee proper sort
        o[atts[i]] = _.uniq(o[atts[i]].sort().sort(function(a, b) {
          var x = parseFloat(a), y = parseFloat(b);
          return y - x;
        }).reverse());
      } else {
        o[atts[i]] = _.uniq(o[atts[i]].sort());
      }
    });
  }

  // convenience function
  String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
  };

  // Grab our complete battery catalog from dataAPI
  var q = JSON.stringify({
      Categories: { $elemMatch : { ID : { $regex : encodeURIComponent('[A-Z]_BATTERIES') } } },
      Displayable: 1,
      Buyable: 1
    }),
    s = JSON.stringify({
      ProdID: 1
    }),
    f = JSON.stringify({
      _id: 0,
      ProdID: 1,
      BrandID: 1,
      BrandName: 1,
      Name: 1,
      Desc: 1,
      Price: 1,
      Categories: 1,
      Attributes: 1
    });
  $.ajax({
    url: 'http://159.203.116.76/search/' + q + '/0/' + s + '/' + f + '?callback=?',
    type: 'GET',
    dataType: 'json',
    success: function (data) {
      var attsTextMaps = {};
      attsTextMaps[atts[0]] = 'Batteries for RC vehicles come in many different chemical types, each with their own strengths. Different chemical types do have different performance advantages, so make sure you select the proper battery for your electronics. Lithium Polymer (LiPo) and Nickel Metal Hydride (NiMH) tend to be the most common but there are many different options for you to choose from.';
      attsTextMaps[atts[1]] = 'Capacity is a measure of how long a battery will last per-charge. The higher the capacity the longer a battery will last before needing to be recharged.  You can always safely increase the capacity on your battery to gain more runtime or flight time.';
      attsTextMaps[atts[2]] = 'Depending on the type of vehicle you are installing a battery into you will have to make sure you have the correct connector on both the battery pack and the vehicle itself. Common battery connectors include EC3, Ultra Plugs, Tamiya and banana plugs or tubes.';
      attsTextMaps[atts[3]] = 'As you increase the individual cells that make up a battery pack the voltage will increase at the same time. More voltage equals more speed and performance. Multiply the voltage of each cell by the individual cells that make up the battery pack to determine the total pack voltage. ';

      //_scrubData(data);

      // build selector grid
      var row = $('.battery-filters'),
        col = $('<div />', {class: 'small-12 columns text-center'}),
        ul = $('<ul />', {class: 'small-block-grid-2 large-block-grid-4'})
      row.html($('<h3 />', {text: 'Battery Filters', class: 'text-center'}).append($('<a />', {href: '#reset', class: 'filter-reset paginate_button', text: 'Reset'})));
      $.each(atts, function(i) {
        var li = $('<li />'),
          sel = $('<select />', {class: atts[i]}).on('change', function(e) {
            e.preventDefault();
            me = '.' + atts[i];
            _buildQuery();
          });

        sel.append($('<option />', {text: 'All', value: 'All', selected: true}));

        /*$.each(o[atts[i]], function() {
         var option = $('<option />', {text: this, value: this})
         sel.append(option);
         })*/
        li.append(
          $('<h6 />', {html: atts[i].replace('Spec_', '').replace('facet_', '').replace('_', '&nbsp;') + '&nbsp;'})
            .append(
            $('<a />', {class: 'hlp-ico', href: '#help', 'data-text': attsTextMaps[atts[i]]})
              .append(
              $('<img />', {src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAB/UlEQVRYhbVXbXXDMAwshEIYhDKo37vz75XJymBl0DBoGGwMEgYNg45BwqD7MWVTFDu20+7ey5/4QyfJOtmbTQEAHABcSDYkryTv8l1JNjL2WrJnEs65FwAXAL0yuPgB6AFcnHPbh4yTPJUYDhEh+b7G660J8bhhB6Ai6bz3u3G+935H0gGoAHQBMtfsaHjvdwGvW5KuIHJO1kyioUlHPQ8YP+YaDhA5WhLRSATCPpR4vUDCyV6/6YhNPBnPHzZuSOi9T5MJUmr9UthXVMBNO6HTMUsFgFofuIgXa8rwZvZo1VitB3SO3CaAtVoQSwWAfvT+oOs8ZPxZBMTel7J3mIQfQBUjkIsMAtXEnhEM998ETEW0Gy2dSaVagIjYR4qAyPafJixNzoW06WDTCs2fjD9CIOa1fAOAQ5LA2hQseU3yM6b5OgUAutWHsNRrtW52CFeVYYnXGrMy1ELEWKd6ImZCJN4kpfgZMOEfNCvdjJrMzZLlFlgTbkZyGdFRSN6CSglwejsaZueFhReSEgJMXUhGaE2QGo+SyCXAn9tyr/aNdtxQKu4A3pa8W4IJezj0FqJUg1nYFIqUkzUT49lKKxo/e2DIPe/svd/bh4n3fk/yLHPsum7VM00Opo1GyTdED1wuJBp1IZEBQP3w49RCOmBNsjUV08m/KtWMLL4BdNT44JoqBUYAAAAASUVORK5CYII='})
            )
          )
        )
          .append(sel)
          .appendTo(ul)

      });
      ul.appendTo(col);
      col.appendTo(row);
      // end selector grid

      // insert data into db as one big dump - Always use upsert for both inserts and modifies
      db.products.upsert(data, function() {
        // success
        $('#batteryfinder').trigger('db:ready');
      });
    }
  });
});