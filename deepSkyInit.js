/*

deepSkyInit.js: Initializer for all scripts.
================================================================================

Creates the global deepsky object.
================================================================================
 *
 *
 * Copyright Jeremy Likness, 2021
 *
 * License: https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts/LICENSE
 *
 * Source: https://github.com/DeepSkyWorkflows/DeepSkyWorkflowScripts
 *
 * mailTo:deepskyworkflows@gmail.com
 *
 */

#script-id DeepSkyInit

#ifndef VERSION
#define VERSION "1.0"
#define DEBUG_GLOBAL false
#endif

// global object
var deepSky = function (ds) {

    // only initialize once
    if (ds.initialized === true) {
        ds.debug.register('global', DEBUG_GLOBAL);
        return ds;
    }

    ds.initialized = true;

    const globalDebug = DEBUG_GLOBAL;

    const decompose = function (arr) {
        let _ = [];
        for (var i = 0; i < arr.length; i++) {
            let item = arr[i];
            if (item && item.length) {
                _ = _.concat(Array.isArray(item) ? decompose(item) : [item, '']);
            }
        }
        return _.join(' ');
    }

    const debugLn = function () {
        console.writeln(decompose(Array.prototype.slice.call(arguments)));
    };

    ds.debug.register = function (area, flag) {
        ds.debug[area] = {};
        
        if (globalDebug === true || flag === true) {
            ds.debug[area].debugLn = (function (ar) {
                return function () { debugLn(['DEBUG (' + ar + '): '].concat(Array.prototype.slice.call(arguments))) };
            })(area);
        }
        else {
            ds.debug[area].debugLn = function () { };
        }
    };

    console.writeln('Deep Sky Engine v', VERSION, ' is initialized.');

    ds.debug.register('global', DEBUG_GLOBAL);
    ds.debug.global.debugLn('GLOBAL DEBUG ON');

    ds.features = {
        register: function (name, title, feature, initialState) {
          
            ds.features[name] = {
                title: title,
                engine: feature,
                executionState: initialState || {},
                dialog: null
            };

            ds.activeFeature = ds.features[name];

            ds.getExecutionState = function () {
                return ds.features[name].executionState;
            };

            ds.getDialog = function () {
                return ds.features[name].dialog;
            };
           
            // apply so functions/state are local to the function
            for (let prop in feature) {
                if (feature.hasOwnProperty(prop) && typeof feature[prop] === 'function') {
                    ds.debug.global.debugLn('Detected', name, 'engine method ', prop);
                    const fn = feature[prop];
                    const context = {
                        engine: ds.features[name].engine,
                        executionState: ds.features[name].executionState,
                        getDialog: function () {
                            return ds.features[name].dialog;
                        },
                        debugLn: ds.debug[name].debugLn
                    };
                    (function (fn1) {
                        const fnWithContext = function () {
                            return fn1.apply(context, arguments);
                        };
                        feature[prop] = fnWithContext;
                    })(fn);
                }
            }

            ds.debug.global.debugLn('Registered feature', name, 'with parameters',
                JSON.stringify(ds.features[name]));
        }
    };

    return ds;

}(deepSky || {
    version: VERSION,
    initialized: false,
    debug: {}
});
