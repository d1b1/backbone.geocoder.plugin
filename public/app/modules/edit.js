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
      $(this.el).find(".location").geocomplete({
        map: $(this.el).find(".map_canvas"),
        location: $(this.el).find(".location").val(),
        markerOptions: {
          draggable: true
        }
      });
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
