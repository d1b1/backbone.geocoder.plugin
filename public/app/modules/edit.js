define([
  // Application.
  "app"
],

// Map dependencies from above array.
function(app) {

  // Create a new module.
  var Edit = app.module();

  // Default model.
  Edit.Model = Backbone.Model.extend({});

  // Default collection.
  Edit.Collection = Backbone.Collection.extend({
    model: Edit.Model
  });

  // Default model.
  Edit.LocationModel = Backbone.Model.extend({
    defaults: { 
      i: 0,
      location: '' 
    }
  });

  // Default collection.
  Edit.LocationCollection = Backbone.Collection.extend({
    model: Edit.LocationModel
  });

  // ---------------------------------------
  // ---------------------------------------

  // This will fetch the tutorial template and render it.
  Edit.Views.FormB = Backbone.View.extend({
    template: "editform",

    manage: true,

    initialize: function() {

       // This will attach a collection to the model view.
       this.collection = new Edit.LocationCollection( this.model.get('locations') );
    },

    // Provide data to the template
    serialize: function() {
       return this.model.toJSON();
    },

    // Need to move this into a view function that will
    // map the collection data to a collection.
    
    beforeRender: function() {

      this.insertView(".map_canvas_list", 
          new Edit.Views.Locations( { locations: this.model.get('locations') } )
      );

    }

  });

  Edit.Views.LocationItem = Backbone.View.extend({
    template: "location/item", 

    manage: true,

    className: 'loc',
    
    events: {
      'click .remove': 'removeLocation'
    },

    removeLocation: function(ev) {
      // Remove the model from the colletion.
      this.model.collection.remove(this.model); 

      // Remove the view.
      this.remove();

      // TODO - Refactor to have the view removed when the collection 
      // model is removed.
    },

    // Provide data to the template
    serialize: function() {
      return {
        i: this.model.get('i'),
        location: this.model.get('location')
      };
    },

    afterRender: function() {

     var testData = {
             "address_components":[
                { "long_name":"113",
                  "short_name":"113",
                  "types":["street_number"]
                },
                { "long_name":"Atlantic Street",
                  "short_name":"Atlantic St",
                  "types":["route"]
                },
                { "long_name":"Bay Area",
                  "short_name":"Bay Area",
                  "types":["neighborhood","political"]
                },
                { "long_name":"Corpus Christi",
                  "short_name":"Corpus Christi",
                  "types":["locality","political"]
                },
                { "long_name":"Corpus Christi",
                  "short_name":"Corpus Christi",
                  "types":["administrative_area_level_3","political"]
                },
                { "long_name":"Nueces",
                  "short_name":"Nueces",
                  "types":["administrative_area_level_2","political"]
                },
                { "long_name":"Texas",
                  "short_name":"TX",
                  "types":["administrative_area_level_1","political"]
                },
                { "long_name":"United States",
                  "short_name":"US",
                  "types":["country","political"]
                },
                { "long_name":"78404",
                  "short_name":"78404",
                  "types":["postal_code"]
                }
              ],
              "formatted_address":"113 Atlantic Street, Corpus Christi, TX 78404, USA",
              "geometry": {
                "location":{
                  "Ya":27.7719958, "Za":-97.39126220000003
                },
                "location_type":"ROOFTOP",
                "viewport":{
                  "Z":{ "b": 27.7706468197085, "d": 27.7733447802915 },
                  "ca":{ "b": -97.39261118029151, "d": -97.38991321970849 }
                }
              },
              "partial_match":true,
              "types":["street_address"]
            }


      $(this.el).find("#find").click(function(){
        $("#location").trigger("geocode");
      });

      $(this.el).find("#location").geocomplete({
        initData: testData,
        map: $(this.el).find(".map_canvas"),
        location: $(this.el).find(".location").val(),
        markerOptions: {
          draggable: true
        },
        types: ["geocode", "establishment"],
        details: "#myform",
        detailsAttribute: "name"
      });

      $("#location").trigger("geocode");
    }
  });

  // This will fetch the tutorial template and render it.
  Edit.Views.Locations = Backbone.View.extend({
    template: "location/list",

    manage: true,

    events: {
      'click .add': 'addLocation'
    },

    addLocation: function(ev) {

      // Adding a new model to the collection. The add bind
      // for the colletion will trigger the render.
      this.collection.add( new Edit.LocationModel() );

    },

    initialize: function(options, b) {

       // This will attach a collection to the model view.
       this.collection = new Edit.LocationCollection( options.locations );

       this.collection.on('add', this.renderLocation, this);

    },

    renderLocation: function(newModel) {

      this.insertView(".location_areas2", 
       new Edit.Views.LocationItem( { model: newModel } )
      ).render();

    },

    // Provide data to the template
    serialize: function() {
       return { t: 11};
    },

    // Need to move this into a view function that will
    // map the collection data to a collection.
    
    beforeRender: function() {
      var that = this;

      var i = 0;
      _.each(this.collection.models, function(location) {
        i += 1;
        location.set({ i: i});

        that.insertView(".location_areas", 
          new Edit.Views.LocationItem( { model: location } )
        );
      });

    }

  });

  // Return the module for AMD compliance.
  return Edit;

});
