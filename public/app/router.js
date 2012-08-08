define([
  // Application.
  "app",

  // Modules.
  "modules/example",
  "modules/edit"
],

function(app, Example, Edit) {

  // Defining the application router, you can attach sub routers here.
  var Router = Backbone.Router.extend({
    routes: {
      "": "edit",
      "edit": "edit"
    },

    index: function() {
      // Create a layout and associate it with the #main div.
      var layout = new Backbone.Layout({
        el: "#main"
      });

      // Insert the tutorial into the layout.
      layout.insertView(new Example.Views.Tutorial());
      
      // Render the layout into the DOM.
      layout.render();
    },

    edit: function() {

      // Create a layout and associate it with the #main div.
      var layout = new Backbone.Layout({
        el: "#main"
      });

      var TestDocument = new Edit.Model(
       { 'Name': 'My First Document',
         'locations' : [
           { location: '113 Atlantic Ave, Corpus Christ, TX'},
           { location: 'Berlin Germany'},
           { location: 'Paris France' },
         ]
       }
      );

      // Insert the tutorial into the layout.
      layout.insertView(new Edit.Views.FormB( { model: TestDocument }));
      
      // Render the layout into the DOM.
      layout.render();

    }

  });

  return Router;

});
