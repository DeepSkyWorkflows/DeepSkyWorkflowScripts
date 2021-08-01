/*

deepSkyCommon.js: Common routines
================================================================================

Common routines used across various scripts.
================================================================================
 *
 *
 * Copyright Jeremy Likness, 2021
 *
 * mailTo:deepskyworkflows@gmail.com
 */

#define VERSION "0.4"

#include <pjsr/DataType.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/NumericControl.jsh>

// concatenate parts into a string
function concatenateStr() {
   let str = '';
   for (var arg = 0; arg < arguments.length; ++arg) {
      str += arguments[arg];
   }
   return str;
}

function chainFn(target, oldFnName, newFn) {
   let oldFn = target[oldFnName];
   return function () {
      oldFn.apply(target, arguments);
      newFn.apply(target, arguments);
   };
}

// write lines with title prefix
function writeLines() {
   for (var arg = 0; arg < arguments.length; ++arg) {
      var val = arguments[arg];
      if (arg === 0) {
         console.writeln(concatenateStr('<b>', TITLE, '</b>: ', val));
      }
      else {
         console.writeln(val);
      }
   }
   console.flush();
}

function showDialog(title, msg) {
    let mbox = new MessageBox(msg, title, StdIcon_Error, StdButton_Ok);
    mbox.execute();
}

// get a unique name that doesn't conflict with existing
function getNewName(name, suffix)
{
   let viewName = name + suffix;
   let n = 1;
   while (!ImageWindow.windowById(viewName).isNull)
   {
      ++n;
      viewName = name + suffix + n;
   }
   return viewName;
}

function saveSetting(key, type, value) {
   Settings.write(key, type, value);
}

function saveSettingsOfType(settingsObj, type) {
   for (var propname in settingsObj) {
      if (settingsObj.hasOwnProperty(propname)) {
         saveSetting(propname, prefs[propname], value);
      }
   }
}

function readSetting(key, type) {
   var val = Settings.read(key, type);
   if (Settings.lastReadOK) {
      return val;
   }
   return null;
}

function readSettings(keys, type) {
   let result = [];
   for (var idx = 0; idx < keys.length; idx++) {
      result.push(readSetting(keys[idx], type));
   }
   return result;
}

function applySettings(settingsObj, keys, type) {
   var results = readSettings(keys, type);
   for (var idx = 0; idx < keys.length; idx++) {
      if (results[idx] !== null) {
         settingsObj[keys[idx]] = results[idx];
      }
   }
}

let align = function(ctrl, alignment) {
   var container = new HorizontalSizer;
   if (alignment !== align.ALIGN_LEFT) {
      container.addStretch();
   }
   container.add(ctrl);
   if (alignment !== align.ALIGN_RIGHT) {
      container.addStretch();
   }
   return container;
}

align.ALIGN_LEFT = 0;
align.ALIGN_CENTER = 1;
align.ALIGN_RIGHT = 2;

function createVerticalGroupBox() {
   let groupBox = new GroupBox(arguments[0]);

	with (groupBox) {
		sizer = new VerticalSizer;
      sizer.margin = 6;
      sizer.spacing = 4;
   }

   groupBox.title = arguments[1];

   for (var arg = 2; arg < arguments.length; ++arg) {
      var val = arguments[arg];
      if (val === null) {
         groupBox.sizer.addStretch();
      }
      else {
         groupBox.sizer.add(val);
      }
   }

   return groupBox;
}

function createGroupBox() {
   let groupBox = new GroupBox(arguments[0]);

	with (groupBox) {
		sizer = new HorizontalSizer;
      sizer.margin = 6;
      sizer.spacing = 4;
   }

   groupBox.title = arguments[1];

   for (var arg = 2; arg < arguments.length; ++arg) {
      var val = arguments[arg];
      if (val === null) {
         groupBox.sizer.addStretch();
      }
      else {
         groupBox.sizer.add(val);
      }
   }

   return groupBox;
}

function bindResetToNumericControl(ctrl, setting, config) {
   config.funcs[setting].reset = function () {
      ctrl.setValue(config.prefs[setting]);
      ctrl.update();
   }
}

function createBoundNumericControl(parent, setting, config, sliderRange) {

   let ctrl = new NumericControl(parent);
   let sliderRanges = sliderRange || { low: 1, high: 100 };

   with (ctrl) {
		label.text = config.funcs[setting].label;
      let range = config.funcs[setting].range;
		label.minWidth = 130;
      if (config.funcs[setting].tooltip) {
         toolTip = config.funcs[setting].tooltip;
      }
      setRange(range.low, range.high);
      setPrecision(config.funcs[setting].precision);
      slider.setRange(sliderRanges.low, sliderRanges.high);
		slider.scaledMinWidth = 60;
		edit.scaledMinWidth = 60;
      setValue(config.prefs[setting]);
      bindings = function() {
			this.setValue(config.prefs[setting]);
		}
		onValueUpdated = function (value) {
         if (value < range.low || value > range.high) {
            ctrl.setValue(config.prefs[setting]);
         }
         else {
			   config.prefs[setting] = value;
         }
		}
		slider.onMousePress = function() {
			parent.isSliding = true;
		}
		slider.onMouseRelease = function() {
			parent.isSliding = false;
		}
	}

   config.funcs[setting].reset = function () {
      ctrl.setValue(config.prefs[setting]);
      ctrl.update();
   };

   return ctrl;
}

function createBoundCheckbox(parent, setting, config, existingCheckbox) {
   let checkbox = existingCheckbox || new CheckBox(parent);
	with (checkbox) {
		toolTip = config.funcs[setting].tooltip;
		text = config.funcs[setting].label;
		enabled = true;
      checked = config.prefs[setting];
      bindings = function () {
		   this.checked = config.prefs[setting];
      };
      onCheck = function (value) {
         config.prefs[setting] = value;
		};
	}
   config.funcs[setting].reset = function () {
      checkbox.checked = config.prefs[setting];
      checkbox.update();
   }
   return checkbox;
}

function createProgressBar(blocks) {
   let progress = {
      pct: 0,
      blocks: blocks,
      bar: '[' + ' '.repeat(blocks)  + ']'
   };
   progress.refresh = function (pct) {
         progress.pct = pct;
         let completedBlocks = Math.floor(pct * progress.blocks);
         let remainingBlocks = progress.blocks - completedBlocks;
         progress.bar = '[' + '#'.repeat(completedBlocks) +
            ' '.repeat(remainingBlocks) + ']';
   };
   return progress;
}

function createProgressLabel(dlg) {
   var progress = new Label(dlg);
   progress.text = '0% Not started.';
   var progressArea = createGroupBox(dlg, 'Progress', progress);
   dlg.updateProgress = function (msg) {
      progress.text = msg;
   }
   return progressArea;
}

function createNewInstanceIcon(dlg, config) {
   let newInstanceButton = new ToolButton(dlg);
   with (newInstanceButton){
      icon = dlg.scaledResource( ":/process-interface/new-instance.png" );
      setScaledFixedSize( 20, 20 );
      toolTip = "New Instance";
      onMousePress = function(){
         this.hasFocus = true;
         this.pushed = false;
         with ( this.dialog ){
            config.saveParameters();
            newInstance();
         }
      };
   }
   return newInstanceButton;
}

function createPushButton(dlg, btnconfig) {
   let pushButton = new PushButton (dlg);
   pushButton.icon = dlg.scaledResource( btnconfig.icon );
   if (btnconfig.tooltip) {
      pushButton.toolTip = btnconfig.tooltip;
   }
   pushButton.text = btnconfig.text;
   pushButton.onMousePress = btnconfig.fn;
   return pushButton;
}

function createApplyIcon(dlg, config, fn) {
   let okButton = new ToolButton (dlg);
   okButton.icon = dlg.scaledResource( ":/process-interface/apply.png" );
   okButton.setScaledFixedSize ( 20, 20 );
   okButton.toolTip="<p>Apply current settings to target and close.</p>"
   okButton.onMousePress = function() {
         if (dlg.runProcess) {
            dlg.runProcess(fn);
         }
         else {
            fn();
         }
         if (config.closeOnExit) {
            dlg.ok();
         }
   };
   return okButton;
}

function createResetIcon(dlg, config) {
   let resetButton = new ToolButton(dlg);
   with (resetButton){
      icon = dlg.scaledResource( ":/process-interface/reset.png" );
      setScaledFixedSize( 20, 20 );
      toolTip = "Reset";
      onMousePress = function(){
         this.hasFocus = true;
         this.pushed = false;
         with ( this.dialog ) {
            config.reset();
         }
      };
   }
   return resetButton;
}

function createToolbar(dlg, config, toolbarSettings) {
   let settings = toolbarSettings || {};
   let buttonSizer = new HorizontalSizer(dlg);
   buttonSizer.spacing = 4;

   if (settings.newInstanceIcon === true) {
      buttonSizer.add(createNewInstanceIcon(dlg, config));
   }

   if (settings.applyIcon === true) {
      buttonSizer.add(createApplyIcon(dlg, config, settings.applyFn));
   }

   buttonSizer.addStretch();

   if (settings.resetIcon === true) {
      buttonSizer.add(createResetIcon(dlg, config));
   }

   return buttonSizer;
}

function prepareDialog(dlg) {
   dlg.runProcess = function (fn) {
      let ctrls = [];
      for (var prop in dlg) {
         if (dlg.hasOwnProperty(prop)) {
            var ctrl = dlg[prop];
            if (ctrl.enabled && ctrl.enabled === true) {
               ctrls.push({ ctrl: ctrl, enabled: ctrl.enabled});
               ctrl.enabled = false;
               ctrl.update();
            }
         }
      }
      fn();
      for (var idx = 0; idx < ctrls.length; idx++) {
         let ctrlData = ctrls[idx];
         ctrlData.ctrl.enabled = ctrlData.enabled;
         ctrlData.ctrl.update();
      }
   }
}

function noop () {}

// pass in an array
// each element should be:
// name, data type, default value, label, tooltip, range
function createSettingsManager(config) {

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

   for (var idx = 0; idx < config.length; idx++) {
        let configValue = config[idx];
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
              Settings.write(setting, dataType, prefs[setting]);
           } : noop,
           readSetting: function () {
              let result = Settings.read(setting, dataType);
              if (Settings.lastReadOK) {
                 prefs[setting] = result;
              }
           },
           saveParameter: persist ? function () {
              Parameters.set(setting, prefs[setting]);
           } : noop,
           readParameter: function () {
              if (Parameters.has(setting)) {
                 prefs[setting] = mappings[dataType](setting);
              }
           }
        }
   }

   let newConfig = {
      defaults: defaults,
      prefs: prefs,
      funcs: funcs,
      closeOnExit: true
   };

   newConfig.init = function () {
         for (var setting in funcs) {
            if (funcs.hasOwnProperty(setting)) {
               funcs[setting].readSetting();
            }
         }
      };

   newConfig.loadParameters = function () {
         for (var setting in funcs) {
            if (funcs.hasOwnProperty(setting)) {
               funcs[setting].readParameter();
            }
         }
      };

   newConfig.saveParameters = function () {
         for (var setting in prefs) {
            if (prefs.hasOwnProperty(setting)) {
               funcs[setting].saveParameter();
            }
         }
      };

   newConfig.saveSettings = function () {
         for (var setting in prefs) {
            if (prefs.hasOwnProperty(setting)) {
               funcs[setting].saveSetting();
            }
         }
      };

   newConfig.reset = function () {
         for (var setting in defaults) {
            if (defaults.hasOwnProperty(setting)) {
               prefs[setting] = defaults[setting];
               funcs[setting].reset();
            }
         }
         newConfig.saveSettings();
      };

   return newConfig;
}

function extractLuminance(executionState, suffix) {

   let sourceViewId = executionState.view.id;

   if (suffix === undefined) {
      suffix = '_L';
   }

   executionState.channels = [
      [true, getNewName(sourceViewId, suffix)],
      [false, ''],
      [false, '']
   ];

   // separate the RGB components
   let ce = new ChannelExtraction;
   ce.colorSpace = ChannelExtraction.prototype.CIELab;
   ce.channels = executionState.channels;
   ce.sampleFormat = ChannelExtraction.prototype.SameAsSource;
   ce.executeOn(executionState.view);
}

function applySTF(view) {

   var transformation = [
		[0, 1, 0.5, 0, 1],
		[0, 1, 0.5, 0, 1],
		[0, 1, 0.5, 0, 1],
		[0, 1, 0.5, 0, 1]];

   var median = view.computeOrFetchProperty("Median");
   var mad = view.computeOrFetchProperty("MAD");

   //set variables
   let targetBackground = 0.25;
   let shadowsClipping = -2.8;

   // calculate STF settings based on DeLinear Script
   var clipping = (1 + mad.at(0) != 1) ?
      Math.range(median.at(0) + shadowsClipping * mad.at(0), 0.0, 1.0) : 0.0;
   var targetMedian = Math.mtf(targetBackground, median.at(0) - clipping);

   transformation[0] = [clipping, 1, targetMedian, 0, 1];
   if(!view.image.isGrayscale) {
      transformation[1] = [clipping, 1, targetMedian, 0, 1];
      transformation[2] = [clipping, 1, targetMedian, 0, 1];
   }

   var STFunction = new ScreenTransferFunction();
   STFunction.STF = transformation;
	STFunction.executeOn(view);
	return transformation;
}

function imageSnapshot(img) {
   return {
      mean: img.mean(),
      median: img.median(),
      min: img.minimum(),
      max: img.maximum()
   };
}

function getImageSnapshotStr(snapshot) {
   return concatenateStr('Mean: ', snapshot.mean, ' Median: ', snapshot.median,
       ' Min: ', snapshot.min, ' Max: ', snapshot.max);
}

function applyHistogramTransformation(view) {
	var HT = new HistogramTransformation;

	if (view.image.isGrayscale) {

      //get values from STF
		var clipping = view.stf[0][1];
		var median = view.stf[0][0];
		HT.H = [[0, 0.5, 1.0, 0, 1.0],
		[0, 0.5, 1.0, 0, 1.0],
		[0, 0.5, 1.0, 0, 1.0],
		[clipping, median, 1.0, 0, 1.0],
		[0, 0.5, 1.0, 0, 1.0]];
	} else {
		HT.H = [[view.stf[0][1], view.stf[0][0], 1.0, 0, 1.0],
		[view.stf[1][1], view.stf[1][0], 1.0, 0, 1.0],
		[view.stf[2][1], view.stf[2][0], 1.0, 0, 1.0],
		[0, 0.5, 1.0, 0, 1.0],
		[0, 0.5, 1.0, 0, 1.0]];
	}

	view.beginProcess();
	HT.executeOn(view.image);
	view.endProcess();
}

function pixMathClone(view, suffix) {
   var P = new PixelMath;
   P.expression = "$T";
   P.expression1 = "";
   P.expression2 = "";
   P.expression3 = "";
   P.useSingleExpression = true;
   P.symbols = "";
   P.clearImageCacheAndExit = false;
   P.cacheGeneratedImages = false;
   P.generateOutput = true;
   P.singleThreaded = false;
   P.optimization = true;
   P.use64BitWorkingImage = false;
   P.rescale = false;
   P.rescaleLower = 0;
   P.rescaleUpper = 1;
   P.truncate = true;
   P.truncateLower = 0;
   P.truncateUpper = 1;
   P.createNewImage = true;
   P.showNewImage = true;
   P.newImageId = getNewName(view.id, suffix || '_clone');
   P.newImageWidth = 0;
   P.newImageHeight = 0;
   P.newImageAlpha = false;
   P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
   P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
   P.executeOn(view);
   return P.newImageId;
}

