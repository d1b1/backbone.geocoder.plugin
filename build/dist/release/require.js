/**
 * almond 0.1.1 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var defined = {},
        waiting = {},
        config = {},
        defining = {},
        aps = [].slice,
        main, req;

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {},
            nameParts, nameSegment, mapValue, foundMap, i, j, part;

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; (part = name[i]); i++) {
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            return true;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                break;
                            }
                        }
                    }
                }

                foundMap = foundMap || starMap[nameSegment];

                if (foundMap) {
                    nameParts.splice(0, i, foundMap);
                    name = nameParts.join('/');
                    break;
                }
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (waiting.hasOwnProperty(name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!defined.hasOwnProperty(name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    function makeMap(name, relName) {
        var prefix, plugin,
            index = name.indexOf('!');

        if (index !== -1) {
            prefix = normalize(name.slice(0, index), relName);
            name = name.slice(index + 1);
            plugin = callDep(prefix);

            //Normalize according
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            p: plugin
        };
    }

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    main = function (name, deps, callback, relName) {
        var args = [],
            usingExports,
            cjsModule, depName, ret, map, i;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i++) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = makeRequire(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = defined[name] = {};
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = {
                        id: name,
                        uri: '',
                        exports: defined[name],
                        config: makeConfig(name)
                    };
                } else if (defined.hasOwnProperty(depName) || waiting.hasOwnProperty(depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else if (!defining[depName]) {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                    cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync) {
        if (typeof deps === "string") {
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 15);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        waiting[name] = [name, deps, callback];
    };

    define.amd = {
        jQuery: true
    };
}());

this['JST'] = this['JST'] || {};

this['JST']['public/app/templates/editform.html'] = function(obj){
var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};
with(obj||{}){
__p+='<form>\n\n<div class="map_canvas_list">\n\n</div>\n\n\n<script>\n$(document).ready(function() {\n      $("#geolocation").geocomplete({\n        map: ".map_canvas",\n        location: $(\'#geolocation\').val(),\n        markerOptions: {\n          draggable: true\n        }\n      });\n});\n</script>\n\n</form>';
}
return __p;
};

this['JST']['public/app/templates/example.html'] = function(obj){
var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};
with(obj||{}){
__p+='<header>\n  <img src="/assets/img/backbone.png">\n  <hr>\n  \n  <div>\n    <h2 class="congrats">Congratulations!</h2>\n    <h2>Seeing this means you have installed Backbone Boilerplate correctly.</h2>\n\n    <p>Now that you have the easiest and most-powerful Backbone boilerplate available,\n    you\'re probably wondering how to use it to start building applications...</p>\n  </div>\n</header>\n\n<section id="toc">\n  <h1>Contents</h1>\n\n  <ul>\n    <li><a data-bypass href="#overview">Overview</a>\n    <li><a data-bypass href="#getting-help">Getting help</a>\n    <li><a data-bypass href="#writing-app">Writing your application</a>\n      <ul class="nested">\n        <li><a data-bypass href="#cleaning">Cleaning out default files and code</a>\n        <ul class="nested">\n          <li><a data-bypass href="#git-history">Removing the Git history</a>\n          <li><a data-bypass href="#test-dir">Removing the test directory</a>\n          <li><a data-bypass href="#build-process">Removing the build process</a>\n          <li><a data-bypass href="#favicon">Changing the Favicon</a>\n          <li><a data-bypass href="#app-code">Removing default application code</a>\n          <li><a data-bypass href="#default-routes">Removing the default routes</a>\n          <li><a data-bypass href="#default-assets">Removing default assets</a>\n        </ul>\n        <li><a data-bypass href="#namespace">Namespace</a>\n        <li><a data-bypass href="#modules">Creating a module</a>\n        <li><a data-bypass href="#templates">Working with templates</a>\n        <li><a data-bypass href="#events">Working with Application Wide Events</a>\n        <li><a data-bypass href="#plugins">Working with libraries and plugins</a>\n      </ul>\n    <li><a data-bypass href="#custom-build">Using the build tool</a>\n      <ul class="nested">\n        <li><a data-bypass href="#running">Running with the defaults</a>\n        <li><a data-bypass href="#customizing">Customizing the build configuration</a>\n        <li><a data-bypass href="#server">Using the development server</a>\n        <li><a data-bypass href="#adding-tasks">Adding new tasks</a>\n      </ul>\n    <li><a data-bypass href="#useful-resources">Useful Resources</a>\n  </ul>\n</section>\n\n<section>\n  <h2 id="overview">Overview</h2>\n\n  <p>Backbone Boilerplate is the product of much research and frustration. While\n  existing boilerplates for Backbone exist, they will often modify the Backbone\n  core, don\'t have an integrated build system, or impose too much on your\n  application\'s structure. This boilerplate attempts to improve that.\n\n  Organize your application in a logical filesystem, and develop Models,\n  Collections, Views, and Routers inside modules. Build your application knowing\n  you have efficient, compact code. Backbone Boilerplate extends on the\n  versatile Backbone core, and helps developers manage their application.</p>\n\n  <h3 id="core-features">Core Features</h3>\n  <ul>\n    <li><a target="_blank" href="https://github.com/h5bp/html5-boilerplate">HTML5 Boilerplate</a> included.\n    <li>Managed filesystem structure for application code, assets, tests, and distribution.\n    <li>Snippets to make common tasks easier: modules, HTML5 History API/Hash navigation, template loading and application events.\n    <li>Flexible and extendable build system.\n      <ul class="nested">\n        <li>Concatenate and minify all your libraries, application code, templates and CSS down to reduce transmission time.\n        <li>Compile underscore templates to prevent pre-processing on the client.\n      </ul>\n  </ul>\n</section>\n\n<section>\n  <h2 id="getting-help">Getting help</h2>\n\n  <p>If you\'re encountering issues, need assistance, or have a question that hasn\'t been answered in this\n  tutorial or <a target="blank" href="https://github.com/tbranyen/backbone-boilerplate">the GitHub project page</a>\n  you may find help in one of these places:</p>\n\n  <ul>\n    <li>IRC - #backbone-boilerplate on irc.freenode.net\n    <li><a target="blank" href="http://github.com/tbranyen/backbone-boilerplate/issues">GitHub Issues</a> - Please report if you\'ve found an issue,\n    bug, or controversial request.\n  </ul>\n\n  <p>I want this project to be the best it possibly can and represent the interests of the community, <b>please</b>\n  submit issues with features you find useful and anything that you question.</p>\n</section>\n\n<section>\n  <h2 id="writing-app">Writing your application</h2>\n  <p>Your application may be made up of third-party libraries, plugins, application code, templates, and lots of logic.  All of this will need\n  to be well structured to keep it maintainable and it also needs to be compiled if deployed into production.  Before you can get started you\n  will need to clean out all the existing defaults that are in the boilerplate are necessary to display this tutorial.\n  </p>\n\n  <p class="clues"><b>Strongly recommend you read through this tutorial before cleaning out any files that may hold clues on how to use the Boilerplate.</b></p>\n\n  <h3 id="cleaning">Cleaning out default files and code</h3>\n  <p>There are several places where customization may be required.</p>\n\n  <ul>\n    <li><h4 id="git-history">Removing the Git history</h4>\n      <p>If you cloned the Backbone Boilerplate with Git, you should delete the git directory and then initialize your own Git history:\n\n      <pre><code>\n    $ rm -rf .git\n    $ git init\n      </code></pre>\n      </p>\n\n    <li><h4 id="test-dir">Removing the test directory</h4>\n      <p>If you are not planning on testing your application with QUnit you should delete this directory.</p>\n\n    <li><h4 id="build-process">Removing the build process</h4>\n      <p>If you are not planning on using the build tool, delete the\n      <code>grunt.js</code> file.  It contains configuration you will not need.\n      </p>\n\n    <li><h4 id="favicon">Changing the Favicon</h4>\n      <p>At the root level of the project simply change the <code>favicon.ico</code> file to point to your own branded icon.</p>\n\n    <li><h4 id="app-code">Removing default application code</h4>\n      <p>This tutorial is rendered in the <code>app/modules/example.js</code> file and written in <code>app/templates/example.html</code>.\n      Both of these files are safe to remove.</p>\n\n    <li><h4 id="default-routes">Removing the default routes</h4>\n      <p>Routes are defined in the <code>app/main.js</code> file.  Familiarize yourself with it\'s contents.  You\'ll notice the default router has two existing routes and callback defined, reset it to:\n\n      <pre><code>\n    // Defining the application router, you can attach sub routers here.\n    var Router = Backbone.Router.extend({\n      routes: {\n        "": "index",\n      },\n\n      index: function() {\n        // Put your homepage route logic here\n      }\n    });\n      </code></pre>\n      </p>\n\n\n      <p>Above the Router definition you\'ll see a reference to the example module,\n      this is safe to delete as well.\n\n      <pre><code>\n    // Include the example module\n    var Example = namespace.module("example");\n      </code></pre>\n      </p>\n  \n    <li><h4 id="default-assets">Removing default assets</h4>\n      <p>The default styles for this tutorial are stored in <code>assets/css/style.css</code>.  You will probably want to remove these since they only make sense for this specific page.  They start on <code>Line 209</code>.  With the following H5BP header:\n\n      <pre><code>\n    /* ==|== primary styles =====================================================\n       Author: Backbone Boilerplate <Change to your Name>\n       ========================================================================== */\n     </code></pre>\n     </p>\n\n     <p>You may also want to change the name to yours, if you\'re planning on putting your custom CSS here as well.</p>\n\n     <p>You should delete the <code>assets/img/backbone.png</code> file if you are not planning on using it in your app.</p>\n  </ul>\n\n  <h3 id="namespace">Namespace</h3>\n  <p>The <code>namespace.js</code> file is very important since it contains logic that should\n  exist for every module in your application.  This also contains the <code>module</code>\n  shortcut function and <code>fetchTemplate</code> function.</p>\n  </p>\n\n  <h3 id="modules">Creating a module</h3>\n  <p>Following the Bocoup post on <a data-bypass target="_blank" href="http://weblog.bocoup.com/organizing-your-backbone-js-application-with-modules">Organizing Your Backbone.js Application With Modules</a> this boilerplate provides the same module definition structure.\n\n  Modules are placed in the <code>app/modules/</code> directory.  There is an example module\n  there named: <code>example.js</code>.  The actual module definition function is located\n  inside the <code>app/index.js</code> file.  You create and reference modules with the same\n  function call:  <code>namespace.module(&quot;&lt;module_name&gt;&quot;)</code>.\n\n  Typically a module contains a single Model/Collection/Router and many Views.\n  Therefore the returned module object is empty except for a Views object\n  property that can be used to attach many Views to, like:\n\n  <pre><code>\n  MyModule.Views.Detailed = Backbone.View.extend({ /* ... */ });\n\n  MyModule.Views.Main = Backbone.View.extend({ /* ... */ });\n  </code></pre>\n  </p>\n\n  <p>\n  Attaching Models/Collections/Routers happen on the same level of the module,\n  like so:\n\n  <pre><code>\n  MyModule.Model = Backbone.Model.extend({ /* ... */ });\n\n  MyModule.Router = Backbone.Router.extend({ /* ... */ });\n  </code></pre>\n  </p>\n\n  <h3 id="templates">Working with templates</h3>\n  <p>Templates are a super useful way to separate concerns in your application.  Instead of generating markup from inside your JavaScript\n  application, you instead create it in a separate file and load it into your application.  There are numerous ways of loading in a\n  template, but this boilerplate has chosen the most performant way to build all your templates into a single file.</p>\n\n  <p>This tutorial itself is a template that exists in <code>app/templates/example.html</code>.  You can edit this file and hit refresh\n  in here to see the changes.  The boilerplate comes with a built in function to handle the loading of templates.  It\'s called:\n  \n  <pre><code>\n  namespace.fetchTemplate("app/templates/name.html", function(template) {\n    // Template here is a function, that accepts an object.  Identical to _.template.\n    console.log(template({ ... }));\n  });\n  </code></pre>\n  </p>\n\n  <p>By defining a custom function this will ensure that if you use the build tool or AJAX, that your templates will load consistently.\n  You can see it in action inside the <code>app/modules/example.js</code> module.</p>\n\n  <p>If you use the build process to compile your templates, it will automatically find all the HTML files inside the templates\n  directory and compile them into a templates.js file.  These are actual JavaScript template functions being compiled on the server, which\n  is different from Jammit and most other server-side builders that just invoke functions on page load.</p>\n\n  <p>You can access a compiled template like so:\n\n  <pre><code>\n  var template = window.JST["app/modules/example.html"];\n  template({ ... });\n  </code></pre>\n  </p>\n\n  <h3 id="events">Working with Application Wide Events</h3>\n  <p>Application wide events provide a convenient way for modules to communicate with each other. <code>namespace.app</code> references a copy of the Backbone.Events object. <a href="http://documentcloud.github.com/backbone/#Events">More information on Backbone Events</a></p>\n\n  <p>\n  To bind a callback function to an event:\n\n  <pre><code>\n  //binding an annonymous function to the event "all" with a context of <code>this</code>.\n  namespace.app.on("all", function(){...}, this);\n  </code></pre>\n  </p>\n\n  <p>\n  To remove a callback function (or many) from an event:\n\n  <pre><code>\n  // Removes just the doSomething callback.\n  namespace.app.off("change", doSomething);\n  \n  // Removes all "change" events.\n  namespace.app.off("change");\n  \n  // Removes all events from the namespace.app object. \n  namespace.app.off(); \n  </code></pre>\n  </p>\n\n  <p>\n  To trigger the "change" event:\n\n  <pre><code>\n  namespace.app.trigger("change", [*args]);\n  </code></pre>\n  </p>\n\n  <h3 id="plugins">Working with libraries and plugins</h3>\n  <p>Libraries and plugins are easily added to the application, by placing them inside the <code>assets/js/libs/</code> directory.\n  If you have many plugins in your application, it may make sense to create a separate folder such as <code>assets/js/plugins/</code> \n  for them.</p>\n</section>\n\n<section>\n  <h2 id="custom-build">Using the build tool</h2>\n  <p>The Backbone Boilerplate build process is a state-of-the-art task driven\n  Node.js application that utilizes @cowboy\'s grunt project.\n\n  To run the defaults, execute the following command from the project root,\n  and *not from inside the build folder*.</p>\n\n  <h3 id="running">Running with the defaults</h3>\n  <p>To run the defaults, execute the following command from the project root,\n  and *not from inside the build folder*.\n\n  <pre><code>\n  node build\n  </code></pre>\n  </p>\n\n  <p>\n  This will do a number of things for you.  First it will concatenate all your\n  libs, app code, and templates into separate files inside the `dist/debug`\n  folder.  It will then minify those files and your CSS into production ready\n  files inside the <code>dist/release</code> folder.</p>\n\n  <h3 id="customizing">Customizing the build configuration</h3>\n  <p>To customize and configure the build tool, open `build/config.js` and tweak\nthe settings.</p>\n\n  <h3 id="server">Using the development server</h3>\n  <p>\n  While writing an application that leverages <code>pushState</code> you can run the\n  following command to run a server that will always resolve to the <code>index.html</code>\n\n  <pre><code>\n  node build/server\n  </code></pre>\n  </p>\n\n  <p>\n  This will spawn up an HTTP server on port <code>8000</code>.  This server is intended\n  for development and not production.  You should use url rewriting or forwarding\n  all requests in your production server to achieve this same effect.</p>\n\n  <h4>Serving the built assets</h4>\n\n  <p>If you are using the build tool in conjunction with this development server\n  you can optionally update the <code>index.html</code> file to remove the existing script\n  tags and uncomment out the scripts tag at the bottom to load the <code>dist/debug</code>\n  or <code>dist/release</code> assets.  You can achieve this by specifying either <b>debug</b>\n  or <b>release</b> after the server command, like so:\n\n  <pre><code>\n  node build/server release\n  </code></pre>\n  </p>\n\n  <h3 id="adding-tasks">Adding new tasks</h3>\n  <p>To add a new task into the build system, you simply copy and paste the task JavaScript folder/file into the <code>build/tasks</code> folder\n  or extract the task archive into the same directory.  At the very least in order to run this task, you\'ll need to add it to the <code>build/config.js</code>\n  file.  The last line should look something like:\n\n  <pre><code>\n  task.registerTask("default", "clean lint:files concat jst min mincss new_module_here");\n  </code></pre>\n  </p>\n\n  It\'s possible the custom task will have additional setup instructions, so make\n  sure you read the README for any task.</p>\n</section>\n\n<section id="useful-resources">\n  <h2>Useful resources</h2>\n\n  <ul>\n    <li><a target="blank" href="http://backbonejs.org/">Backbone documentation</a> - Framework on which Backbone Boilerplate is built.\n    <li><a target="blank" href="http://documentcloud.github.com/underscore/docs/underscore.html">Underscore documentation</a> - Required dependency for Backbone.\n  </ul>\n</section>\n';
}
return __p;
};

this['JST']['public/app/templates/location/item.html'] = function(obj){
var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};
with(obj||{}){
__p+='<input type="text" size="50" placeholder="Type in an address" class="location" value="'+
( location )+
'">\n<br><br>\n\n<div style="width: 300px; height: 200px; background-color: #EFEFEF" class="map_canvas"></div>\n<br>\n<div class=\'remove\'>[remove]</div>';
}
return __p;
};

this['JST']['public/app/templates/location/list.html'] = function(obj){
var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};
with(obj||{}){
__p+='List of all the locations\n\n<div class="location_areas"></div>\n<div class=\'add\'>[Add New]</div>';
}
return __p;
};

this['JST']['public/app/templates/location.html'] = function(obj){
var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};
with(obj||{}){
__p+='\n<input type="text" size="50" placeholder="Type in an address" class="location_'+
(i)+
'" value="'+
( location )+
'">\n<br><br>\n\n<div style="width: 300px; height: 200px; background-color: #EFEFEF" class="map_canvas_'+
(i)+
'">\nThis is the map location 1.\n</div>\n<br>';
}
return __p;
};