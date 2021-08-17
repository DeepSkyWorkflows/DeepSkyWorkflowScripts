/*

deepSkyUtils.js: Generic utility methods.
================================================================================

Common utilities used across various scripts.
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

#include "deepSkyInit.js"

#define DEBUG_UTILITY false

(function (ds) {

    ds.debug.register('utilities', DEBUG_UTILITY);
    ds.debug.utilities.debugLn('Utilities debugging is on.');

    if (ds.utilities) {
        return;
    }

    ds.utilities = {

        // concatenate parts into a string
        concatenateStr: function () {
            let strings = Array.prototype.slice.call(arguments);
            return strings.join('');
        },

        // replace a function by extending it
        chainFn: function (target, oldFnName, newFn) {
            let oldFn = target[oldFnName];
            return function () {
                if (oldFn) {
                    oldFn.apply(target, arguments);
                }
                return newFn.apply(target, arguments);
            };
        },

        // write lines with title prefix
        writeLines: function () {
            for (var arg = 0; arg < arguments.length; ++arg) {
                var val = arguments[arg];
                if (arg === 0) {
                    console.writeln(ds.utilities.concatenateStr('<b>', TITLE, '</b>: ', val));
                }
                else {
                    console.writeln(val);
                }
            }
            console.flush();
        },

        // get a unique name that doesn't conflict with existing
        getNewName: function (name, suffix) {
            ds.debug.utilities.debugLn('getNewName called with name', name, 'and suffix', suffix);
            let viewName = name + suffix;
            let n = 1;
            while (!ImageWindow.windowById(viewName).isNull) {
                ++n;
                viewName = name + suffix + n;
            }
            return viewName;
        }
    };

})(deepSky);
