/*

deepSkySettingsManager.js: Settings and parameters.
================================================================================

Helper for retrieving and storing settings and parameters with UI databinding
capabilities.
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

#script-id DeepSkySettingsManager
#include "deepSkyInit.js"

#define DEBUG_SETTINGS false

(function (ds) {

    ds.debug.register('settings', DEBUG_SETTINGS);
    ds.debug.settings.debugLn('Settings debugging is on.');

    if (ds.createSettingsManager) {
        return;
    }

    // save a setting
    let saveSetting = function (key, type, value) {
        ds.debug.settings.debugLn('Save setting:', key, '=', value == null ? "null" : value.toString());
        Settings.write(key, type, value);
    };

    // read a setting or return null
    let readSetting = function (key, type) {
        const val = Settings.read(key, type);
        if (Settings.lastReadOK) {
            ds.debug.settings.debugLn('Read setting:', key, '=', val);
            return val;
        }
        ds.debug.settings.debugLn('Setting', key, 'not found');
        return null;
    }

    let noop = function () { };

    // pass in an array
    // each element should be:
    // name, data type, default value, label, tooltip, range
    ds.createSettingsManager = function (config) {

        let mappings = [];

        mappings[DataType_Boolean] = Parameters.getBoolean;
        mappings[DataType_Int16] = Parameters.getInteger;
        mappings[DataType_Int32] = Parameters.getInteger;
        mappings[DataType_Int64] = Parameters.getInteger;
        mappings[DataType_Double] = Parameters.getReal;
        mappings[DataType_Float] = Parameters.getReal;
        mappings[DataType_String] = Parameters.getString;

        let defaults = {};
        let prefs = {};
        let funcs = {};

        for (let idx = 0; idx < config.length; idx++) {
            let configValue = config[idx];
            ds.debug.settings.debugLn('Configuring setting:', JSON.stringify(configValue));
            let setting = configValue.setting;
            let dataType = configValue.dataType;
            let defaultValue = configValue.defaultValue;
            let label = configValue.label;
            let tooltip = configValue.tooltip;
            let range = configValue.range;
            let precision = configValue.precision || 0;
            let persist = !(configValue.hasOwnProperty("persist") && configValue.persist === false);
            defaults[setting] = defaultValue;
            prefs[setting] = defaultValue;
            funcs[setting] = {
                dataType: dataType,
                label: label,
                tooltip: tooltip,
                range: range,
                precision: precision,
                reset: function () { },
                saveSetting: persist ? function () {
                    saveSetting(setting, dataType, prefs[setting]);
                } : noop,
                readSetting: function () {
                    let result = readSetting(setting, dataType);
                    if (result !== null) {
                        prefs[setting] = result;
                    }
                },
                saveParameter: persist ? function () {
                    ds.debug.settings.debugLn('Saving parameter', setting, '=', prefs[setting]);
                    Parameters.set(setting, prefs[setting]);
                } : noop,
                readParameter: function () {
                    if (Parameters.has(setting)) {
                        prefs[setting] = mappings[dataType](setting);
                        ds.debug.settings.debugLn('Read parameter', setting, '=', prefs[setting]);
                    }
                    else {
                        ds.debug.settings.debugLn('No parameter saved for', setting);
                    }
                }
            }
        }

        let newConfig = {
            defaults: defaults,
            prefs: prefs,
            funcs: funcs,
            closeOnExit: false
        };

        newConfig.init = function () {
            for (let setting in funcs) {
                if (funcs.hasOwnProperty(setting)) {
                    funcs[setting].readSetting();
                }
            }
        };

        newConfig.loadParameters = function () {
            for (let setting in funcs) {
                if (funcs.hasOwnProperty(setting)) {
                    funcs[setting].readParameter();
                }
            }
        };

        newConfig.saveParameters = function () {
            for (let setting in prefs) {
                if (prefs.hasOwnProperty(setting)) {
                    funcs[setting].saveParameter();
                }
            }
        };

        newConfig.saveSettings = function () {
            for (let setting in prefs) {
                if (prefs.hasOwnProperty(setting)) {
                    funcs[setting].saveSetting();
                }
            }
        };

        newConfig.reset = function () {
            for (let setting in defaults) {
                if (defaults.hasOwnProperty(setting)) {
                    prefs[setting] = defaults[setting];
                    funcs[setting].reset();
                }
            }
            newConfig.saveSettings();
        };

        return newConfig;
    };


})(deepSky);
