define([
  // Application.
  "app"
],

// Map dependencies from above array.
function(app) {

  // Create a new module.
  var Locations = app.module();

  // Default model.
  Locations.Model = Backbone.Model.extend({
  
  });

  // Default collection.
  Locations.Collection = Backbone.Collection.extend({
    model: Locations.Model
  });

  // Return the module for AMD compliance.
  return Locations;

});
